import { describe, it, expect } from 'vitest';
import {
  findMaxClusterTimestamp,
  patchWebMDuration,
  injectEBMLDuration,
  readEBMLDuration,
} from '../ebml-patcher';

describe('EBML Patcher', () => {
  // Helper to build a minimal synthetic WebM container with an EBML header, Segment Info, and Clusters
  function createSyntheticWebM(options: {
    durationInInfo?: number;
    clusterTimestamps?: number[];
  }): Uint8Array {
    const parts: number[] = [];

    // EBML Header: ID 0x1A 0x45 0xDF 0xA3, size 0x05, DocType 'webm'
    parts.push(0x1a, 0x45, 0xdf, 0xa3);
    parts.push(0x85); // 1-byte size: 5 bytes follow
    parts.push(0x42, 0x82, 0x84, 0x77, 0x65); // DocType

    // Segment: ID 0x18 0x53 0x80 0x67, size unknown (0xFF)
    parts.push(0x18, 0x53, 0x80, 0x67);
    parts.push(0xff);

    // Segment Info: ID 0x15 0x49 0xA9 0x66
    const infoPayload: number[] = [];
    // TimecodeScale: ID 0x2A 0xD7 0xB1, size 3, val 1000000 (0x0F4240)
    infoPayload.push(0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40);

    if (options.durationInInfo !== undefined) {
      // Duration element: ID 0x44 0x89, size 4 (float32)
      infoPayload.push(0x44, 0x89, 0x84);
      const floatView = new DataView(new ArrayBuffer(4));
      floatView.setFloat32(0, options.durationInInfo, false); // big-endian
      for (let i = 0; i < 4; i++) {
        infoPayload.push(floatView.getUint8(i));
      }
    }

    parts.push(0x15, 0x49, 0xa9, 0x66);
    parts.push(0x80 | infoPayload.length); // size of Info
    parts.push(...infoPayload);

    // Add Clusters
    if (options.clusterTimestamps && options.clusterTimestamps.length > 0) {
      for (const ts of options.clusterTimestamps) {
        // Cluster: ID 0x1F 0x43 0xB6 0x75
        const clusterPayload: number[] = [];
        // Timestamp: ID 0xE7, size 2 (uint16)
        clusterPayload.push(0xe7, 0x82, (ts >> 8) & 0xff, ts & 0xff);
        // Dummy data
        clusterPayload.push(0xa3, 0x82, 0x01, 0x02);

        parts.push(0x1f, 0x43, 0xb6, 0x75);
        parts.push(0x80 | clusterPayload.length);
        parts.push(...clusterPayload);
      }
    }

    return new Uint8Array(parts);
  }

  it('reads existing duration if present in Info', () => {
    const webm = createSyntheticWebM({ durationInInfo: 12500 });
    const duration = readEBMLDuration(webm);
    expect(duration).toBeCloseTo(12500, 1);
  });

  it('returns null if duration is not present in Info', () => {
    const webm = createSyntheticWebM({});
    const duration = readEBMLDuration(webm);
    expect(duration).toBeNull();
  });

  it('finds maximum cluster timestamp across all clusters', () => {
    const webm = createSyntheticWebM({
      clusterTimestamps: [0, 3000, 6500, 10200],
    });
    const { maxTimestampMs, clusterCount } = findMaxClusterTimestamp(webm);
    expect(maxTimestampMs).toBe(10200);
    expect(clusterCount).toBe(4);
  });

  it('patches duration into an existing Duration element', () => {
    const webm = createSyntheticWebM({
      durationInInfo: 0,
      clusterTimestamps: [0, 5000, 15000],
    });

    const patched = patchWebMDuration(webm, 15000);
    const duration = readEBMLDuration(patched);
    expect(duration).toBeCloseTo(15000, 1);
  });

  it('injects duration into Segment Info if Duration element is missing', () => {
    const webm = createSyntheticWebM({
      clusterTimestamps: [0, 4000, 8500],
    });
    expect(readEBMLDuration(webm)).toBeNull();

    const patched = injectEBMLDuration(webm, 8500);
    const duration = readEBMLDuration(patched);
    expect(duration).toBeCloseTo(8500, 1);
  });

  it('automatically calculates and patches duration from clusters if durationMs omitted', () => {
    const webm = createSyntheticWebM({
      clusterTimestamps: [1000, 4000, 12000],
    });
    const patched = patchWebMDuration(webm);
    const duration = readEBMLDuration(patched);
    expect(duration).toBeCloseTo(12000, 1);
  });
});
