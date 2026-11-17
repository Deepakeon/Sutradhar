/**
 * Origin Private File System (OPFS) Storage Engine for Interview Recordings.
 *
 * Persists raw media chunks incrementally to client-side isolated OPFS storage
 * under /interviews/[interviewId]/recording.webm without buffering entire sessions in RAM.
 * Upon recording completion or crash recovery, delegates to EBML container patching
 * to guarantee seekable, durable playback in standard HTML5 video elements.
 */

import {
  patchWebMWithDurationAndCues,
  inspectWebM,
} from './ebml-patcher';

export type RecordingStatus = 'recording' | 'finalized' | 'repaired';

export interface RecordingMetadata {
  interviewId: string;
  status: RecordingStatus;
  createdAt: number;
  updatedAt: number;
  durationMs: number;
  fileSizeBytes: number;
  chunkCount: number;
  isSeekable: boolean;
  mimeType: string;
}

export class RecordingSession {
  private writable: FileSystemWritableFileStream | null = null;
  private closed = false;
  private chunkCount = 0;
  private fileSizeBytes = 0;

  constructor(
    public readonly interviewId: string,
    private readonly storage: OpfsRecordingStorage,
    writable: FileSystemWritableFileStream
  ) {
    this.writable = writable;
  }

  /**
   * Appends a recording chunk to OPFS continuously without buffering in memory.
   */
  async appendChunk(chunk: Blob | ArrayBuffer | Uint8Array): Promise<void> {
    if (this.closed || !this.writable) {
      throw new Error(`Recording session for ${this.interviewId} is already closed`);
    }

    let payload: Uint8Array;
    if (chunk instanceof Blob) {
      payload = new Uint8Array(await chunk.arrayBuffer());
    } else if (chunk instanceof ArrayBuffer) {
      payload = new Uint8Array(chunk);
    } else {
      payload = chunk;
    }

    await this.writable.write(payload as unknown as FileSystemWriteChunkType);
    this.chunkCount += 1;
    this.fileSizeBytes += payload.length;
    await this.storage.updateSessionMetadata(this.interviewId, this.chunkCount, this.fileSizeBytes);
  }

  /**
   * Finalizes the recording session by patching EBML metadata, duration, and seek cues.
   */
  async finalize(knownDurationMs?: number): Promise<RecordingMetadata> {
    await this.close();
    return await this.storage.finalizeRecording(this.interviewId, knownDurationMs);
  }

  /**
   * Closes the active writable stream without patching.
   */
  async close(): Promise<void> {
    if (!this.closed && this.writable) {
      try {
        await this.writable.close();
      } catch {
        // Stream may already be closed
      }
      this.writable = null;
      this.closed = true;
      // Ensure latest chunk count and size are flushed to metadata
      await this.storage.updateSessionMetadata(this.interviewId, this.chunkCount, this.fileSizeBytes);
    }
  }
}

export class OpfsRecordingStorage {
  private customRoot: FileSystemDirectoryHandle | null = null;

  constructor(customRootHandle?: FileSystemDirectoryHandle) {
    if (customRootHandle) {
      this.customRoot = customRootHandle;
    }
  }

  /**
   * Checks whether the current browser environment supports the Origin Private File System.
   */
  isSupported(): boolean {
    if (this.customRoot) return true;
    return (
      typeof navigator !== 'undefined' &&
      'storage' in navigator &&
      typeof navigator.storage.getDirectory === 'function'
    );
  }

  /**
   * Resolves the root OPFS directory handle.
   */
  async getRootDirectory(): Promise<FileSystemDirectoryHandle> {
    if (this.customRoot) return this.customRoot;
    if (!this.isSupported()) {
      throw new Error('Origin Private File System (OPFS) is not supported in this environment');
    }
    return await navigator.storage.getDirectory();
  }

