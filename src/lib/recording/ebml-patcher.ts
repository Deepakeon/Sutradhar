/**
 * Pure TypeScript EBML parser, inspector, cues generator, and container patcher.
 *
 * Browsers recording via MediaRecorder emit WebM files with missing Duration
 * and no SeekHead/Cues (stream mode), resulting in NaN/Infinity duration and broken seeking.
 * This module inspects, scans clusters, recalculates duration (even for interrupted recordings),
 * and patches WebM containers with exact SeekHead, Info Duration, and Cues.
 */

export const EBML_ID = {
  EBML: 0x1a45dfa3,
  EBMLVersion: 0x4286,
  EBMLReadVersion: 0x42f7,
  EBMLMaxIDLength: 0x42f2,
  EBMLMaxSizeLength: 0x42f3,
  DocType: 0x4282,
  DocTypeVersion: 0x4287,
  DocTypeReadVersion: 0x4285,

  Segment: 0x18538067,
  SeekHead: 0x114d9b74,
  Seek: 0x4dbb,
  SeekID: 0x53ab,
  SeekPosition: 0x53ac,

  Info: 0x1549a966,
  TimecodeScale: 0x2ad7b1,
  Duration: 0x4489,
  MuxingApp: 0x4d80,
  WritingApp: 0x5741,

  Tracks: 0x1654ae6b,
  TrackEntry: 0xae,
  TrackNumber: 0xd7,
  TrackUID: 0x73c5,
  TrackType: 0x83,
  CodecID: 0x86,

  Cluster: 0x1f43b675,
  Timestamp: 0xe7,
  SimpleBlock: 0xa3,
  BlockGroup: 0xa0,

  Cues: 0x1c53bb6b,
  CuePoint: 0xbb,
  CueTime: 0xb3,
  CueTrackPositions: 0xb7,
  CueTrack: 0xf7,
  CueClusterPosition: 0xf1,
} as const;

export interface VintResult {
  length: number;
  value: number;
  isUnknown: boolean;
}

/**
 * Reads an EBML variable-length integer (VINT) or EBML ID from a buffer.
 */
export function readVint(buf: Uint8Array, offset: number, isId = false): VintResult | null {
  if (offset >= buf.length) return null;
  const first = buf[offset];
  let length = 0;
  for (let b = 7; b >= 0; b--) {
    if (first & (1 << b)) {
      length = 8 - b;
      break;
    }
  }
  if (length === 0 || offset + length > buf.length) return null;

  let val = 0;
  if (isId) {
    for (let i = 0; i < length; i++) {
      val = val * 256 + buf[offset + i];
    }
  } else {
    val = first & ((1 << (8 - length)) - 1);
    for (let i = 1; i < length; i++) {
      val = val * 256 + buf[offset + i];
    }
  }

  let isUnknown = false;
  if (!isId) {
    let allOnes = (first & ((1 << (8 - length)) - 1)) === ((1 << (8 - length)) - 1);
    for (let i = 1; i < length; i++) {
      if (buf[offset + i] !== 0xff) {
        allOnes = false;
        break;
      }
    }
    isUnknown = allOnes;
  }

  return { length, value: isUnknown ? -1 : val, isUnknown };
}

/**
 * Encodes a numeric value as an EBML VINT.
 */
export function writeVint(value: number, fixedLength?: number): Uint8Array {
  if (fixedLength) {
    const buf = new Uint8Array(fixedLength);
    let val = value;
    for (let i = fixedLength - 1; i >= 0; i--) {
      buf[i] = val & 0xff;
      val = Math.floor(val / 256);
    }
    buf[0] |= 1 << (8 - fixedLength);
    return buf;
  }

  // Determine minimal length required (1 to 8 bytes)
  for (let len = 1; len <= 8; len++) {
    const maxVal = Math.pow(2, 7 * len) - 2;
    if (value <= maxVal) {
      return writeVint(value, len);
    }
  }
  return writeVint(value, 8);
}

