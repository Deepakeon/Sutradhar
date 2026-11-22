import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoomLoading } from '../room-loading';
import { RoomError } from '../room-error';
import { RoomCallEnded, RoomEnded } from '../room-call-ended';

describe('Generic Room State Components', () => {
  describe('RoomLoading', () => {
    it('renders with default message', () => {
      render(<RoomLoading />);
      expect(screen.getByText('Connecting to Interview Room...')).toBeInTheDocument();
    });

    it('renders with custom message and className', () => {
      const { container } = render(
        <RoomLoading message="Please wait for setup..." className="custom-loading-class" />
      );
      expect(screen.getByText('Please wait for setup...')).toBeInTheDocument();
      expect(container.firstChild).toHaveClass('custom-loading-class');
    });
  });

  describe('RoomError', () => {
    it('renders with defaults when no props passed', () => {
      render(<RoomError />);
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
      expect(screen.getByText('Unable to join call room')).toBeInTheDocument();
    });

    it('renders custom title, message and triggers onAction callback', () => {
      const handleAction = vi.fn();
      render(
        <RoomError
          title="Meeting Expired"
          message="This session has passed."
          action={{
            label: 'Go Home',
            onAction: handleAction,
          }}
        />
      );

      expect(screen.getByText('Meeting Expired')).toBeInTheDocument();
      expect(screen.getByText('This session has passed.')).toBeInTheDocument();
      const actionButton = screen.getByRole('button', { name: 'Go Home' });
      expect(actionButton).toBeInTheDocument();

      fireEvent.click(actionButton);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('RoomCallEnded / RoomEnded', () => {
    it('renders default content and triggers action button', () => {
      const handleAction = vi.fn();
      render(
        <RoomCallEnded
          action={{
            label: 'Back to Dashboard',
            onAction: handleAction,
          }}
        />
      );

      expect(screen.getByText('Interview Session Concluded')).toBeInTheDocument();
      expect(
        screen.getByText('The session has ended. All audio chunks were securely streamed.')
      ).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();

      const btn = screen.getByRole('button', { name: 'Back to Dashboard' });
      fireEvent.click(btn);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('renders chunks count and finalizing state when isFinalizing is true', () => {
      render(
        <RoomEnded
          uploadedChunksCount={12}
          isFinalizing={true}
        />
      );

      expect(screen.getByText('12 uploaded')).toBeInTheDocument();
      expect(screen.getByText('Assembling master recording...')).toBeInTheDocument();
      expect(screen.queryByText(/Listen to Recording/i)).not.toBeInTheDocument();
    });

    it('renders master recording link when finalized', () => {
      render(
        <RoomCallEnded
          uploadedChunksCount={5}
          isFinalizing={false}
          masterUrl="https://example.com/recording.webm"
        />
      );

      expect(screen.getByText('5 uploaded')).toBeInTheDocument();
      const link = screen.getByRole('link', { name: /Listen to Recording/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com/recording.webm');
    });
  });
});
