import { patchWebMDuration, findMaxClusterTimestamp } from '@/lib/audio/ebml-patcher';

export interface RecordingMetadata {
  interviewId: string;
  status: 'recording' | 'finalized' | 'repaired';
  durationMs?: number;
  byteLength?: number;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptSegment {
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
}

export interface InterviewTranscriptData {
  interviewId: string;
  segments: TranscriptSegment[];
  text: string;
  createdAt: string;
  model?: string;
}

const INTERVIEWS_DIR_NAME = 'interviews';
const RECORDING_FILE_NAME = 'recording.webm';
const METADATA_FILE_NAME = 'metadata.json';
const TRANSCRIPT_FILE_NAME = 'transcript.json';

/**
 * Checks whether OPFS is supported in the current environment.
 */
export function isOPFSSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.storage !== 'undefined' &&
    typeof navigator.storage.getDirectory === 'function'
  );
}

/**
 * Gets or creates the root 'interviews' directory in OPFS.
 */
export async function getInterviewsDir(): Promise<FileSystemDirectoryHandle> {
  if (!isOPFSSupported()) {
    throw new Error('OPFS is not supported in this browser environment');
  }
  const root = await navigator.storage.getDirectory();
  return await root.getDirectoryHandle(INTERVIEWS_DIR_NAME, { create: true });
}

/**
 * Gets or creates an interview-specific directory: /interviews/[interviewId]
 */
export async function getInterviewDir(
  interviewId: string,
  create = true
): Promise<FileSystemDirectoryHandle> {
  const parent = await getInterviewsDir();
  return await parent.getDirectoryHandle(interviewId, { create });
}

/**
 * Reads metadata.json for an interview, or null if it doesn't exist.
 */
export async function getRecordingMetadata(
  interviewId: string
): Promise<RecordingMetadata | null> {
  try {
    const dir = await getInterviewDir(interviewId, false);
    const fileHandle = await dir.getFileHandle(METADATA_FILE_NAME, { create: false });
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text) as RecordingMetadata;
  } catch {
    return null;
  }
}

/**
 * Writes or updates metadata.json for an interview.
 */
export async function saveRecordingMetadata(
  interviewId: string,
  metadata: RecordingMetadata
): Promise<void> {
  const dir = await getInterviewDir(interviewId, true);
  const fileHandle = await dir.getFileHandle(METADATA_FILE_NAME, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(metadata, null, 2));
  await writable.close();
}

/**
 * Sequentially appends a recording chunk into OPFS /interviews/[interviewId]/recording.webm.
 * Updates metadata chunk count and status.
 */
export async function appendRecordingChunk(
  interviewId: string,
  chunk: Blob | Uint8Array | ArrayBuffer
): Promise<void> {
  const dir = await getInterviewDir(interviewId, true);
  const fileHandle = await dir.getFileHandle(RECORDING_FILE_NAME, { create: true });

  const existingFile = await fileHandle.getFile();
  const prevSize = existingFile.size;

  const writable = await fileHandle.createWritable({ keepExistingData: true });
  if (typeof (writable as any).seek === 'function' && prevSize > 0) {
    await (writable as any).seek(prevSize);
  }
  await writable.write(chunk as any);
  await writable.close();

  const updatedFile = await fileHandle.getFile();
  const existingMeta = await getRecordingMetadata(interviewId);
  const now = new Date().toISOString();

  const metadata: RecordingMetadata = {
    interviewId,
    status: 'recording',
    durationMs: existingMeta?.durationMs,
    byteLength: updatedFile.size,
    chunkCount: (existingMeta?.chunkCount ?? 0) + 1,
    createdAt: existingMeta?.createdAt ?? now,
    updatedAt: now,
  };

  await saveRecordingMetadata(interviewId, metadata);
}

/**
 * Finalizes an interview recording by patching the WebM EBML container with exact duration.
 */
export async function finalizeRecording(
  interviewId: string,
  explicitDurationMs?: number
): Promise<{ success: boolean; durationMs: number; byteLength: number }> {
  const dir = await getInterviewDir(interviewId, false);
  const fileHandle = await dir.getFileHandle(RECORDING_FILE_NAME, { create: false });
  const file = await fileHandle.getFile();
  const buffer = new Uint8Array(await file.arrayBuffer());

  const durationMs =
    explicitDurationMs !== undefined && explicitDurationMs > 0
      ? explicitDurationMs
      : findMaxClusterTimestamp(buffer).maxTimestampMs;

  const patched = patchWebMDuration(buffer, durationMs);

  const writable = await fileHandle.createWritable();
  await writable.write(patched as any);
  await writable.close();

  const updatedFile = await fileHandle.getFile();
  const existingMeta = await getRecordingMetadata(interviewId);
  const now = new Date().toISOString();

  const metadata: RecordingMetadata = {
    interviewId,
    status: 'finalized',
    durationMs,
    byteLength: updatedFile.size,
    chunkCount: existingMeta?.chunkCount ?? 1,
    createdAt: existingMeta?.createdAt ?? now,
    updatedAt: now,
  };

  await saveRecordingMetadata(interviewId, metadata);

  return {
    success: true,
    durationMs,
    byteLength: updatedFile.size,
  };
}

