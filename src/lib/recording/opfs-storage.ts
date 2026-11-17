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
    await this.storage.incrementChunkMetadata(this.interviewId, payload.length);
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
      status: 'finalized',
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
   * Inspects an unfinalized or interrupted recording, recovers captured minutes, and injects seek cues.
   */
  async recoverRecording(interviewId: string): Promise<RecordingMetadata | null> {
    const hasRec = await this.hasRecording(interviewId);
    if (!hasRec) return null;

    const dir = await this.getInterviewDirectory(interviewId, false);
    const meta = await this.getRecordingMetadata(interviewId);
    const fileHandle = await dir.getFileHandle('recording.webm');
    const file = await fileHandle.getFile();
    const rawBytes = new Uint8Array(await file.arrayBuffer());
    const inspection = inspectWebM(rawBytes);

    // If recording is already cleanly finalized and seekable, no repair needed
    if (meta?.status === 'finalized' && inspection.isSeekable) {
      return meta;
    }

    // Repair partial / unfinalized recording
    const repairedBytes = patchWebMWithDurationAndCues(rawBytes);
    const repairedInspection = inspectWebM(repairedBytes);

    const writable = await fileHandle.createWritable({ keepExistingData: false });
    await writable.write(repairedBytes as unknown as FileSystemWriteChunkType);
    await writable.close();

    const repairedMeta: RecordingMetadata = {
      interviewId,
      status: 'repaired',
      createdAt: meta?.createdAt || Date.now(),
      updatedAt: Date.now(),
      durationMs: repairedInspection.durationMs,
      fileSizeBytes: repairedBytes.length,
      chunkCount: meta?.chunkCount || 1,
      isSeekable: repairedInspection.isSeekable,
      mimeType: 'video/webm',
    };

    await this.saveMetadata(dir, repairedMeta);
    return repairedMeta;
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
      const entriesIterator = (interviewsDir as unknown as { entries(): AsyncIterable<[string, FileSystemHandle]> }).entries();
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
  async incrementChunkMetadata(interviewId: string, chunkSize: number): Promise<void> {
    try {
      const dir = await this.getInterviewDirectory(interviewId, false);
      const meta = await this.getRecordingMetadata(interviewId);
      if (meta) {
        meta.chunkCount += 1;
        meta.fileSizeBytes += chunkSize;
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
    await writable.write(new TextEncoder().encode(jsonStr) as unknown as FileSystemWriteChunkType);
    await writable.close();
  }
}

/**
 * --------------------------------------------------------------------------
 * In-Memory OPFS Mock for Testing & Non-Browser Environments
 * --------------------------------------------------------------------------
 */
export function createMockOpfsRoot(): FileSystemDirectoryHandle {
  return new MockDirectoryHandle('') as unknown as FileSystemDirectoryHandle;
}

class MockWritableStream implements FileSystemWritableFileStream {
  readonly locked = false;
  private position = 0;
  private closed = false;

  constructor(private readonly fileHandle: MockFileHandle) {}

  async write(data: FileSystemWriteChunkType | BufferSource | Blob | string): Promise<void> {
    if (this.closed) throw new Error('WritableStream is closed');
    let bytes: Uint8Array;
    if (ArrayBuffer.isView(data)) {
      bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    } else if (data instanceof ArrayBuffer || (data && typeof (data as unknown as ArrayBuffer).byteLength === 'number' && typeof (data as unknown as ArrayBuffer).slice === 'function')) {
      bytes = new Uint8Array(data as unknown as ArrayBuffer);
    } else if (data && typeof (data as unknown as Blob).arrayBuffer === 'function') {
      bytes = new Uint8Array(await (data as unknown as Blob).arrayBuffer());
    } else {
      bytes = new Uint8Array(0);
    }

    const newLen = Math.max(this.fileHandle.buffer.length, this.position + bytes.length);
    const newBuf = new Uint8Array(newLen);
    newBuf.set(this.fileHandle.buffer, 0);
    newBuf.set(bytes, this.position);
    this.fileHandle.buffer = newBuf;
    this.position += bytes.length;
  }

  async seek(position: number): Promise<void> {
    this.position = position;
  }

  async truncate(size: number): Promise<void> {
    this.fileHandle.buffer = this.fileHandle.buffer.subarray(0, size);
    if (this.position > size) this.position = size;
  }

  async close(): Promise<void> {
    this.closed = true;
  }

  abort(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }

  getWriter(): WritableStreamDefaultWriter<FileSystemWriteChunkType> {
    throw new Error('Not implemented');
  }
}

class MockFileHandle implements FileSystemFileHandle {
  readonly kind = 'file' as const;
  public buffer = new Uint8Array(0);

  constructor(public readonly name: string) {}

  async getFile(): Promise<File> {
    const mime = this.name.endsWith('.webm') ? 'video/webm' : 'application/json';
    return new File([this.buffer.slice()], this.name, { type: mime });
  }

  async createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream> {
    if (!options?.keepExistingData) {
      this.buffer = new Uint8Array(0);
    }
    return new MockWritableStream(this);
  }

  isSameEntry(other: FileSystemHandle): Promise<boolean> {
    return Promise.resolve(other === this);
  }

  queryPermission(): Promise<PermissionState> {
    return Promise.resolve('granted');
  }

  requestPermission(): Promise<PermissionState> {
    return Promise.resolve('granted');
  }
}

class MockDirectoryHandle implements FileSystemDirectoryHandle {
  readonly kind = 'directory' as const;
  private entriesMap = new Map<string, MockDirectoryHandle | MockFileHandle>();

  constructor(public readonly name: string) {}

  async getDirectoryHandle(
    name: string,
    options?: FileSystemGetDirectoryOptions
  ): Promise<FileSystemDirectoryHandle> {
    const existing = this.entriesMap.get(name);
    if (existing) {
      if (existing.kind !== 'directory') {
        throw new Error(`Entry ${name} is a file, not a directory`);
      }
      return existing as unknown as FileSystemDirectoryHandle;
    }
    if (options?.create) {
      const created = new MockDirectoryHandle(name);
      this.entriesMap.set(name, created);
      return created as unknown as FileSystemDirectoryHandle;
    }
    throw new Error(`Directory ${name} not found`);
  }

  async getFileHandle(
    name: string,
    options?: FileSystemGetFileOptions
  ): Promise<FileSystemFileHandle> {
    const existing = this.entriesMap.get(name);
    if (existing) {
      if (existing.kind !== 'file') {
        throw new Error(`Entry ${name} is a directory, not a file`);
      }
      return existing as unknown as FileSystemFileHandle;
    }
    if (options?.create) {
      const created = new MockFileHandle(name);
      this.entriesMap.set(name, created);
      return created as unknown as FileSystemFileHandle;
    }
    throw new Error(`File ${name} not found`);
  }

  async removeEntry(name: string): Promise<void> {
    if (!this.entriesMap.has(name)) {
      throw new Error(`Entry ${name} not found`);
    }
    this.entriesMap.delete(name);
  }

  async *entries(): AsyncIterableIterator<[string, FileSystemHandle]> {
    for (const [key, value] of this.entriesMap.entries()) {
      yield [key, value as unknown as FileSystemHandle];
    }
  }

  async *keys(): AsyncIterableIterator<string> {
    for (const key of this.entriesMap.keys()) {
      yield key;
    }
  }

  async *values(): AsyncIterableIterator<FileSystemHandle> {
    for (const val of this.entriesMap.values()) {
      yield val as unknown as FileSystemHandle;
    }
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<[string, FileSystemHandle]> {
    return this.entries();
  }

  isSameEntry(other: FileSystemHandle): Promise<boolean> {
    return Promise.resolve(other === this);
  }

  queryPermission(): Promise<PermissionState> {
    return Promise.resolve('granted');
  }

  requestPermission(): Promise<PermissionState> {
    return Promise.resolve('granted');
  }

  resolve(): Promise<string[] | null> {
    return Promise.resolve(null);
  }
}
