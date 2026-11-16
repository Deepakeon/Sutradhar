import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { InterviewReviewModal } from '../interview-review-modal';
import * as opfs from '@/lib/opfs/recording-storage';

vi.mock('@/lib/opfs/recording-storage', () => ({
  getRecordingFile: vi.fn(),
  getRecordingMetadata: vi.fn(),
  deleteRecording: vi.fn().mockResolvedValue(true),
  getTranscript: vi.fn().mockResolvedValue(null),
  saveTranscript: vi.fn().mockResolvedValue(undefined),
}));

describe('InterviewReviewModal Component', () => {
  const mockFile = new File(['mock video bytes'], 'recording.webm', { type: 'video/webm' });
  const mockClose = vi.fn();
  const mockDeleted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (opfs.getRecordingFile as any).mockResolvedValue(mockFile);
    (opfs.getRecordingMetadata as any).mockResolvedValue({
      interviewId: 'modal-test-1',
      status: 'finalized',
      durationMs: 12000,
      byteLength: 2048,
    });

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:http://localhost/mock-video-url'),
      revokeObjectURL: vi.fn(),
    });
  });

  it('renders video element loaded from OPFS', async () => {
    render(
      <InterviewReviewModal
        interviewId="modal-test-1"
        interviewTitle="Frontend Architecture Interview"
        isOpen={true}
        onClose={mockClose}
        onDeleted={mockDeleted}
      />
    );

    await waitFor(() => {
      const video = screen.getByTestId('interview-video-player') as HTMLVideoElement;
      expect(video).toBeInTheDocument();
      expect(video.src).toContain('blob:http://localhost/mock-video-url');
    });

    expect(screen.getByText('Frontend Architecture Interview')).toBeInTheDocument();
  });

  it('provides a Download Video button with download attribute', async () => {
    render(
      <InterviewReviewModal
        interviewId="modal-test-1"
        interviewTitle="Frontend Architecture Interview"
        isOpen={true}
        onClose={mockClose}
        onDeleted={mockDeleted}
      />
    );

    await waitFor(() => {
      const downloadBtn = screen.getByRole('link', { name: /Download Video/i });
      expect(downloadBtn).toHaveAttribute('href', 'blob:http://localhost/mock-video-url');
      expect(downloadBtn).toHaveAttribute('download', 'interview-modal-test-1-recording.webm');
    });
  });

  it('confirms and executes recording deletion from OPFS', async () => {
    render(
      <InterviewReviewModal
        interviewId="modal-test-1"
        interviewTitle="Frontend Architecture Interview"
        isOpen={true}
        onClose={mockClose}
        onDeleted={mockDeleted}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Delete Recording/i })).toBeInTheDocument();
    });

    // Click delete
    fireEvent.click(screen.getByRole('button', { name: /Delete Recording/i }));

    // Shows confirmation prompt
    expect(screen.getByText(/Are you sure you want to delete this recording/i)).toBeInTheDocument();

    // Confirm deletion
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirm Delete/i }));
    });

    expect(opfs.deleteRecording).toHaveBeenCalledWith('modal-test-1');
    expect(mockDeleted).toHaveBeenCalled();
  });

  it('renders interactive transcript and seeks video player when clicking timestamp', async () => {
    const existingTranscript = {
      interviewId: 'modal-test-1',
      segments: [
        { start: 3.5, end: 6.0, text: 'I designed the client-side state machine.' },
        { start: 7.2, end: 11.5, text: 'Then we added OPFS durability.' },
      ],
      text: 'I designed the client-side state machine. Then we added OPFS durability.',
      createdAt: new Date().toISOString(),
      model: 'whisper-base',
    };
    (opfs.getTranscript as any).mockResolvedValue(existingTranscript);

    render(
      <InterviewReviewModal
        interviewId="modal-test-1"
        interviewTitle="Frontend Architecture Interview"
        isOpen={true}
        onClose={mockClose}
        onDeleted={mockDeleted}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('I designed the client-side state machine.')).toBeInTheDocument();
      expect(screen.getByText('Then we added OPFS durability.')).toBeInTheDocument();
    });

    const video = screen.getByTestId('interview-video-player') as HTMLVideoElement;
    video.currentTime = 0;

    // Click segment button to seek
    const segmentBtn = screen.getByRole('button', { name: /00:03/i });
    fireEvent.click(segmentBtn);

    expect(video.currentTime).toBe(3.5);
  });
});
