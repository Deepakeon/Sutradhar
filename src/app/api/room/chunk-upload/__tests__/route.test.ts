// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { createClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
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
  let mockUpsert: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUpsert = vi.fn().mockImplementation((payload: any) => ({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'chunk-uuid-1',
            interview_id: payload.interview_id,
            profile_id: payload.profile_id,
            chunk_index: payload.chunk_index,
            storage_path: payload.storage_path,
            chunk_url: payload.chunk_url,
            duration_seconds: payload.duration_seconds,
            start_offset_ms: payload.start_offset_ms,
            end_offset_ms: payload.end_offset_ms,
          },
          error: null,
        }),
      }),
    }));

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
            upsert: mockUpsert,
          };
        }
        return {};
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase);
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

  it('successfully processes audio chunk, saves to interview_chunks, and updates interviews table', async () => {
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
    expect(json.chunk.storage_path).toBe('sutradhar/interviews/interview-123/candidate/chunk_0_0.webm');
    expect(json.chunk.chunk_url).toBe('/api/room/chunks/sutradhar/interviews/interview-123/candidate/chunk_0_0.webm');

    // Verify Supabase schema private was queried
    expect(mockSupabase.schema).toHaveBeenCalledWith('private');
  });

  it('extracts and prepends cached WebM container header for headerless continuation chunks', async () => {
    // 1. Send chunk 0 with EBML header + cluster
    const ebmlHeader = [0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x02];
    const clusterHeader = [0x1f, 0x43, 0xb6, 0x75, 0x03, 0x04];
    const chunk0Bytes = new Uint8Array([...ebmlHeader, ...clusterHeader]);

    const form0 = new FormData();
    form0.append('audio', new Blob([chunk0Bytes]), 'chunk_0.webm');
    form0.append('interview_id', 'interview-123');
    form0.append('role', 'candidate');
    form0.append('chunk_index', '0');
    form0.append('start_offset_ms', '0');
    form0.append('end_offset_ms', '10000');

    const res0 = await POST(new Request('http://localhost:3000/api/room/chunk-upload', { method: 'POST', body: form0 }));
    expect(res0.status).toBe(201);

    // 2. Send chunk 1 with cluster data only (no EBML header)
    const chunk1Bytes = new Uint8Array([...clusterHeader, 0xaa, 0xbb]);
    const form1 = new FormData();
    form1.append('audio', new Blob([chunk1Bytes]), 'chunk_1.webm');
    form1.append('interview_id', 'interview-123');
    form1.append('role', 'candidate');
    form1.append('chunk_index', '1');
    form1.append('start_offset_ms', '10000');
    form1.append('end_offset_ms', '20000');

    const res1 = await POST(new Request('http://localhost:3000/api/room/chunk-upload', { method: 'POST', body: form1 }));
    expect(res1.status).toBe(201);
    const json1 = await res1.json();
    expect(json1.success).toBe(true);
    expect(mockUpsert).toHaveBeenCalledTimes(2);
    expect(mockUpsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        chunk_index: 1,
        start_offset_ms: 10000,
        end_offset_ms: 20000,
        storage_path: 'sutradhar/interviews/interview-123/candidate/chunk_1_10000.webm',
      }),
      expect.any(Object)
    );
  });
});
