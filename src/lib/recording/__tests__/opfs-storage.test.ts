import { describe, it, expect, beforeEach } from 'vitest';
import {
  OpfsRecordingStorage,
  appendChunkToRecording,
  finalizeRecording,
} from '../opfs-storage';
import { createMockOpfsRoot } from './mocks/opfs-mock';
import {
  EBML_ID,
  createMasterElement,
  createUIntElement,
  createStringElement,
  writeVint,
  inspectWebM,
} from '../ebml-patcher';

describe('OPFS Recording Storage Core', () => {
  let mockRoot: FileSystemDirectoryHandle;
  let storage: OpfsRecordingStorage;

  beforeEach(() => {
    mockRoot = createMockOpfsRoot();
    storage = new OpfsRecordingStorage(mockRoot);
  });

  // Helper to build realistic WebM chunks as emitted by MediaRecorder
  function buildSyntheticChunks() {
    // Chunk 0: EBML header + Segment open + Info (no duration) + Tracks + Cluster 0
    const ebmlHeader = createMasterElement(EBML_ID.EBML, [
      createStringElement(EBML_ID.DocType, 'webm'),
    ]);
    const info = createMasterElement(EBML_ID.Info, [
      createUIntElement(EBML_ID.TimecodeScale, 1000000), // 1ms
      createStringElement(EBML_ID.WritingApp, 'Sutradhar-OPFS-Recorder'),
    ]);
    const track = createMasterElement(EBML_ID.TrackEntry, [
      createUIntElement(EBML_ID.TrackNumber, 1),
      createUIntElement(EBML_ID.TrackType, 1),
      createStringElement(EBML_ID.CodecID, 'V_VP8'),
    ]);
    const tracks = createMasterElement(EBML_ID.Tracks, [track]);

    function createCluster(tc: number, relTime = 0) {
      const timeElem = createUIntElement(EBML_ID.Timestamp, tc);
      const blockHeader = new Uint8Array([0x81, (relTime >> 8) & 0xff, relTime & 0xff, 0x80]);
      const blockPayload = new Uint8Array([1, 2, 3, 4, 5]);
      const blockData = new Uint8Array([...blockHeader, ...blockPayload]);
      const simpleBlock = new Uint8Array([0xa3, ...writeVint(blockData.length), ...blockData]);
      return createMasterElement(EBML_ID.Cluster, [timeElem, simpleBlock]);
    }

    const segHeader = new Uint8Array([
      0x18, 0x53, 0x80, 0x67,
      0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    ]);

    const c1 = createCluster(0, 0);
    const chunk0 = new Blob([new Uint8Array([...ebmlHeader, ...segHeader, ...info, ...tracks, ...c1])], {
      type: 'video/webm',
    });
    const chunk1 = new Blob([createCluster(1000, 30)], { type: 'video/webm' });
    const chunk2 = new Blob([createCluster(2500, 40)], { type: 'video/webm' });

    return { chunk0, chunk1, chunk2 };
  }

  it('streams chunks sequentially into OPFS without loading all chunks in RAM', async () => {
    const interviewId = 'interview-uuid-1';
    const { chunk0, chunk1, chunk2 } = buildSyntheticChunks();

    // 1. Start recording session
    const session = await storage.startRecording(interviewId);
    expect(session.interviewId).toBe(interviewId);

    // 2. Stream chunk 0
    await session.appendChunk(chunk0);
    let meta = await storage.getRecordingMetadata(interviewId);
    expect(meta).not.toBeNull();
    expect(meta?.status).toBe('recording');
    expect(meta?.chunkCount).toBe(1);
    expect(meta?.fileSizeBytes).toBe(chunk0.size);

    // 3. Stream chunk 1 & chunk 2
    await session.appendChunk(chunk1);
    await session.appendChunk(chunk2);

    meta = await storage.getRecordingMetadata(interviewId);
    expect(meta?.chunkCount).toBe(3);
    expect(meta?.fileSizeBytes).toBe(chunk0.size + chunk1.size + chunk2.size);

    await session.close();
  });

  it('finalizes a recording with EBML header patching, exact duration, and seek cues', async () => {
    const interviewId = 'interview-uuid-2';
    const { chunk0, chunk1, chunk2 } = buildSyntheticChunks();

    const session = await storage.startRecording(interviewId);
    await session.appendChunk(chunk0);
    await session.appendChunk(chunk1);
    await session.appendChunk(chunk2);

    // Finalize recording
    const finalizedMeta = await session.finalize();
    expect(finalizedMeta.status).toBe('finalized');
    expect(finalizedMeta.isSeekable).toBe(true);
    expect(finalizedMeta.durationMs).toBeGreaterThanOrEqual(2500);

    // Verify stored OPFS file has valid EBML cues and duration
    const file = await storage.getRecordingFile(interviewId);
    expect(file).not.toBeNull();
    expect(file?.name).toBe('recording.webm');
    expect(file?.type).toBe('video/webm');

    // Verify Blob retrieval
    const blob = await storage.getRecordingBlob(interviewId);
    expect(blob).not.toBeNull();
    expect(blob?.size).toBe(file?.size);
    expect(blob?.type).toBe('video/webm');

    const fileBytes = new Uint8Array(await file!.arrayBuffer());
    const inspection = inspectWebM(fileBytes);
    expect(inspection.hasEBMLHeader).toBe(true);
    expect(inspection.hasSegment).toBe(true);
    expect(inspection.hasDuration).toBe(true);
    expect(inspection.hasCues).toBe(true);
    expect(inspection.hasSeekHead).toBe(true);
    expect(inspection.isSeekable).toBe(true);
  });

  it('detects unfinalized crashed recording and auto-recovers captured minutes and cues', async () => {
    const interviewId = 'interview-crashed-session';
    const { chunk0, chunk1, chunk2 } = buildSyntheticChunks();

    // Start session and write chunks, but DO NOT finalize (simulate unexpected tab crash)
    const session = await storage.startRecording(interviewId);
    await session.appendChunk(chunk0);
    await session.appendChunk(chunk1);
    await session.appendChunk(chunk2);
    await session.close(); // stream abruptly closed without finalize()

    // Confirm session is still in 'recording' status
    const initialMeta = await storage.getRecordingMetadata(interviewId);
    expect(initialMeta?.status).toBe('recording');
    expect(initialMeta?.isSeekable).toBe(false);
    expect(await storage.isRecordingInterrupted(interviewId)).toBe(true);

    // Trigger auto-recovery routine (e.g. when Dashboard loads)
    const recoveredMeta = await storage.recoverRecording(interviewId);
    expect(recoveredMeta).not.toBeNull();
    expect(recoveredMeta?.status).toBe('repaired');
    expect(recoveredMeta?.isSeekable).toBe(true);
    expect(recoveredMeta?.durationMs).toBeGreaterThanOrEqual(2500);

    // File in OPFS must now be seekable with duration and cues
    const file = await storage.getRecordingFile(interviewId);
    const bytes = new Uint8Array(await file!.arrayBuffer());
    const inspection = inspectWebM(bytes);
    expect(inspection.isSeekable).toBe(true);
    expect(inspection.hasDuration).toBe(true);
    expect(inspection.hasCues).toBe(true);
  });

  it('lists stored recordings across multiple interviews', async () => {
    const { chunk0 } = buildSyntheticChunks();

    const s1 = await storage.startRecording('int-1');
    await s1.appendChunk(chunk0);
    await s1.finalize(1000);

    const s2 = await storage.startRecording('int-2');
    await s2.appendChunk(chunk0);
    await s2.finalize(2000);

    const all = await storage.listRecordings();
    expect(all.length).toBe(2);
    const ids = all.map((r) => r.interviewId).sort();
    expect(ids).toEqual(['int-1', 'int-2']);
  });

  it('deletes stored recording files and directory per interview ID', async () => {
    const interviewId = 'interview-to-delete';
    const { chunk0 } = buildSyntheticChunks();

    const session = await storage.startRecording(interviewId);
    await session.appendChunk(chunk0);
    await session.finalize();

    expect(await storage.hasRecording(interviewId)).toBe(true);

    // Delete recording
    const deleted = await storage.deleteRecording(interviewId);
    expect(deleted).toBe(true);

    expect(await storage.hasRecording(interviewId)).toBe(false);
    expect(await storage.getRecordingFile(interviewId)).toBeNull();
    expect(await storage.getRecordingMetadata(interviewId)).toBeNull();
  });

  it('streams chunks sequentially and finalizes via appendChunkToRecording and finalizeRecording helpers', async () => {
    const interviewId = 'interview-helper-session';
    const { chunk0, chunk1, chunk2 } = buildSyntheticChunks();

    // Stream chunks sequentially using standalone helper
    await appendChunkToRecording(interviewId, chunk0, storage);
    let meta = await storage.getRecordingMetadata(interviewId);
    expect(meta?.status).toBe('recording');
    expect(meta?.chunkCount).toBe(1);

    await appendChunkToRecording(interviewId, chunk1, storage);
    await appendChunkToRecording(interviewId, chunk2, storage);

    meta = await storage.getRecordingMetadata(interviewId);
    expect(meta?.chunkCount).toBe(3);
    expect(meta?.fileSizeBytes).toBe(chunk0.size + chunk1.size + chunk2.size);

    // Finalize recording using standalone helper
    const finalized = await finalizeRecording(interviewId, 3000, storage);
    expect(finalized.status).toBe('finalized');
    expect(finalized.isSeekable).toBe(true);
    expect(finalized.durationMs).toBe(3000);

    const file = await storage.getRecordingFile(interviewId);
    expect(file).not.toBeNull();
  });
});
