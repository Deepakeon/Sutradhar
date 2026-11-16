/**
 * EBML / WebM duration parser, cluster scanner, and duration injector.
 *
 * MediaRecorder streams output WebM files with unknown Segment Duration (0xFF)
 * and without duration elements, which causes HTML5 <video> elements to show NaN/Infinity
 * duration and prevents seeking. This utility scans Cluster timestamps and patches/injects
 * duration into the Segment Info element so videos are fully seekable.
 */

export const EBML_ID = [0x1a, 0x45, 0xdf, 0xa3];
export const SEGMENT_ID = [0x18, 0x53, 0x80, 0x67];
export const INFO_ID = [0x15, 0x49, 0xa9, 0x66];
export const DURATION_ID = [0x44, 0x89];
export const TIMECODE_SCALE_ID = [0x2a, 0xd7, 0xb1];
export const CLUSTER_ID = [0x1f, 0x43, 0xb6, 0x75];
export const CLUSTER_TIMECODE_ID = [0xe7];

/**
 * Reads variable-size integer (VINT) starting at offset.
 * Returns { value, length } where length is the total number of bytes consumed.
 */
export function readVint(
  buffer: Uint8Array,
  offset: number
): { value: number; length: number } | null {
  if (offset >= buffer.length) return null;
  const firstByte = buffer[offset];
  if (firstByte === 0) return null;

  let length = 1;
  let mask = 0x80;
  while ((firstByte & mask) === 0 && length <= 8) {
    mask >>= 1;
    length++;
  }

  if (length > 8 || offset + length > buffer.length) return null;

  let value = firstByte & (mask - 1);
  for (let i = 1; i < length; i++) {
    value = (value << 8) | buffer[offset + i];
  }

  // Check if unknown size (all 1s)
  const isUnknown = (firstByte & (mask - 1)) === (mask - 1) &&
    Array.from(buffer.subarray(offset + 1, offset + length)).every((b) => b === 0xff);

  return { value: isUnknown ? -1 : value, length };
}

/**
 * Searches for a byte sequence in a buffer.
 */
