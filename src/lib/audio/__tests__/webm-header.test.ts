import { describe, it, expect } from 'vitest';
import {
  isWebMHeader,
  findWebMClusterIndex,
  extractWebMHeader,
  ensureWebMHeader,
  WEBM_EBML_ID,
  WEBM_CLUSTER_ID,
} from '../webm-header';

describe('WebM Header Detection & Reconstruction', () => {
  it('correctly detects WebM EBML header', () => {
    const validHeader = new Uint8Array([...WEBM_EBML_ID, 0x01, 0x02]);
    const invalidHeader = new Uint8Array([0x00, 0x01, 0x02, 0x03]);

    expect(isWebMHeader(validHeader)).toBe(true);
    expect(isWebMHeader(invalidHeader)).toBe(false);
    expect(isWebMHeader(new Uint8Array([]))).toBe(false);
  });

  it('locates first cluster element in buffer', () => {
    const fakeHeader = [0x1a, 0x45, 0xdf, 0xa3, 0xaa, 0xbb];
    const fakeCluster = [...WEBM_CLUSTER_ID, 0x11, 0x22];
    const full = new Uint8Array([...fakeHeader, ...fakeCluster]);

    const clusterIdx = findWebMClusterIndex(full);
    expect(clusterIdx).toBe(fakeHeader.length);
  });

  it('extracts header bytes up to first cluster', () => {
    const fakeHeader = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0xaa, 0xbb]);
    const fakeCluster = Buffer.from([...WEBM_CLUSTER_ID, 0x11, 0x22]);
    const full = Buffer.concat([fakeHeader, fakeCluster]);

    const extracted = extractWebMHeader(full);
    expect(extracted).not.toBeNull();
    expect(extracted).toEqual(fakeHeader);
  });

  it('prepends cached header to headerless continuation chunks', () => {
    const cachedHeader = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x01]);
    const rawClusterChunk = Buffer.from([...WEBM_CLUSTER_ID, 0x99, 0x88]);

    // Chunk without header should be prepended
    const reconstructed = ensureWebMHeader(rawClusterChunk, cachedHeader);
    expect(reconstructed.length).toBe(cachedHeader.length + rawClusterChunk.length);
    expect(isWebMHeader(reconstructed)).toBe(true);

    // Chunk already containing header should remain untouched
    const standaloneChunk = Buffer.from([...WEBM_EBML_ID, 0x10, 0x20]);
    const unchanged = ensureWebMHeader(standaloneChunk, cachedHeader);
    expect(unchanged).toEqual(standaloneChunk);
  });
});