/**
 * Auto-recovers an interrupted or crashed recording by parsing cluster timestamps and patching WebM headers.
 */
export async function autoRecoverRecording(
  interviewId: string
): Promise<{ repaired: boolean; durationMs: number; byteLength: number }> {
  const meta = await getRecordingMetadata(interviewId);
  if (!meta) {
    return { repaired: false, durationMs: 0, byteLength: 0 };
  }

  // Only repair unfinalized recordings
  if (meta.status === 'finalized' && meta.durationMs && meta.durationMs > 0) {
    return { repaired: false, durationMs: meta.durationMs, byteLength: meta.byteLength ?? 0 };
  }

  const dir = await getInterviewDir(interviewId, false);
  const fileHandle = await dir.getFileHandle(RECORDING_FILE_NAME, { create: false });
  const file = await fileHandle.getFile();
  const buffer = new Uint8Array(await file.arrayBuffer());

  const { maxTimestampMs } = findMaxClusterTimestamp(buffer);
  const durationMs = maxTimestampMs > 0 ? maxTimestampMs : (meta.durationMs ?? 0);

  const patched = patchWebMDuration(buffer, durationMs);

  const writable = await fileHandle.createWritable();
  await writable.write(patched as any);
  await writable.close();

  const updatedFile = await fileHandle.getFile();
  const now = new Date().toISOString();

  const updatedMeta: RecordingMetadata = {
    ...meta,
    status: 'repaired',
    durationMs,
    byteLength: updatedFile.size,
    updatedAt: now,
  };

  await saveRecordingMetadata(interviewId, updatedMeta);

  return {
    repaired: true,
    durationMs,
    byteLength: updatedFile.size,
  };
}

/**
 * Scans all directories in OPFS and auto-recovers any recordings left in unfinalized state.
 */
export async function recoverAllUnfinalizedRecordings(): Promise<
  Array<{ interviewId: string; durationMs: number }>
> {
  const results: Array<{ interviewId: string; durationMs: number }> = [];
  if (!isOPFSSupported()) return results;

  try {
    const parent = await getInterviewsDir();
    const entries = (parent as any).values
      ? (parent as any).values()
      : (parent as any).entries
      ? (parent as any).entries()
      : [];

    for await (const entry of entries) {
      const handle = Array.isArray(entry) ? entry[1] : entry;
      if (handle && handle.kind === 'directory') {
        const interviewId = handle.name;
        const meta = await getRecordingMetadata(interviewId);
        if (meta && meta.status === 'recording') {
          const res = await autoRecoverRecording(interviewId);
          if (res.repaired) {
            results.push({ interviewId, durationMs: res.durationMs });
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to run recoverAllUnfinalizedRecordings:', err);
  }

  return results;
}

/**
 * Retrieves the recording as a standard File object, or null if it does not exist.
 */
export async function getRecordingFile(interviewId: string): Promise<File | null> {
  try {
    const dir = await getInterviewDir(interviewId, false);
    const fileHandle = await dir.getFileHandle(RECORDING_FILE_NAME, { create: false });
    return await fileHandle.getFile();
  } catch {
    return null;
  }
}

/**
 * Lists all recorded interviews stored in OPFS.
 */
export async function listRecordings(): Promise<RecordingMetadata[]> {
  const list: RecordingMetadata[] = [];
  if (!isOPFSSupported()) return list;

  try {
    const parent = await getInterviewsDir();
    const entries = (parent as any).values
      ? (parent as any).values()
      : (parent as any).entries
      ? (parent as any).entries()
      : [];

    for await (const entry of entries) {
      const handle = Array.isArray(entry) ? entry[1] : entry;
      if (handle && handle.kind === 'directory') {
        const meta = await getRecordingMetadata(handle.name);
        if (meta) {
          list.push(meta);
        }
      }
    }
  } catch (err) {
    console.error('Failed to list recordings:', err);
  }

  return list;
}

/**
 * Deletes an interview's recordings, transcripts, and metadata directory.
 */
export async function deleteRecording(interviewId: string): Promise<boolean> {
  try {
    const parent = await getInterviewsDir();
    await parent.removeEntry(interviewId, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Saves a transcript JSON object in OPFS at /interviews/[interviewId]/transcript.json.
 */
export async function saveTranscript(
  interviewId: string,
  transcript: InterviewTranscriptData
): Promise<void> {
  const dir = await getInterviewDir(interviewId, true);
  const fileHandle = await dir.getFileHandle(TRANSCRIPT_FILE_NAME, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(transcript, null, 2));
  await writable.close();
}

/**
 * Retrieves a saved transcript from OPFS, or null if not yet transcribed.
 */
export async function getTranscript(
  interviewId: string
): Promise<InterviewTranscriptData | null> {
  try {
    const dir = await getInterviewDir(interviewId, false);
    const fileHandle = await dir.getFileHandle(TRANSCRIPT_FILE_NAME, { create: false });
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text) as InterviewTranscriptData;
  } catch {
    return null;
  }
}
