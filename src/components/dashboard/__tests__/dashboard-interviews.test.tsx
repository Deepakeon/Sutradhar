import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardInterviews } from '../dashboard-interviews';
import * as opfs from '@/lib/opfs/recording-storage';

vi.mock('@/lib/opfs/recording-storage', () => ({
  recoverAllUnfinalizedRecordings: vi.fn().mockResolvedValue([]),
  listRecordings: vi.fn().mockResolvedValue([]),
  getRecordingFile: vi.fn().mockResolvedValue(null),
  getRecordingMetadata: vi.fn().mockResolvedValue(null),
  deleteRecording: vi.fn().mockResolvedValue(true),
  getTranscript: vi.fn().mockResolvedValue(null),
  saveTranscript: vi.fn().mockResolvedValue(undefined),
}));

describe('DashboardInterviews Component', () => {
  const mockInterviews = [
    {
      id: 'int-1',
      title: 'Distributed Systems Mock',
      status: 'completed' as const,
      role: 'candidate' as const,
      date: '2026-11-15',
    },
    {
      id: 'int-2',
      title: 'Behavioral Leadership Mock',
      status: 'completed' as const,
      role: 'interviewer' as const,
      date: '2026-11-14',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs crash recovery for unfinalized recordings on dashboard load', async () => {
    (opfs.recoverAllUnfinalizedRecordings as any).mockResolvedValueOnce([
      { interviewId: 'int-1', durationMs: 15000 },
    ]);

    render(<DashboardInterviews initialInterviews={mockInterviews} />);

    await waitFor(() => {
      expect(opfs.recoverAllUnfinalizedRecordings).toHaveBeenCalled();
    });
  });

  it('displays recording badge and review button for interviews with local OPFS recordings', async () => {
    (opfs.listRecordings as any).mockResolvedValue([
      {
        interviewId: 'int-1',
        status: 'finalized',
        durationMs: 30000,
        byteLength: 4096,
        chunkCount: 10,
        createdAt: '2026-11-15T12:00:00Z',
        updatedAt: '2026-11-15T12:05:00Z',
      },
    ]);

    render(<DashboardInterviews initialInterviews={mockInterviews} />);

    await waitFor(() => {
      expect(screen.getByText('Distributed Systems Mock')).toBeInTheDocument();
      expect(screen.getByText('Local Recording Ready')).toBeInTheDocument();
    });

    // int-2 does not have local recording
    expect(screen.queryAllByText('Local Recording Ready')).toHaveLength(1);

    // Clicking "Review Recording" opens review modal
    const reviewBtn = screen.getByRole('button', { name: /Review Recording/i });
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Local Recording Review')).toBeInTheDocument();
    });
  });
});
