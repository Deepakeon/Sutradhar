import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isOPFSSupported,
  appendRecordingChunk,
  finalizeRecording,
  autoRecoverRecording,
  recoverAllUnfinalizedRecordings,
  getRecordingFile,
  getRecordingMetadata,
  listRecordings,
  deleteRecording,
  saveTranscript,
  getTranscript,
} from '../recording-storage';

// In-memory mock for OPFS
class MockWritableStream {
  private buffer: Uint8Array = new Uint8Array(0);
  private fileHandle: MockFileHandle;

  constructor(fileHandle: MockFileHandle, keepExistingData = false) {
    this.fileHandle = fileHandle;
    if (keepExistingData && fileHandle._content) {
      this.buffer = new Uint8Array(fileHandle._content);
    }
  }

  async write(data: any): Promise<void> {
    let bytes: Uint8Array;
    if (data instanceof Blob) {
      const ab = await data.arrayBuffer();
      bytes = new Uint8Array(ab);
    } else if (data instanceof Uint8Array) {
      bytes = data;
    } else if (data instanceof ArrayBuffer) {
      bytes = new Uint8Array(data);
    } else if (typeof data === 'string') {
      bytes = new TextEncoder().encode(data);
    } else {
      bytes = new Uint8Array(0);
    }

    const next = new Uint8Array(this.buffer.length + bytes.length);
    next.set(this.buffer, 0);
    next.set(bytes, this.buffer.length);
    this.buffer = next;
  }

  async close(): Promise<void> {
    this.fileHandle._content = this.buffer;
  }
}

class MockFileHandle {
  kind = 'file' as const;
  name: string;
  _content: Uint8Array = new Uint8Array(0);

  constructor(name: string) {
    this.name = name;
  }

  async getFile(): Promise<File> {
    return new File([this._content], this.name, { type: 'video/webm' });
  }

  async createWritable(options?: { keepExistingData?: boolean }): Promise<MockWritableStream> {
    return new MockWritableStream(this, options?.keepExistingData ?? false);
  }
}

class MockDirectoryHandle {
  kind = 'directory' as const;
  name: string;
  entriesMap = new Map<string, MockDirectoryHandle | MockFileHandle>();

  constructor(name: string) {
    this.name = name;
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<MockDirectoryHandle> {
    let dir = this.entriesMap.get(name);
    if (!dir) {
      if (options?.create) {
        dir = new MockDirectoryHandle(name);
        this.entriesMap.set(name, dir);
      } else {
        throw new Error(`NotFoundError: Directory '${name}' not found`);
      }
    }
    return dir as MockDirectoryHandle;
  }

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<MockFileHandle> {
    let file = this.entriesMap.get(name);
    if (!file) {
      if (options?.create) {
        file = new MockFileHandle(name);
        this.entriesMap.set(name, file);
      } else {
        throw new Error(`NotFoundError: File '${name}' not found`);
      }
    }
    return file as MockFileHandle;
  }

  async removeEntry(name: string, _options?: { recursive?: boolean }): Promise<void> {
    if (!this.entriesMap.has(name)) {
      throw new Error(`NotFoundError: Entry '${name}' not found`);
    }
    this.entriesMap.delete(name);
  }

  async *values(): AsyncIterable<MockDirectoryHandle | MockFileHandle> {
    for (const val of this.entriesMap.values()) {
      yield val;
    }
  }

  // Compatibility iterator for for-await (dir.entries() or dir.values())
  [Symbol.asyncIterator]() {
    return this.values();
  }
}

let mockRootDir: MockDirectoryHandle;

beforeEach(() => {
  mockRootDir = new MockDirectoryHandle('root');
  vi.stubGlobal('navigator', {
    storage: {
      getDirectory: vi.fn().mockResolvedValue(mockRootDir),
    },
  });
});

describe('OPFS Recording Storage Core', () => {
  it('detects OPFS support in browser environment', () => {
    expect(isOPFSSupported()).toBe(true);
  });

  it('appends recording chunks and initializes metadata with recording status', async () => {
    const chunk1 = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x01]);
    const chunk2 = new Uint8Array([0x1f, 0x43, 0xb6, 0x75, 0x02]);

    await appendRecordingChunk('interview-101', chunk1);
    await appendRecordingChunk('interview-101', chunk2);

    const file = await getRecordingFile('interview-101');
    expect(file).not.toBeNull();
    expect(file?.size).toBe(chunk1.length + chunk2.length);

    const meta = await getRecordingMetadata('interview-101');
    expect(meta).not.toBeNull();
    expect(meta?.status).toBe('recording');
    expect(meta?.chunkCount).toBe(2);
    expect(meta?.interviewId).toBe('interview-101');
  });

