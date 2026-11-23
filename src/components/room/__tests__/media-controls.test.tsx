import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MediaControls } from '../media-controls';
import { Action } from '@/types';

describe('MediaControls component', () => {
  it('renders actions for mic and camera and handles clicks', () => {
    const handleMicToggle = vi.fn();
    const handleCamToggle = vi.fn();

    const actions: Action[] = [
      {
        id: 'mic',
        label: 'Mute',
        title: 'Mute Microphone',
        enabled: true,
        onAction: handleMicToggle,
      },
      {
        id: 'camera',
        label: 'Camera Off',
        title: 'Turn Camera Off',
        enabled: true,
        onAction: handleCamToggle,
      },
    ];

    render(<MediaControls actions={actions} />);

    // Mic button
    const micButton = screen.getByTitle('Mute Microphone');
    expect(micButton).toBeInTheDocument();
    expect(screen.getByText('Mute')).toBeInTheDocument();
    fireEvent.click(micButton);
    expect(handleMicToggle).toHaveBeenCalledTimes(1);

    // Camera button
    const camButton = screen.getByTitle('Turn Camera Off');
    expect(camButton).toBeInTheDocument();
    expect(screen.getByText('Camera Off')).toBeInTheDocument();
    fireEvent.click(camButton);
    expect(handleCamToggle).toHaveBeenCalledTimes(1);

    // End call is NOT rendered when not sent from outside
    expect(screen.queryByTitle('Leave Interview Call')).not.toBeInTheDocument();
    expect(screen.queryByText('End Call')).not.toBeInTheDocument();
  });

  it('renders disabled states correctly using map aggregate keys', () => {
    const actions: Action[] = [
      {
        id: 'mic',
        enabled: false,
        label: 'Unmute',
        onAction: vi.fn(),
      },
      {
        id: 'camera',
        enabled: false,
        label: 'Camera On',
        onAction: vi.fn(),
      },
    ];

    render(<MediaControls actions={actions} />);

    expect(screen.getByTitle('Unmute Microphone')).toBeInTheDocument();
    expect(screen.getByText('Unmute')).toBeInTheDocument();
    expect(screen.getByTitle('Turn Camera On')).toBeInTheDocument();
    expect(screen.getByText('Camera On')).toBeInTheDocument();
  });

  it('only renders End Call when sent from outside in actions', () => {
    const handleEndCall = vi.fn();
    const actions: Action[] = [
      {
        id: 'end-call',
        label: 'End Call',
        title: 'Leave Interview Call',
        enabled: false,
        onAction: handleEndCall,
      },
    ];

    render(<MediaControls actions={actions} />);

    const endBtn = screen.getByTitle('Leave Interview Call');
    expect(endBtn).toBeInTheDocument();
    expect(screen.getByText('End Call')).toBeInTheDocument();

    fireEvent.click(endBtn);
    expect(handleEndCall).toHaveBeenCalledTimes(1);
  });
});
