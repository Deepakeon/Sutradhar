import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTranscription } from '../use-transcription';
import * as opfs from '@/lib/opfs/recording-storage';

vi.mock('@/lib/opfs/recording-storage', () => ({
  saveTranscript: vi.fn().mockResolvedValue(undefined),
  getTranscript: vi.fn().mockResolvedValue(null),
}));

// Mock Web Worker
class MockWorker {
  onmessage: ((e: any) => void) | null = null;
  onerror: ((e: any) => void) | null = null;

  postMessage = vi.fn().mockImplementation((data: any) => {
    if (data.type === 'start') {
      // Simulate progress events
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: { type: 'download-progress', progress: 50, loaded: 37500000, total: 75000000 },
          });
        }
      }, 10);

      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: { type: 'transcription-progress', progress: 65 },
          });
        }
      }, 20);

      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: {
              type: 'complete',
              transcript: {
                interviewId: data.interviewId,
                segments: [
                  { start: 0, end: 3.5, text: 'Hello, world!' },
                  { start: 4.0, end: 8.0, text: 'Welcome to Sutradhar.' },
                ],
                text: 'Hello, world! Welcome to Sutradhar.',
                createdAt: new Date().toISOString(),
                model: 'whisper-base',
              },
            },
          });
        }
      }, 30);
    }
  });

  terminate = vi.fn();
}

describe('useTranscription Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('Worker', MockWorker);
  });

  it('loads existing transcript if available in OPFS', async () => {
    const existing = {
      interviewId: 'interview-trans-1',
      segments: [{ start: 0, end: 2.0, text: 'Existing transcript' }],
      text: 'Existing transcript',
      createdAt: '2026-11-15T10:00:00Z',
    };
    (opfs.getTranscript as any).mockResolvedValueOnce(existing);

    const { result } = renderHook(() =>
      useTranscription({ interviewId: 'interview-trans-1' })
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.transcript).toEqual(existing);
    expect(result.current.status).toBe('completed');
  });

  it('transitions through downloading, transcribing, and completed states', async () => {
    const { result } = renderHook(() =>
      useTranscription({ interviewId: 'interview-trans-2' })
    );

    expect(result.current.status).toBe('idle');

    await act(async () => {
      const mockBlob = new Blob(['dummy audio'], { type: 'video/webm' });
      result.current.startTranscription(mockBlob);
    });

    // Wait for worker simulated events
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.status).toBe('completed');
    expect(result.current.transcript).not.toBeNull();
    expect(result.current.transcript?.segments).toHaveLength(2);
    expect(result.current.transcript?.text).toContain('Hello, world!');
    expect(opfs.saveTranscript).toHaveBeenCalledWith(
      'interview-trans-2',
      expect.objectContaining({
        interviewId: 'interview-trans-2',
        text: 'Hello, world! Welcome to Sutradhar.',
      })
    );
  });
});
