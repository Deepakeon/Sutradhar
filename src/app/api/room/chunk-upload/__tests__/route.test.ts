// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { createClient } from '@/lib/supabase/server';
import { uploadAudioChunk } from '@/lib/cloudinary';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/cloudinary', () => ({
  uploadAudioChunk: vi.fn(),
}));

describe('POST /api/room/chunk-upload', () => {
  const mockUser = { id: 'user-cand-123' };
  const mockInterview = {
    id: 'interview-123',
    candidate_id: 'user-cand-123',
    interviewer_id: 'user-int-456',
    total_chunks: 2,
    session_started_at: null,
  };

  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      schema: vi.fn().mockReturnThis(),
      from: vi.fn((table: string) => {
        if (table === 'interviews') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockInterview, error: null }),
            update: vi.fn().mockReturnThis(),
          };
        }
        if (table === 'interview_chunks') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 1 }),
            }),
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'chunk-uuid-1',
                    interview_id: 'interview-123',
                    profile_id: 'user-cand-123',
                    role: 'candidate',
                    chunk_index: 0,
                    cloudinary_public_id: 'sutradhar/interviews/interview-123/candidate/chunk_0_0',
                    cloudinary_url: 'https://cloudinary.com/chunk_0_0.webm',
                    duration_seconds: 10,
                    start_offset_ms: 0,
                    end_offset_ms: 10000,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase);
    vi.mocked(uploadAudioChunk).mockResolvedValue({
      public_id: 'sutradhar/interviews/interview-123/candidate/chunk_0_0',
      secure_url: 'https://cloudinary.com/chunk_0_0.webm',
      duration: 10,
    });
  });

  it('returns 401 when user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('No session') });

    const formData = new FormData();
    const req = new Request('http://localhost:3000/api/room/chunk-upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 400 when required metadata or audio is missing', async () => {
    const formData = new FormData();
    formData.append('interview_id', 'interview-123');
    // Missing audio blob and other fields

    const req = new Request('http://localhost:3000/api/room/chunk-upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Missing required/i);
  });

  it('returns 403 when user is neither candidate nor interviewer', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'unauthorized-intruder' } },
      error: null,
    });

    const formData = new FormData();
    const file = new File(['audio-data'], 'chunk.webm', { type: 'audio/webm' });
    formData.append('audio', file);
    formData.append('interview_id', 'interview-123');
    formData.append('role', 'candidate');
    formData.append('chunk_index', '0');
    formData.append('start_offset_ms', '0');

    const req = new Request('http://localhost:3000/api/room/chunk-upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/Access Denied/i);
  });

  it('returns 403 when user role mismatches their assigned interview role', async () => {
    // mockUser is candidate ('user-cand-123') but claims to be 'interviewer'
    const formData = new FormData();
    const file = new File(['audio-data'], 'chunk.webm', { type: 'audio/webm' });
    formData.append('audio', file);
    formData.append('interview_id', 'interview-123');
    formData.append('role', 'interviewer');
    formData.append('chunk_index', '0');
    formData.append('start_offset_ms', '0');

    const req = new Request('http://localhost:3000/api/room/chunk-upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/profile role mismatch/i);
  });

  it('successfully uploads audio chunk, saves to interview_chunks, and updates interviews table', async () => {
    const formData = new FormData();
    const file = new File(['sample-audio-data'], 'chunk.webm', { type: 'audio/webm;codecs=opus' });
    formData.append('audio', file);
    formData.append('interview_id', 'interview-123');
    formData.append('role', 'candidate');
    formData.append('chunk_index', '0');
    formData.append('start_offset_ms', '0');
    formData.append('end_offset_ms', '10000');

    const req = new Request('http://localhost:3000/api/room/chunk-upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.chunk).toBeDefined();
    expect(json.chunk.cloudinary_public_id).toBe('sutradhar/interviews/interview-123/candidate/chunk_0_0');

    // Verify Cloudinary was called
    expect(uploadAudioChunk).toHaveBeenCalledWith(
      expect.objectContaining({
        interviewId: 'interview-123',
        role: 'candidate',
        chunkIndex: 0,
        startOffsetMs: 0,
      })
    );

    // Verify Supabase schema private was queried
    expect(mockSupabase.schema).toHaveBeenCalledWith('private');
  });
});
