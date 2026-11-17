import { describe, it, expect } from 'vitest';
import {
  readVint,
  writeVint,
  inspectWebM,
  scanClusters,
  calculateDurationFromClusters,
  generateCues,
  patchWebMWithDurationAndCues,
  EBML_ID,
  createMasterElement,
  createUIntElement,
  createStringElement,
} from '../ebml-patcher';

describe('EBML Patcher - Low-level VINT Operations', () => {
  it('encodes and decodes 1-byte VINT', () => {
    const encoded = writeVint(5);
    expect(encoded).toEqual(new Uint8Array([0x85]));

    const decoded = readVint(encoded, 0, false);
    expect(decoded).not.toBeNull();
    expect(decoded?.length).toBe(1);
    expect(decoded?.value).toBe(5);
    expect(decoded?.isUnknown).toBe(false);
  });

  it('encodes and decodes multi-byte VINT', () => {
    // 1000 in 2-byte VINT: 0x43E8
    const encoded2 = writeVint(1000, 2);
    expect(encoded2).toEqual(new Uint8Array([0x43, 0xe8]));

    const decoded2 = readVint(encoded2, 0, false);
    expect(decoded2?.length).toBe(2);
    expect(decoded2?.value).toBe(1000);

    // 100000 in 3-byte VINT: 0x2186A0
    const encoded3 = writeVint(100000, 3);
    const decoded3 = readVint(encoded3, 0, false);
    expect(decoded3?.length).toBe(3);
    expect(decoded3?.value).toBe(100000);
  });

  it('detects unknown size marker (all 1s in data bits)', () => {
    // 8-byte unknown size: 0x01 followed by seven 0xFF
    const unknown8 = new Uint8Array([0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
    const decoded = readVint(unknown8, 0, false);
    expect(decoded?.isUnknown).toBe(true);
    expect(decoded?.value).toBe(-1);

    // 1-byte unknown size: 0xFF
    const unknown1 = new Uint8Array([0xff]);
    const decoded1 = readVint(unknown1, 0, false);
    expect(decoded1?.isUnknown).toBe(true);
    expect(decoded1?.value).toBe(-1);
  });

  it('reads EBML ID retaining length marker bit', () => {
    const clusterIdBytes = new Uint8Array([0x1f, 0x43, 0xb6, 0x75]);
    const decoded = readVint(clusterIdBytes, 0, true);
    expect(decoded?.length).toBe(4);
    expect(decoded?.value).toBe(EBML_ID.Cluster);
  });
});

describe('EBML Patcher - WebM Inspection & Cluster Scanning', () => {
  // Helper to build a synthetic unseekable WebM buffer (simulating MediaRecorder output)
  function createSyntheticWebM(options?: { withDuration?: boolean; withCues?: boolean }) {
    // 1. EBML Header
    const ebmlHeader = createMasterElement(EBML_ID.EBML, [
      createUIntElement(EBML_ID.EBMLVersion, 1),
      createUIntElement(EBML_ID.EBMLReadVersion, 1),
      createUIntElement(EBML_ID.EBMLMaxIDLength, 4),
      createUIntElement(EBML_ID.EBMLMaxSizeLength, 8),
      createStringElement(EBML_ID.DocType, 'webm'),
      createUIntElement(EBML_ID.DocTypeVersion, 2),
      createUIntElement(EBML_ID.DocTypeReadVersion, 2),
    ]);

    // 2. Info element
    const infoChildren = [
      createUIntElement(EBML_ID.TimecodeScale, 1000000), // 1ms
      createStringElement(EBML_ID.MuxingApp, 'Chrome-MediaRecorder'),
      createStringElement(EBML_ID.WritingApp, 'Sutradhar'),
    ];
    if (options?.withDuration) {
      // 8-byte float duration: 3500ms
      const durBuf = new Uint8Array(8);
      new DataView(durBuf.buffer).setFloat64(0, 3500, false);
      const durElem = new Uint8Array([0x44, 0x89, 0x88, ...durBuf]);
      infoChildren.push(durElem);
    }
    const info = createMasterElement(EBML_ID.Info, infoChildren);

    // 3. Tracks element
    const trackEntry = createMasterElement(EBML_ID.TrackEntry, [
      createUIntElement(EBML_ID.TrackNumber, 1),
      createUIntElement(EBML_ID.TrackUID, 1),
      createUIntElement(EBML_ID.TrackType, 1), // Video
      createStringElement(EBML_ID.CodecID, 'V_VP8'),
    ]);
    const tracks = createMasterElement(EBML_ID.Tracks, [trackEntry]);

    // 4. Clusters
    function createCluster(timecode: number, relTime: number = 0) {
      const timeElem = createUIntElement(EBML_ID.Timestamp, timecode);
      // SimpleBlock: track 1 (0x81), relTime int16 BE, flags 0x80 (keyframe)
      const blockHeader = new Uint8Array([0x81, (relTime >> 8) & 0xff, relTime & 0xff, 0x80]);
      const blockPayload = new Uint8Array([10, 20, 30]);
      const blockData = new Uint8Array([...blockHeader, ...blockPayload]);
      const simpleBlock = new Uint8Array([0xa3, ...writeVint(blockData.length), ...blockData]);
      return createMasterElement(EBML_ID.Cluster, [timeElem, simpleBlock]);
    }

    const c1 = createCluster(0, 0);
    const c2 = createCluster(1000, 33);
    const c3 = createCluster(2500, 66);

    // Segment header with 8-byte unknown length
    const segHeader = new Uint8Array([
      0x18, 0x53, 0x80, 0x67, // Segment ID
      0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, // unknown size
    ]);

    const segChildren = [info, tracks, c1, c2, c3];
    if (options?.withCues) {
      // add a dummy cues element
      const dummyCues = createMasterElement(EBML_ID.Cues, [
        createMasterElement(EBML_ID.CuePoint, [
          createUIntElement(EBML_ID.CueTime, 0),
          createMasterElement(EBML_ID.CueTrackPositions, [
            createUIntElement(EBML_ID.CueTrack, 1),
            createUIntElement(EBML_ID.CueClusterPosition, 100),
          ]),
        ]),
      ]);
      segChildren.push(dummyCues);
    }

    const totalLen = ebmlHeader.length + segHeader.length + segChildren.reduce((a, b) => a + b.length, 0);
    const full = new Uint8Array(totalLen);
    let offset = 0;
    full.set(ebmlHeader, offset);
    offset += ebmlHeader.length;
    full.set(segHeader, offset);
    offset += segHeader.length;
    for (const child of segChildren) {
      full.set(child, offset);
      offset += child.length;
    }

    return full;
  }

  it('inspects unseekable WebM produced by browser MediaRecorder', () => {
    const rawWebM = createSyntheticWebM({ withDuration: false, withCues: false });
    const inspection = inspectWebM(rawWebM);

    expect(inspection.hasEBMLHeader).toBe(true);
    expect(inspection.hasSegment).toBe(true);
    expect(inspection.hasDuration).toBe(false);
    expect(inspection.hasCues).toBe(false);
    expect(inspection.isSeekable).toBe(false);
    expect(inspection.timecodeScale).toBe(1000000); // 1ms
  });

  it('scans clusters and extracts timestamps and offsets', () => {
    const rawWebM = createSyntheticWebM();
    const clusters = scanClusters(rawWebM);

    expect(clusters.length).toBe(3);
    expect(clusters[0].timestamp).toBe(0);
    expect(clusters[1].timestamp).toBe(1000);
    expect(clusters[2].timestamp).toBe(2500);
    expect(clusters[2].maxBlockTimecode).toBe(2500 + 66);
  });

  it('calculates duration correctly from scanned clusters', () => {
    const rawWebM = createSyntheticWebM();
    const clusters = scanClusters(rawWebM);
    const duration = calculateDurationFromClusters(clusters);

    // Last cluster is at 2500 with block relTime 66 -> duration >= 2566ms
    expect(duration).toBeGreaterThanOrEqual(2566);
  });

  it('generates valid EBML Cues structure from clusters', () => {
    const rawWebM = createSyntheticWebM();
    const clusters = scanClusters(rawWebM);
    const inspection = inspectWebM(rawWebM);

    const cues = generateCues(clusters, inspection.segmentContentStartPos, 1);
    expect(cues.length).toBeGreaterThan(0);
    // Cues element ID is 0x1C53BB6B
    expect(cues[0]).toBe(0x1c);
    expect(cues[1]).toBe(0x53);
    expect(cues[2]).toBe(0xbb);
    expect(cues[3]).toBe(0x6b);
  });
});

describe('EBML Patcher - Full WebM Duration & Cues Repair', () => {
  it('patches an unseekable WebM file into a seekable WebM file with duration and cues', () => {
    // Generate synthetic unseekable file
    const ebmlHeader = createMasterElement(EBML_ID.EBML, [
      createUIntElement(EBML_ID.EBMLVersion, 1),
      createUIntElement(EBML_ID.EBMLReadVersion, 1),
      createUIntElement(EBML_ID.EBMLMaxIDLength, 4),
      createUIntElement(EBML_ID.EBMLMaxSizeLength, 8),
      createStringElement(EBML_ID.DocType, 'webm'),
      createUIntElement(EBML_ID.DocTypeVersion, 2),
      createUIntElement(EBML_ID.DocTypeReadVersion, 2),
    ]);
    const info = createMasterElement(EBML_ID.Info, [
      createUIntElement(EBML_ID.TimecodeScale, 1000000),
      createStringElement(EBML_ID.MuxingApp, 'Chrome'),
    ]);
    const track = createMasterElement(EBML_ID.TrackEntry, [
      createUIntElement(EBML_ID.TrackNumber, 1),
      createUIntElement(EBML_ID.TrackType, 1),
      createStringElement(EBML_ID.CodecID, 'V_VP8'),
    ]);
    const tracks = createMasterElement(EBML_ID.Tracks, [track]);

    function makeCluster(tc: number) {
      const timeElem = createUIntElement(EBML_ID.Timestamp, tc);
      const blockHeader = new Uint8Array([0x81, 0x00, 0x00, 0x80, 1, 2, 3]);
      const simpleBlock = new Uint8Array([0xa3, ...writeVint(blockHeader.length), ...blockHeader]);
      return createMasterElement(EBML_ID.Cluster, [timeElem, simpleBlock]);
    }

    const c1 = makeCluster(0);
    const c2 = makeCluster(1500);
    const c3 = makeCluster(3200);

    const segHeader = new Uint8Array([0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
    const unseekable = new Uint8Array([
      ...ebmlHeader,
      ...segHeader,
      ...info,
      ...tracks,
      ...c1,
      ...c2,
      ...c3,
    ]);

    const initialInspection = inspectWebM(unseekable);
    expect(initialInspection.isSeekable).toBe(false);
    expect(initialInspection.hasDuration).toBe(false);
    expect(initialInspection.hasCues).toBe(false);

    // Now patch it!
    const patched = patchWebMWithDurationAndCues(unseekable);
    const patchedInspection = inspectWebM(patched);

    expect(patchedInspection.hasEBMLHeader).toBe(true);
    expect(patchedInspection.hasSegment).toBe(true);
    expect(patchedInspection.hasDuration).toBe(true);
    expect(patchedInspection.durationMs).toBeGreaterThanOrEqual(3200);
    expect(patchedInspection.hasCues).toBe(true);
    expect(patchedInspection.hasSeekHead).toBe(true);
    expect(patchedInspection.isSeekable).toBe(true);
  });

  it('allows explicit duration override during finalization', () => {
    const ebmlHeader = createMasterElement(EBML_ID.EBML, [
      createStringElement(EBML_ID.DocType, 'webm'),
    ]);
    const info = createMasterElement(EBML_ID.Info, [
      createUIntElement(EBML_ID.TimecodeScale, 1000000),
    ]);
    const track = createMasterElement(EBML_ID.TrackEntry, [
      createUIntElement(EBML_ID.TrackNumber, 1),
      createUIntElement(EBML_ID.TrackType, 1),
      createStringElement(EBML_ID.CodecID, 'V_VP8'),
    ]);
    const tracks = createMasterElement(EBML_ID.Tracks, [track]);
    const timeElem = createUIntElement(EBML_ID.Timestamp, 0);
    const blockHeader = new Uint8Array([0x81, 0x00, 0x00, 0x80, 9]);
    const simpleBlock = new Uint8Array([0xa3, ...writeVint(blockHeader.length), ...blockHeader]);
    const c1 = createMasterElement(EBML_ID.Cluster, [timeElem, simpleBlock]);

    const segHeader = new Uint8Array([0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
    const raw = new Uint8Array([...ebmlHeader, ...segHeader, ...info, ...tracks, ...c1]);

    const patched = patchWebMWithDurationAndCues(raw, 5000);
    const inspection = inspectWebM(patched);

    expect(inspection.durationMs).toBe(5000);
    expect(inspection.hasCues).toBe(true);
    expect(inspection.isSeekable).toBe(true);
  });

  it('recovers partial or interrupted recordings where the last cluster was cut short', () => {
    // Generate valid header + 2 clusters, then append partial corrupt cluster bytes
    const ebmlHeader = createMasterElement(EBML_ID.EBML, [
      createStringElement(EBML_ID.DocType, 'webm'),
    ]);
    const info = createMasterElement(EBML_ID.Info, [
      createUIntElement(EBML_ID.TimecodeScale, 1000000),
    ]);
    const track = createMasterElement(EBML_ID.TrackEntry, [
      createUIntElement(EBML_ID.TrackNumber, 1),
      createUIntElement(EBML_ID.TrackType, 1),
      createStringElement(EBML_ID.CodecID, 'V_VP8'),
    ]);
    const tracks = createMasterElement(EBML_ID.Tracks, [track]);

    function makeCluster(tc: number) {
      const timeElem = createUIntElement(EBML_ID.Timestamp, tc);
      const blockHeader = new Uint8Array([0x81, 0x00, 0x00, 0x80, 1, 2]);
      const simpleBlock = new Uint8Array([0xa3, ...writeVint(blockHeader.length), ...blockHeader]);
      return createMasterElement(EBML_ID.Cluster, [timeElem, simpleBlock]);
    }

    const c1 = makeCluster(0);
    const c2 = makeCluster(2000);
    // Partial truncated cluster (simulating sudden tab close)
    const partialCluster = new Uint8Array([0x1f, 0x43, 0xb6, 0x75, 0x41, 0x00, 0xe7, 0x82, 0x0b]); // cut off!

    const segHeader = new Uint8Array([0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
    const interrupted = new Uint8Array([...ebmlHeader, ...segHeader, ...info, ...tracks, ...c1, ...c2, ...partialCluster]);

    // Should recover without throwing and keep all valid minutes/clusters
    const repaired = patchWebMWithDurationAndCues(interrupted);
    const inspection = inspectWebM(repaired);

    expect(inspection.hasDuration).toBe(true);
    expect(inspection.durationMs).toBeGreaterThanOrEqual(2000);
    expect(inspection.hasCues).toBe(true);
    expect(inspection.isSeekable).toBe(true);
  });
});
