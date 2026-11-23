import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoAvatarFallback } from '../video-avatar-fallback';
import { VideoBadge } from '../video-badge';
import { AutoplayBanner } from '../autoplay-banner';
import { VideoTile } from '../video-tile';
import { VideoGrid } from '../video-grid';

describe('VideoGrid and subcomponents', () => {
  describe('VideoAvatarFallback', () => {
    it('renders initial monogram and status label with accent styles', () => {
      const { rerender } = render(
        <VideoAvatarFallback initial="c" label="Candidate (Camera Off)" accent="primary" />
      );
      expect(screen.getByText('c')).toBeInTheDocument();
      expect(screen.getByText('Candidate (Camera Off)')).toBeInTheDocument();

      rerender(
        <VideoAvatarFallback initial="i" label="Interviewer (Camera Off)" accent="neutral" />
      );
      expect(screen.getByText('i')).toBeInTheDocument();
    });
  });

  describe('VideoBadge', () => {
    it('renders label without muted tag when isMuted is false', () => {
      render(<VideoBadge label="Candidate" isMuted={false} />);
      expect(screen.getByText('Candidate')).toBeInTheDocument();
      expect(screen.queryByText('MUTED')).not.toBeInTheDocument();
    });

    it('renders label and muted badge with FiMicOff icon when isMuted is true', () => {
      render(<VideoBadge label="Candidate" isMuted={true} />);
      expect(screen.getByText('Candidate')).toBeInTheDocument();
      expect(screen.getByText('MUTED')).toBeInTheDocument();
      expect(screen.getByTitle('Microphone Muted')).toBeInTheDocument();
    });
  });

  describe('AutoplayBanner', () => {
    it('renders unlock button and triggers onUnlock', () => {
      const handleUnlock = vi.fn();
      render(<AutoplayBanner onUnlock={handleUnlock} />);

      const btn = screen.getByRole('button', { name: /Tap to enable partner audio & video/i });
      expect(btn).toBeInTheDocument();

      fireEvent.click(btn);
      expect(handleUnlock).toHaveBeenCalledTimes(1);
    });
  });

  describe('VideoTile', () => {
    it('renders video element, handles fallback and badge slots', () => {
      render(
        <VideoTile
          stream={null}
          isVideoOff={true}
          fallback={<div data-testid="fallback-slot">Fallback Content</div>}
          badge={<div data-testid="badge-slot">Badge Content</div>}
          banner={<div data-testid="banner-slot">Banner Content</div>}
        />
      );

      expect(screen.getByTestId('fallback-slot')).toBeInTheDocument();
      expect(screen.getByTestId('badge-slot')).toBeInTheDocument();
      expect(screen.getByTestId('banner-slot')).toBeInTheDocument();
    });

    it('triggers onClick handler when tile container is clicked', () => {
      const handleClick = vi.fn();
      const { container } = render(
        <VideoTile stream={null} onClick={handleClick} />
      );

      fireEvent.click(container.firstChild as HTMLElement);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('VideoGrid orchestrator', () => {
    it('renders local and remote tiles with proper badges and fallbacks', () => {
      render(
        <VideoGrid
          localStream={null}
          remoteStream={null}
          currentRole="candidate"
          peerProfile={{ id: 'p1', role: 'interviewer', name: 'John Doe' }}
          isMicMuted={true}
          isCameraOff={true}
        />
      );

      expect(screen.getByText('You (candidate)')).toBeInTheDocument();
      expect(screen.getAllByText('interviewer').length).toBe(2);
      expect(screen.getByText('MUTED')).toBeInTheDocument();
      expect(screen.getAllByText(/Camera Off/i).length).toBe(2);
    });
  });
});