/**
 * Helper to encode an EBML element ID into bytes.
 */
export function encodeId(id: number): Uint8Array {
  if (id <= 0xff) return new Uint8Array([id]);
  if (id <= 0xffff) return new Uint8Array([(id >> 8) & 0xff, id & 0xff]);
  if (id <= 0xffffff) return new Uint8Array([(id >> 16) & 0xff, (id >> 8) & 0xff, id & 0xff]);
  return new Uint8Array([
    (id >> 24) & 0xff,
    (id >> 16) & 0xff,
    (id >> 8) & 0xff,
    id & 0xff,
  ]);
}

/**
 * Creates a raw EBML element given an ID and payload bytes.
 */
export function createRawElement(id: number, payload: Uint8Array): Uint8Array {
  const idBuf = encodeId(id);
  const sizeBuf = writeVint(payload.length);
  const res = new Uint8Array(idBuf.length + sizeBuf.length + payload.length);
  res.set(idBuf, 0);
  res.set(sizeBuf, idBuf.length);
  res.set(payload, idBuf.length + sizeBuf.length);
  return res;
}

/**
 * Creates a Master element containing child elements.
 */
export function createMasterElement(id: number, children: Uint8Array[]): Uint8Array {
  const idBuf = encodeId(id);
  const totalChildLen = children.reduce((sum, c) => sum + c.length, 0);
  const sizeBuf = writeVint(totalChildLen);

  const res = new Uint8Array(idBuf.length + sizeBuf.length + totalChildLen);
  res.set(idBuf, 0);
  res.set(sizeBuf, idBuf.length);
  let pos = idBuf.length + sizeBuf.length;
  for (const child of children) {
    res.set(child, pos);
    pos += child.length;
  }
  return res;
}

/**
 * Creates an unsigned integer EBML element.
 */