  it('finalizes recording and updates status to finalized with duration', async () => {
    // Create synthetic header + cluster
    const cluster = new Uint8Array([
      0x1a, 0x45, 0xdf, 0xa3, 0x85, 0x42, 0x82, 0x84, 0x77, 0x65,
      0x18, 0x53, 0x80, 0x67, 0xff,
      0x15, 0x49, 0xa9, 0x66, 0x87, 0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40,
      0x1f, 0x43, 0xb6, 0x75, 0x85, 0xe7, 0x82, 0x27, 0x10, 0xa3 // timestamp 10000ms
    ]);
    await appendRecordingChunk('interview-102', cluster);

    const result = await finalizeRecording('interview-102');
    expect(result.success).toBe(true);
    expect(result.durationMs).toBe(10000);

    const meta = await getRecordingMetadata('interview-102');
    expect(meta?.status).toBe('finalized');
    expect(meta?.durationMs).toBe(10000);
  });

  it('auto-recovers unfinalized recording from crash and sets status to repaired', async () => {
    const cluster = new Uint8Array([
      0x1a, 0x45, 0xdf, 0xa3, 0x85, 0x42, 0x82, 0x84, 0x77, 0x65,
      0x18, 0x53, 0x80, 0x67, 0xff,
      0x15, 0x49, 0xa9, 0x66, 0x87, 0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40,
      0x1f, 0x43, 0xb6, 0x75, 0x85, 0xe7, 0x82, 0x13, 0x88, 0xa3 // timestamp 5000ms
    ]);
    await appendRecordingChunk('interview-crash-1', cluster);

    // Recording is left in 'recording' state
    const preMeta = await getRecordingMetadata('interview-crash-1');
    expect(preMeta?.status).toBe('recording');

    // Recovery runs
    const recovery = await autoRecoverRecording('interview-crash-1');
    expect(recovery.repaired).toBe(true);
    expect(recovery.durationMs).toBe(5000);

    const postMeta = await getRecordingMetadata('interview-crash-1');
    expect(postMeta?.status).toBe('repaired');
    expect(postMeta?.durationMs).toBe(5000);
  });

  it('recovers all unfinalized recordings across directories', async () => {
    const cluster = new Uint8Array([
      0x1a, 0x45, 0xdf, 0xa3, 0x85, 0x42, 0x82, 0x84, 0x77, 0x65,
      0x18, 0x53, 0x80, 0x67, 0xff,
      0x15, 0x49, 0xa9, 0x66, 0x87, 0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40,
      0x1f, 0x43, 0xb6, 0x75, 0x85, 0xe7, 0x82, 0x0b, 0xb8, 0xa3 // 3000ms
    ]);
    await appendRecordingChunk('crash-a', cluster);
    await appendRecordingChunk('crash-b', cluster);

    const recovered = await recoverAllUnfinalizedRecordings();
    expect(recovered).toHaveLength(2);
    expect(recovered.map((r) => r.interviewId).sort()).toEqual(['crash-a', 'crash-b']);
  });

  it('lists all recorded interviews', async () => {
    await appendRecordingChunk('item-1', new Uint8Array([1, 2, 3]));
    await appendRecordingChunk('item-2', new Uint8Array([4, 5, 6]));

    const list = await listRecordings();
    expect(list).toHaveLength(2);
    expect(list.map((m) => m.interviewId).sort()).toEqual(['item-1', 'item-2']);
  });

  it('deletes recording directory and files', async () => {
    await appendRecordingChunk('to-delete', new Uint8Array([1, 2, 3]));
    expect(await getRecordingFile('to-delete')).not.toBeNull();

    const deleted = await deleteRecording('to-delete');
    expect(deleted).toBe(true);
    expect(await getRecordingFile('to-delete')).toBeNull();
    expect(await getRecordingMetadata('to-delete')).toBeNull();
  });

  it('persists and retrieves transcript data', async () => {
    const transcriptData = {
      interviewId: 'transcript-test',
      segments: [
        { start: 0, end: 4.5, text: 'Welcome to the interview.' },
        { start: 5.0, end: 9.2, text: 'Can you describe your background?' },
      ],
      text: 'Welcome to the interview. Can you describe your background?',
      createdAt: new Date().toISOString(),
      model: 'whisper-base',
    };

    await saveTranscript('transcript-test', transcriptData);
    const loaded = await getTranscript('transcript-test');
    expect(loaded).toEqual(transcriptData);
  });
});