export function findSequence(
  buffer: Uint8Array,
  sequence: number[],
  startOffset = 0,
  maxOffset = buffer.length
): number {
  const seqLen = sequence.length;
  const limit = Math.min(buffer.length, maxOffset) - seqLen;
  for (let i = startOffset; i <= limit; i++) {
    let match = true;
    for (let j = 0; j < seqLen; j++) {
      if (buffer[i + j] !== sequence[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

/**
 * Reads the existing Segment Duration from EBML buffer if present.
 */
export function readEBMLDuration(buffer: Uint8Array): number | null {
  const infoIdx = findSequence(buffer, INFO_ID);
  if (infoIdx === -1) return null;

  const infoSizeOffset = infoIdx + INFO_ID.length;
  const infoVint = readVint(buffer, infoSizeOffset);
  if (!infoVint) return null;

  const infoPayloadStart = infoSizeOffset + infoVint.length;
  const infoPayloadEnd = infoVint.value >= 0 ? infoPayloadStart + infoVint.value : buffer.length;

  const durationIdx = findSequence(buffer, DURATION_ID, infoPayloadStart, infoPayloadEnd);
  if (durationIdx === -1) return null;

  const durationSizeOffset = durationIdx + DURATION_ID.length;
  const durationVint = readVint(buffer, durationSizeOffset);
  if (!durationVint) return null;

  const durationValStart = durationSizeOffset + durationVint.length;
  const view = new DataView(buffer.buffer, buffer.byteOffset + durationValStart, durationVint.value);

  if (durationVint.value === 4) {
    return view.getFloat32(0, false);
  } else if (durationVint.value === 8) {
    return view.getFloat64(0, false);
  }

  return null;
}

/**
 * Scans all WebM Clusters to find the maximum timestamp in milliseconds.
 */
export function findMaxClusterTimestamp(buffer: Uint8Array): {
  maxTimestampMs: number;
  clusterCount: number;
  clusterOffsets: number[];
} {
  let maxTimestampMs = 0;
  let clusterCount = 0;
  const clusterOffsets: number[] = [];

  let searchOffset = 0;
  while (searchOffset < buffer.length - 4) {
    const clusterIdx = findSequence(buffer, CLUSTER_ID, searchOffset);
    if (clusterIdx === -1) break;

    clusterOffsets.push(clusterIdx);
    clusterCount++;

    const sizeOffset = clusterIdx + CLUSTER_ID.length;
    const clusterVint = readVint(buffer, sizeOffset);
    const clusterPayloadStart = sizeOffset + (clusterVint ? clusterVint.length : 1);
    const clusterPayloadLimit = Math.min(
      buffer.length,
      clusterVint && clusterVint.value >= 0 ? clusterPayloadStart + clusterVint.value : clusterPayloadStart + 4000
    );

    // Look for Cluster Timecode (0xE7) within the first 64 bytes of cluster payload
    const timecodeIdx = findSequence(
      buffer,
      CLUSTER_TIMECODE_ID,
      clusterPayloadStart,
      Math.min(clusterPayloadLimit, clusterPayloadStart + 64)
    );

    if (timecodeIdx !== -1) {
      const tcSizeOffset = timecodeIdx + CLUSTER_TIMECODE_ID.length;
      const tcVint = readVint(buffer, tcSizeOffset);
      if (tcVint && tcVint.value > 0) {
        const tcValOffset = tcSizeOffset + tcVint.length;
        let ts = 0;
        for (let i = 0; i < tcVint.value; i++) {
          ts = (ts << 8) | buffer[tcValOffset + i];
        }
        if (ts > maxTimestampMs) {
          maxTimestampMs = ts;
        }
      }
    }

    searchOffset = clusterIdx + CLUSTER_ID.length;
  }

  return { maxTimestampMs, clusterCount, clusterOffsets };
}

/**
 * Patches or injects duration into a WebM buffer.
 */
export function patchWebMDuration(buffer: Uint8Array, durationMs?: number): Uint8Array {
  const targetDuration =
    durationMs !== undefined && durationMs > 0
      ? durationMs
      : findMaxClusterTimestamp(buffer).maxTimestampMs;

  const infoIdx = findSequence(buffer, INFO_ID);
  if (infoIdx === -1) {
    return buffer;
  }

  const infoSizeOffset = infoIdx + INFO_ID.length;
  const infoVint = readVint(buffer, infoSizeOffset);
  if (!infoVint) return buffer;

  const infoPayloadStart = infoSizeOffset + infoVint.length;
  const infoPayloadEnd = infoVint.value >= 0 ? infoPayloadStart + infoVint.value : buffer.length;

  const durationIdx = findSequence(buffer, DURATION_ID, infoPayloadStart, infoPayloadEnd);
  if (durationIdx !== -1) {
    // Modify in-place
    const durationSizeOffset = durationIdx + DURATION_ID.length;
    const durationVint = readVint(buffer, durationSizeOffset);
    if (durationVint) {
      const durationValStart = durationSizeOffset + durationVint.length;
      const view = new DataView(buffer.buffer, buffer.byteOffset + durationValStart, durationVint.value);
      if (durationVint.value === 4) {
        view.setFloat32(0, targetDuration, false);
      } else if (durationVint.value === 8) {
        view.setFloat64(0, targetDuration, false);
      }
      return buffer;
    }
  }

  // Not found in Info -> Inject Duration element
  return injectEBMLDuration(buffer, targetDuration);
}

/**
 * Injects a 4-byte float32 Duration element into the Segment Info element.
 */
export function injectEBMLDuration(buffer: Uint8Array, durationMs: number): Uint8Array {
  const infoIdx = findSequence(buffer, INFO_ID);
  if (infoIdx === -1) return buffer;

  const infoSizeOffset = infoIdx + INFO_ID.length;
  const infoVint = readVint(buffer, infoSizeOffset);
  if (!infoVint) return buffer;

  const infoPayloadStart = infoSizeOffset + infoVint.length;

  // Duration element to inject: ID 0x44 0x89, size 0x84, float32 big-endian
  const durationElement = new Uint8Array(2 + 1 + 4);
  durationElement[0] = 0x44;
  durationElement[1] = 0x89;
  durationElement[2] = 0x84; // 1-byte length with 0x80 marker for size 4
  const view = new DataView(durationElement.buffer, 3, 4);
  view.setFloat32(0, durationMs, false);

  // If info size is specified, we must update info size by +7 bytes
  const hasFixedInfoSize = infoVint.value >= 0;
  const newInfoSize = hasFixedInfoSize ? infoVint.value + durationElement.length : -1;

  // Build new buffer
  let newInfoVintBytes: number[];
  if (hasFixedInfoSize) {
    // Encode newInfoSize as VINT
    if (newInfoSize < 0x7f) {
      newInfoVintBytes = [0x80 | newInfoSize];
    } else {
      newInfoVintBytes = [0x40 | ((newInfoSize >> 8) & 0x3f), newInfoSize & 0xff];
    }
  } else {
    newInfoVintBytes = Array.from(buffer.subarray(infoSizeOffset, infoPayloadStart));
  }

  const beforeInfo = buffer.subarray(0, infoIdx + INFO_ID.length);
  const afterInfoStart = buffer.subarray(infoPayloadStart);

  const totalLength =
    beforeInfo.length + newInfoVintBytes.length + durationElement.length + afterInfoStart.length;
  const result = new Uint8Array(totalLength);

  let pos = 0;
  result.set(beforeInfo, pos);
  pos += beforeInfo.length;

  result.set(new Uint8Array(newInfoVintBytes), pos);
  pos += newInfoVintBytes.length;

  result.set(durationElement, pos);
  pos += durationElement.length;

  result.set(afterInfoStart, pos);

  return result;
}
