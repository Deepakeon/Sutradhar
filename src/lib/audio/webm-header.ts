/**
 * WebM / Matroska EBML and Cluster detection & header reconstruction utilities.
 *
 * MediaRecorder with timeslice emits the EBML header + tracks in slice 0,
 * but subsequent slices (slice 1, 2, 3...) contain only raw Cluster data
 * without container metadata. Cloudinary / FFmpeg requires container headers
 * to process and transcode independent chunks.
 */

export const WEBM_EBML_ID = [0x1a, 0x45, 0xdf, 0xa3];
export const WEBM_CLUSTER_ID = [0x1f, 0x43, 0xb6, 0x75];

/**
 * Checks whether the buffer starts with the standard EBML ID (0x1A 0x45 0xDF 0xA3).
 */
export function isWebMHeader(bytes: Uint8Array | Buffer): boolean {
  if (!bytes || bytes.length < 4) return false;
  return (
    bytes[0] === WEBM_EBML_ID[0] &&
    bytes[1] === WEBM_EBML_ID[1] &&
    bytes[2] === WEBM_EBML_ID[2] &&
    bytes[3] === WEBM_EBML_ID[3]
  );
}

/**
 * Finds the index of the first WebM Cluster (0x1F 0x43 0xB6 0x75).
 * Everything preceding this index constitutes the EBML, Segment, and Track headers.
 */
export function findWebMClusterIndex(bytes: Uint8Array | Buffer): number {
  if (!bytes || bytes.length < 4) return -1;
  const limit = bytes.length - 4;
  for (let i = 0; i <= limit; i++) {
    if (
      bytes[i] === WEBM_CLUSTER_ID[0] &&
      bytes[i + 1] === WEBM_CLUSTER_ID[1] &&
      bytes[i + 2] === WEBM_CLUSTER_ID[2] &&
      bytes[i + 3] === WEBM_CLUSTER_ID[3]
    ) {
      return i;
    }
  }
  return -1;
}

/**
 * Extracts the EBML header and Track metadata from a WebM chunk (chunk 0).
 */
export function extractWebMHeader(buffer: Uint8Array | Buffer<any>): Buffer<any> | null {
  if (!isWebMHeader(buffer)) return null;
  const clusterIdx = findWebMClusterIndex(buffer);
  if (clusterIdx > 0) {
    return Buffer.from(buffer.subarray(0, clusterIdx));
  }
  return null;
}

/**
 * Ensures a chunk buffer has a valid WebM container header.
 * If the chunk is headerless and a header is provided, prepends the header.
 */
export function ensureWebMHeader(chunkBuffer: Buffer<any>, headerBuffer?: Buffer<any> | null): Buffer<any> {
  if (isWebMHeader(chunkBuffer)) {
    return chunkBuffer;
  }
  if (headerBuffer && headerBuffer.length > 0) {
    return Buffer.concat([headerBuffer, chunkBuffer]);
  }
  return chunkBuffer;
}