  /**
   * Resolves the /interviews/[interviewId] directory handle in OPFS.
   */
  async getInterviewDirectory(
    interviewId: string,
    create = false
  ): Promise<FileSystemDirectoryHandle> {
    const root = await this.getRootDirectory();
    const interviewsDir = await root.getDirectoryHandle('interviews', { create });
    return await interviewsDir.getDirectoryHandle(interviewId, { create });
  }

  /**
   * Starts a new recording session, preparing the isolated directory and opening a writable stream.
   */
  async startRecording(interviewId: string): Promise<RecordingSession> {
    const dir = await this.getInterviewDirectory(interviewId, true);
    const fileHandle = await dir.getFileHandle('recording.webm', { create: true });
    const writable = await fileHandle.createWritable({ keepExistingData: false });

    const now = Date.now();
    const initialMeta: RecordingMetadata = {
      interviewId,
      status: 'recording',
      createdAt: now,
      updatedAt: now,
      durationMs: 0,
      fileSizeBytes: 0,
      chunkCount: 0,
      isSeekable: false,
      mimeType: 'video/webm',
    };
    await this.saveMetadata(dir, initialMeta);

    return new RecordingSession(interviewId, this, writable);
  }

  /**
   * Finalizes an interview recording by patching the container with exact duration and seek cues.
   */
  async finalizeRecording(
    interviewId: string,
    knownDurationMs?: number
  ): Promise<RecordingMetadata> {
    return await this.patchAndPersist(interviewId, 'finalized', knownDurationMs);
  }

  /**
   * Checks whether a recording was interrupted mid-stream or crashed before finalization.
   */
  async isRecordingInterrupted(interviewId: string): Promise<boolean> {
    const hasRec = await this.hasRecording(interviewId);
    if (!hasRec) return false;

    const meta = await this.getRecordingMetadata(interviewId);
    if (meta && meta.status === 'recording') return true;

    const file = await this.getRecordingFile(interviewId);
    if (!file) return false;

    const rawBuffer = new Uint8Array(await file.arrayBuffer());
    const inspection = inspectWebM(rawBuffer);
    return !inspection.isSeekable;
  }

  /**
   * Inspects an unfinalized or interrupted recording, recovers captured minutes, and injects seek cues.
   */
  async recoverRecording(interviewId: string): Promise<RecordingMetadata | null> {
    const isInterrupted = await this.isRecordingInterrupted(interviewId);
    if (!isInterrupted) {
      return await this.getRecordingMetadata(interviewId);
    }
    return await this.patchAndPersist(interviewId, 'repaired');
  }

  /**
   * Shared helper to patch WebM headers and persist updated status and metadata.
   */
  private async patchAndPersist(
    interviewId: string,
    targetStatus: RecordingStatus,
    knownDurationMs?: number
  ): Promise<RecordingMetadata> {
    const dir = await this.getInterviewDirectory(interviewId, false);
    const fileHandle = await dir.getFileHandle('recording.webm');
    const file = await fileHandle.getFile();
    const rawBuffer = new Uint8Array(await file.arrayBuffer());

    // Patch WebM container with duration, seekhead, and cues
    const patchedBuffer = patchWebMWithDurationAndCues(rawBuffer, knownDurationMs);
    const inspection = inspectWebM(patchedBuffer);

    // Overwrite the file in OPFS with seekable metadata
    const writable = await fileHandle.createWritable({ keepExistingData: false });
    await writable.write(patchedBuffer as unknown as FileSystemWriteChunkType);
    await writable.close();

    const existingMeta = await this.getRecordingMetadata(interviewId);
    const updatedMeta: RecordingMetadata = {
      interviewId,
      status: targetStatus,
      createdAt: existingMeta?.createdAt || Date.now(),
      updatedAt: Date.now(),
      durationMs: inspection.durationMs || knownDurationMs || 0,
      fileSizeBytes: patchedBuffer.length,
      chunkCount: existingMeta?.chunkCount || 1,
      isSeekable: inspection.isSeekable,
      mimeType: 'video/webm',
    };

    await this.saveMetadata(dir, updatedMeta);
    return updatedMeta;
  }