export function createUIntElement(id: number, value: number): Uint8Array {
  let valBytes: Uint8Array;
  if (value < 256) {
    valBytes = new Uint8Array([value]);
  } else if (value < 65536) {
    valBytes = new Uint8Array([(value >> 8) & 0xff, value & 0xff]);
  } else if (value < 16777216) {
    valBytes = new Uint8Array([(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]);
  } else {
    valBytes = new Uint8Array(4);
    new DataView(valBytes.buffer).setUint32(0, value, false);
  }
  return createRawElement(id, valBytes);
}

/**
 * Creates a Float EBML element (Float64 by default).
 */
export function createFloatElement(id: number, value: number): Uint8Array {
  const valBytes = new Uint8Array(8);
  new DataView(valBytes.buffer).setFloat64(0, value, false);
  return createRawElement(id, valBytes);
}

/**
 * Creates a String EBML element (UTF-8).
 */
export function createStringElement(id: number, text: string): Uint8Array {
  const valBytes = new TextEncoder().encode(text);
  return createRawElement(id, valBytes);
}

export interface WebMInspection {
  hasEBMLHeader: boolean;
  ebmlHeaderSize: number;
  hasSegment: boolean;
  segmentContentStartPos: number;
  hasInfo: boolean;
  hasDuration: boolean;
  durationMs: number;
  timecodeScale: number;
  hasTracks: boolean;
  hasCues: boolean;
  hasSeekHead: boolean;
  isSeekable: boolean;
  firstClusterOffset: number;
}

export interface ClusterInfo {
  offset: number; // absolute byte offset in file
  timestamp: number; // cluster timecode in TimecodeScale units (usually ms)
  maxBlockTimecode: number; // cluster timestamp + max relative block timecode
  keyframeTrack: number;
  size: number;
}

/**
 * Inspects a WebM buffer and determines its structure, metadata, and seekability.
 */
export function inspectWebM(bytes: Uint8Array): WebMInspection {
  const result: WebMInspection = {
    hasEBMLHeader: false,
    ebmlHeaderSize: 0,
    hasSegment: false,
    segmentContentStartPos: 0,
    hasInfo: false,
    hasDuration: false,
    durationMs: 0,
    timecodeScale: 1000000, // default 1ms
    hasTracks: false,
    hasCues: false,
    hasSeekHead: false,
    isSeekable: false,
    firstClusterOffset: -1,
  };

  if (!bytes || bytes.length < 4) return result;

  let offset = 0;
  // 1. Check EBML Header (0x1A45DFA3)
  const headerId = readVint(bytes, offset, true);
  if (headerId?.value !== EBML_ID.EBML) return result;

  result.hasEBMLHeader = true;
  offset += headerId.length;
  const headerSize = readVint(bytes, offset, false);
  if (!headerSize) return result;
  offset += headerSize.length + (headerSize.isUnknown ? 0 : headerSize.value);
  result.ebmlHeaderSize = offset;

  // 2. Check Segment (0x18538067)
  const segId = readVint(bytes, offset, true);
  if (segId?.value !== EBML_ID.Segment) return result;

  result.hasSegment = true;
  offset += segId.length;
  const segSize = readVint(bytes, offset, false);
  if (!segSize) return result;
  offset += segSize.length;
  result.segmentContentStartPos = offset;

  // 3. Scan top-level elements inside Segment
  while (offset < bytes.length) {
    const elemId = readVint(bytes, offset, true);
    if (!elemId) break;
    const elemSize = readVint(bytes, offset + elemId.length, false);
    if (!elemSize) break;

    const dataOffset = offset + elemId.length + elemSize.length;
    const nextOffset = elemSize.isUnknown ? bytes.length : dataOffset + elemSize.value;

    if (elemId.value === EBML_ID.SeekHead) {
      result.hasSeekHead = true;
    } else if (elemId.value === EBML_ID.Info) {
      result.hasInfo = true;
      // Inspect inside Info
      let infoOff = dataOffset;
      const infoEnd = Math.min(nextOffset, bytes.length);
      while (infoOff < infoEnd) {
        const subId = readVint(bytes, infoOff, true);
        if (!subId) break;
        const subSize = readVint(bytes, infoOff + subId.length, false);
        if (!subSize) break;
        const subDataOff = infoOff + subId.length + subSize.length;
        if (subId.value === EBML_ID.TimecodeScale && subSize.value > 0) {
          let scale = 0;
          for (let i = 0; i < subSize.value; i++) {
            scale = scale * 256 + bytes[subDataOff + i];
          }
          result.timecodeScale = scale;
        } else if (subId.value === EBML_ID.Duration && subSize.value > 0) {
          result.hasDuration = true;
          const dv = new DataView(bytes.buffer, bytes.byteOffset + subDataOff, subSize.value);
          if (subSize.value === 4) {
            result.durationMs = dv.getFloat32(0, false);
          } else if (subSize.value === 8) {
            result.durationMs = dv.getFloat64(0, false);
          }
        }
        infoOff = subDataOff + subSize.value;
      }
    } else if (elemId.value === EBML_ID.Tracks) {
      result.hasTracks = true;
    } else if (elemId.value === EBML_ID.Cues) {
      result.hasCues = true;
    } else if (elemId.value === EBML_ID.Cluster) {
      if (result.firstClusterOffset === -1) {
        result.firstClusterOffset = offset;
      }
    }

    if (elemSize.isUnknown && elemId.value === EBML_ID.Cluster) {
      // Find next cluster sync word
      const nextCluster = findNextClusterSync(bytes, dataOffset);
      offset = nextCluster !== -1 ? nextCluster : bytes.length;
    } else {
      offset = nextOffset;
    }
  }

  result.isSeekable = result.hasDuration && result.durationMs > 0 && result.hasCues;
  return result;
}

/**
 * Searches for the 4-byte Cluster sync word (0x1F 0x43 0xB6 0x75).
 */
export function findNextClusterSync(bytes: Uint8Array, startOffset: number): number {
  const limit = bytes.length - 4;
  for (let i = startOffset; i <= limit; i++) {
    if (
      bytes[i] === 0x1f &&
      bytes[i + 1] === 0x43 &&
      bytes[i + 2] === 0xb6 &&
      bytes[i + 3] === 0x75
    ) {
      return i;
    }
  }
  return -1;
}

/**
 * Scans all Clusters from a WebM file, extracting timestamps, block offsets, and keyframes.
 * Resilient against interrupted/corrupted final clusters.
 */
export function scanClusters(bytes: Uint8Array): ClusterInfo[] {
  const clusters: ClusterInfo[] = [];
  const inspection = inspectWebM(bytes);
  let offset = inspection.firstClusterOffset;

  if (offset === -1) {
    offset = findNextClusterSync(bytes, 0);
  }
  if (offset === -1) return clusters;

  while (offset < bytes.length && offset !== -1) {
    const elemId = readVint(bytes, offset, true);
    if (elemId?.value !== EBML_ID.Cluster) {
      offset = findNextClusterSync(bytes, offset + 1);
      continue;
    }

    const clusterOffset = offset;
    offset += elemId.length;
    const elemSize = readVint(bytes, offset, false);
    if (!elemSize) break;
    offset += elemSize.length;

    const dataStart = offset;
    let clusterEnd = elemSize.isUnknown ? bytes.length : Math.min(dataStart + elemSize.value, bytes.length);

    // Look for the next cluster to bound this cluster if size was unknown or interrupted
    const nextSync = findNextClusterSync(bytes, dataStart);
    if (nextSync !== -1 && (elemSize.isUnknown || nextSync < clusterEnd)) {
      clusterEnd = nextSync;
    }

    let timestamp = 0;
    let maxBlockTimecode = 0;
    let keyframeTrack = 1;
    let innerOff = dataStart;

    // Scan cluster children (Timestamp and SimpleBlock)
    while (innerOff < clusterEnd) {
      const childId = readVint(bytes, innerOff, true);
      if (!childId) break;
      const childSize = readVint(bytes, innerOff + childId.length, false);
      if (!childSize || childSize.isUnknown) break;

      const childDataOff = innerOff + childId.length + childSize.length;
      if (childDataOff + childSize.value > bytes.length) break;

      if (childId.value === EBML_ID.Timestamp) {
        let tc = 0;
        for (let i = 0; i < childSize.value; i++) {
          tc = tc * 256 + bytes[childDataOff + i];
        }
        timestamp = tc;
        maxBlockTimecode = Math.max(maxBlockTimecode, timestamp);
      } else if (childId.value === EBML_ID.SimpleBlock && childSize.value >= 4) {
        // Track number (vint)
        const trackVint = readVint(bytes, childDataOff, false);
        if (trackVint) {
          const relTimeOff = childDataOff + trackVint.length;
          if (relTimeOff + 2 <= bytes.length) {
            const relTime = new DataView(bytes.buffer, bytes.byteOffset + relTimeOff, 2).getInt16(0, false);
            const flags = bytes[relTimeOff + 2];
            const isKey = (flags & 0x80) !== 0;
            if (isKey) {
              keyframeTrack = trackVint.value;
            }
            maxBlockTimecode = Math.max(maxBlockTimecode, timestamp + relTime);
          }
        }
      }
      innerOff = childDataOff + childSize.value;
    }

    clusters.push({
      offset: clusterOffset,
      timestamp,
      maxBlockTimecode: Math.max(maxBlockTimecode, timestamp),
      keyframeTrack,
      size: clusterEnd - clusterOffset,
    });

    offset = clusterEnd;
  }

  return clusters;
}

/**
 * Calculates total media duration in cluster TimecodeScale ticks.
 */
export function calculateDurationFromClusters(clusters: ClusterInfo[]): number {
  if (clusters.length === 0) return 0;
  let maxTime = 0;
  for (const c of clusters) {
    if (c.maxBlockTimecode > maxTime) {
      maxTime = c.maxBlockTimecode;
    }
  }
  return maxTime;
}

/**
 * Generates an EBML Cues element from a list of scanned clusters.
 */
export function generateCues(
  clusters: ClusterInfo[],
  segmentContentStartPos: number,
  trackNumber = 1
): Uint8Array {
  const cuePoints: Uint8Array[] = [];

  for (const cluster of clusters) {
    const cueTrackPos = createMasterElement(EBML_ID.CueTrackPositions, [
      createUIntElement(EBML_ID.CueTrack, cluster.keyframeTrack || trackNumber),
      createUIntElement(
        EBML_ID.CueClusterPosition,
        Math.max(0, cluster.offset - segmentContentStartPos)
      ),
    ]);

    const cuePoint = createMasterElement(EBML_ID.CuePoint, [
      createUIntElement(EBML_ID.CueTime, cluster.timestamp),
      cueTrackPos,
    ]);
    cuePoints.push(cuePoint);
  }

  return createMasterElement(EBML_ID.Cues, cuePoints);
}

/**
 * Generates an EBML SeekHead element indexing Info, Tracks, and Cues.
 */
export function generateSeekHead(
  infoPos: number,
  tracksPos: number,
  cuesPos: number
): Uint8Array {
  function makeSeek(id: number, pos: number) {
    const idBytes = encodeId(id);
    const seekIdElem = createRawElement(EBML_ID.SeekID, idBytes);
    const seekPosElem = createUIntElement(EBML_ID.SeekPosition, pos);
    return createMasterElement(EBML_ID.Seek, [seekIdElem, seekPosElem]);
  }

  return createMasterElement(EBML_ID.SeekHead, [
    makeSeek(EBML_ID.Info, infoPos),
    makeSeek(EBML_ID.Tracks, tracksPos),
    makeSeek(EBML_ID.Cues, cuesPos),
  ]);
}

/**
 * Patches a WebM buffer with exact Duration, SeekHead, and Cues.
 * Produces a durable, fully seekable WebM file compatible with standard HTML5 media players.
 */
export function patchWebMWithDurationAndCues(
  source: Uint8Array,
  knownDurationMs?: number
): Uint8Array {
  const inspection = inspectWebM(source);
  if (!inspection.hasEBMLHeader || !inspection.hasSegment) {
    throw new Error('Invalid WebM data: missing EBML Header or Segment element');
  }

  const clusters = scanClusters(source);
  if (clusters.length === 0) {
    return source; // No media clusters to patch
  }

  const scaleRatio = inspection.timecodeScale / 1000000;
  const durationTicks =
    knownDurationMs !== undefined && knownDurationMs > 0
      ? Math.round(knownDurationMs / scaleRatio)
      : calculateDurationFromClusters(clusters);

  // 1. Extract EBML Header bytes
  const ebmlHeaderBytes = source.subarray(0, inspection.ebmlHeaderSize);

  // 2. Extract Info and Tracks elements from original source
  let infoBytes: Uint8Array | null = null;
  let tracksBytes: Uint8Array | null = null;

  let offset = inspection.segmentContentStartPos;
  while (offset < source.length && offset < clusters[0].offset) {
    const elemId = readVint(source, offset, true);
    if (!elemId) break;
    const elemSize = readVint(source, offset + elemId.length, false);
    if (!elemSize) break;
    const totalElemLen = elemId.length + elemSize.length + elemSize.value;

    if (elemId.value === EBML_ID.Info) {
      infoBytes = source.subarray(offset, offset + totalElemLen);
    } else if (elemId.value === EBML_ID.Tracks) {
      tracksBytes = source.subarray(offset, offset + totalElemLen);
    }
    offset += totalElemLen;
  }

  // Construct patched Info element with injected Float64 Duration in TimecodeScale units
  const infoChildren: Uint8Array[] = [
    createUIntElement(EBML_ID.TimecodeScale, inspection.timecodeScale),
    createFloatElement(EBML_ID.Duration, durationTicks),
  ];
  if (infoBytes) {
    // Preserve other Info fields (e.g. MuxingApp, WritingApp) while skipping existing TimecodeScale / Duration
    const infoId = readVint(infoBytes, 0, true);
    const infoSize = readVint(infoBytes, infoId?.length || 0, false);
    if (infoId && infoSize) {
      let cur = (infoId.length + infoSize.length);
      while (cur < infoBytes.length) {
        const subId = readVint(infoBytes, cur, true);
        if (!subId) break;
        const subSize = readVint(infoBytes, cur + subId.length, false);
        if (!subSize) break;
        const subTotal = subId.length + subSize.length + subSize.value;
        if (
          subId.value !== EBML_ID.TimecodeScale &&
          subId.value !== EBML_ID.Duration
        ) {
          infoChildren.push(infoBytes.subarray(cur, cur + subTotal));
        }
        cur += subTotal;
      }
    }
  }
  const newInfo = createMasterElement(EBML_ID.Info, infoChildren);

  // Fallback tracks if missing
  const newTracks =
    tracksBytes ||
    createMasterElement(EBML_ID.Tracks, [
      createMasterElement(EBML_ID.TrackEntry, [
        createUIntElement(EBML_ID.TrackNumber, 1),
        createUIntElement(EBML_ID.TrackType, 1),
        createStringElement(EBML_ID.CodecID, 'V_VP8'),
      ]),
    ]);

  // Segment open tag: 4 bytes ID + 8 bytes unknown length (0x01FFFFFFFFFFFFFF)
  const segmentHeader = new Uint8Array([
    0x18, 0x53, 0x80, 0x67,
    0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
  ]);
  const segContentStart = ebmlHeaderBytes.length + segmentHeader.length;

  // Initial estimations for convergence of SeekHead and Cues
  let seekHeadSize = 55;
  let cuesSize = 5 + clusters.length * 15;
  let cues: Uint8Array = new Uint8Array(0);
  let seekHead: Uint8Array = new Uint8Array(0);

  // Converge offsets
  for (let iter = 0; iter < 10; iter++) {
    const infoPos = seekHeadSize;
    const tracksPos = infoPos + newInfo.length;
    const cuesPos = tracksPos + newTracks.length;
    const newHeaderSize = segContentStart + cuesPos + cuesSize;

    // Adjust cluster offsets relative to the new header start
    const originalFirstCluster = clusters[0].offset;
    const adjustedClusters: ClusterInfo[] = clusters.map((c) => ({
      ...c,
      offset: newHeaderSize + (c.offset - originalFirstCluster),
    }));

    cues = generateCues(adjustedClusters, segContentStart);
    seekHead = generateSeekHead(infoPos, tracksPos, cuesPos);

    if (seekHead.length === seekHeadSize && cues.length === cuesSize) {
      break;
    }
    seekHeadSize = seekHead.length;
    cuesSize = cues.length;
  }

  // 3. Assemble Final Patched WebM
  const clusterDataStart = clusters[0].offset;
  // If the last cluster was truncated / cut short, we bound the valid cluster bytes
  const lastCluster = clusters[clusters.length - 1];
  const clusterDataEnd = lastCluster.offset + lastCluster.size;
  const rawClustersData = source.subarray(clusterDataStart, clusterDataEnd);

  const totalLength =
    ebmlHeaderBytes.length +
    segmentHeader.length +
    seekHead.length +
    newInfo.length +
    newTracks.length +
    cues.length +
    rawClustersData.length;

  const result = new Uint8Array(totalLength);
  let pos = 0;
  result.set(ebmlHeaderBytes, pos);
  pos += ebmlHeaderBytes.length;
  result.set(segmentHeader, pos);
  pos += segmentHeader.length;
  result.set(seekHead, pos);
  pos += seekHead.length;
  result.set(newInfo, pos);
  pos += newInfo.length;
  result.set(newTracks, pos);
  pos += newTracks.length;
  result.set(cues, pos);
  pos += cues.length;
  result.set(rawClustersData, pos);

  return result;
}
