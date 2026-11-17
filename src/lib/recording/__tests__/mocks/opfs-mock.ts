/**
 * In-Memory OPFS Mock for Testing & Non-Browser Environments.
 */

export function createMockOpfsRoot(): FileSystemDirectoryHandle {
  return new MockDirectoryHandle('') as unknown as FileSystemDirectoryHandle;
}

export class MockWritableStream implements FileSystemWritableFileStream {
  readonly locked = false;
  private position = 0;
  private closed = false;

  constructor(private readonly fileHandle: MockFileHandle) {}

  async write(data: FileSystemWriteChunkType | BufferSource | Blob | string): Promise<void> {
    if (this.closed) throw new Error('WritableStream is closed');
    let bytes: Uint8Array;
    if (ArrayBuffer.isView(data)) {
      bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    } else if (
      data instanceof ArrayBuffer ||
      (data &&
        typeof (data as unknown as ArrayBuffer).byteLength === 'number' &&
        typeof (data as unknown as ArrayBuffer).slice === 'function')
    ) {
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

export class MockFileHandle implements FileSystemFileHandle {
  readonly kind = 'file' as const;
  public buffer = new Uint8Array(0);

  constructor(public readonly name: string) {}

  async getFile(): Promise<File> {
    const mime = this.name.endsWith('.webm') ? 'video/webm' : 'application/json';
    return new File([this.buffer.slice()], this.name, { type: mime });
  }

  async createWritable(
    options?: FileSystemCreateWritableOptions
  ): Promise<FileSystemWritableFileStream> {
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

export class MockDirectoryHandle implements FileSystemDirectoryHandle {
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