  /**
   * Retrieves the interview recording as a standard Web File object for video playback or export.
   */
  async getRecordingFile(interviewId: string): Promise<File | null> {
    try {
      const dir = await this.getInterviewDirectory(interviewId, false);
      const fileHandle = await dir.getFileHandle('recording.webm');
      return await fileHandle.getFile();
    } catch {
      return null;
    }
  }

  /**
   * Retrieves the interview recording as a Blob object for export or download.
   */
  async getRecordingBlob(interviewId: string): Promise<Blob | null> {
    const file = await this.getRecordingFile(interviewId);
    if (!file) return null;
    return file.slice(0, file.size, file.type || 'video/webm');
  }

  /**
   * Retrieves persisting metadata for a given interview recording.
   */
  async getRecordingMetadata(interviewId: string): Promise<RecordingMetadata | null> {
    try {
      const dir = await this.getInterviewDirectory(interviewId, false);
      const metaHandle = await dir.getFileHandle('meta.json');
      const file = await metaHandle.getFile();
      const text =
        typeof file.text === 'function'
          ? await file.text()
          : new TextDecoder().decode(new Uint8Array(await file.arrayBuffer()));
      return JSON.parse(text) as RecordingMetadata;
    } catch {
      return null;
    }
  }

  /**
   * Checks whether an interview recording exists in OPFS with data > 0 bytes.
   */
  async hasRecording(interviewId: string): Promise<boolean> {
    try {
      const file = await this.getRecordingFile(interviewId);
      return file !== null && file.size > 0;
    } catch {
      return false;
    }
  }

  /**
   * Lists all stored interview recordings in OPFS.
   */
  async listRecordings(): Promise<RecordingMetadata[]> {
    const results: RecordingMetadata[] = [];
    try {
      const root = await this.getRootDirectory();
      const interviewsDir = await root.getDirectoryHandle('interviews', { create: false });

      // Async iteration across subdirectories
      const entriesIterator = (
        interviewsDir as unknown as {
          entries(): AsyncIterable<[string, FileSystemHandle]>;
        }
      ).entries();
      for await (const [id, handle] of entriesIterator) {
        if (handle.kind === 'directory') {
          const meta = await this.getRecordingMetadata(id);
          if (meta) {
            results.push(meta);
          }
        }
      }
    } catch {
      // Interviews directory does not exist yet
    }
    return results;
  }

  /**
   * Deletes an interview recording directory and all stored files from OPFS.
   */
  async deleteRecording(interviewId: string): Promise<boolean> {
    try {
      const root = await this.getRootDirectory();
      const interviewsDir = await root.getDirectoryHandle('interviews', { create: false });
      await interviewsDir.removeEntry(interviewId, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Internal helper to update metadata with new chunk size and count.
   */
  async updateSessionMetadata(
    interviewId: string,
    chunkCount: number,
    fileSizeBytes: number
  ): Promise<void> {
    try {
      const dir = await this.getInterviewDirectory(interviewId, false);
      const meta = await this.getRecordingMetadata(interviewId);
      if (meta) {
        meta.chunkCount = chunkCount;
        meta.fileSizeBytes = fileSizeBytes;
        meta.updatedAt = Date.now();
        await this.saveMetadata(dir, meta);
      }
    } catch {
      // Non-blocking metadata increment failure
    }
  }

  private async saveMetadata(
    dir: FileSystemDirectoryHandle,
    meta: RecordingMetadata
  ): Promise<void> {
    const handle = await dir.getFileHandle('meta.json', { create: true });
    const writable = await handle.createWritable({ keepExistingData: false });
    const jsonStr = JSON.stringify(meta, null, 2);
    await writable.write(
      new TextEncoder().encode(jsonStr) as unknown as FileSystemWriteChunkType
    );
    await writable.close();
  }
}
