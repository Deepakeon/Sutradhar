import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadAudioChunk } from '@/lib/cloudinary';

export async function POST(req: Request | NextRequest) {
  try {
    const supabase = await createClient();

    // Check for Authorization header Bearer token if present
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

    const {
      data: { user },
      error: authError,
    } = await (token ? supabase.auth.getUser(token) : supabase.auth.getUser());

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as Blob | File | null;
    const interviewId = formData.get('interview_id') as string | null;
    const role = formData.get('role') as string | null;
    const chunkIndexStr = formData.get('chunk_index') as string | null;
    const startOffsetMsStr = formData.get('start_offset_ms') as string | null;
    const endOffsetMsStr = formData.get('end_offset_ms') as string | null;

    if (!audioFile || !interviewId || !role || chunkIndexStr == null || startOffsetMsStr == null) {
      return NextResponse.json(
        { error: 'Missing required fields: audio, interview_id, role, chunk_index, or start_offset_ms' },
        { status: 400 }
      );
    }

    if (role !== 'candidate' && role !== 'interviewer') {
      return NextResponse.json(
        { error: 'Invalid role: must be candidate or interviewer' },
        { status: 400 }
      );
    }

    const chunkIndex = parseInt(chunkIndexStr, 10);
    const startOffsetMs = parseInt(startOffsetMsStr, 10);
    const endOffsetMs = endOffsetMsStr ? parseInt(endOffsetMsStr, 10) : startOffsetMs + 10000;

    if (isNaN(chunkIndex) || isNaN(startOffsetMs)) {
      return NextResponse.json(
        { error: 'chunk_index and start_offset_ms must be valid numbers' },
        { status: 400 }
      );
    }

    // Verify interview session and authorization in private.interviews
    const { data: interview, error: interviewError } = await supabase
      .schema('private')
      .from('interviews')
      .select('*')
      .eq('id', interviewId)
      .single();

    if (interviewError || !interview) {
      return NextResponse.json({ error: 'Interview session not found' }, { status: 404 });
    }

    const isCandidate = interview.candidate_id === user.id;
    const isInterviewer = interview.interviewer_id === user.id;

    if (!isCandidate && !isInterviewer) {
      return NextResponse.json(
        { error: 'Access Denied: You are not an authorized participant for this interview.' },
        { status: 403 }
      );
    }

    const expectedRole = isInterviewer ? 'interviewer' : 'candidate';
    if (role !== expectedRole) {
      return NextResponse.json(
        { error: `Access Denied: profile role mismatch (expected ${expectedRole})` },
        { status: 403 }
      );
    }

    // Convert audio Blob/File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Stream buffer directly to Cloudinary
    const uploadResult = await uploadAudioChunk({
      buffer,
      interviewId,
      role,
      chunkIndex,
      startOffsetMs,
    });

    const durationSeconds =
      uploadResult.duration && uploadResult.duration > 0
        ? uploadResult.duration
        : Math.round((endOffsetMs - startOffsetMs) / 1000) || 10;

    // Persist chunk record in private.interview_chunks
    const { data: chunk, error: chunkInsertError } = await supabase
      .schema('private')
      .from('interview_chunks')
      .upsert(
        {
          interview_id: interviewId,
          profile_id: user.id,
          role,
          chunk_index: chunkIndex,
          cloudinary_public_id: uploadResult.public_id,
          cloudinary_url: uploadResult.secure_url,
          duration_seconds: durationSeconds,
          start_offset_ms: startOffsetMs,
          end_offset_ms: endOffsetMs,
        },
        {
          onConflict: 'interview_id,profile_id,chunk_index',
        }
      )
      .select()
      .single();

    if (chunkInsertError) {
      console.error('Error inserting chunk into private.interview_chunks:', chunkInsertError);
      return NextResponse.json(
        { error: 'Failed to record chunk metadata', details: chunkInsertError.message },
        { status: 500 }
      );
    }

    // Update session_started_at (if not previously set) and total_chunks count in private.interviews
    const interviewUpdates: {
      total_chunks: number;
      updated_at: string;
      session_started_at?: string;
    } = {
      total_chunks: (interview.total_chunks || 0) + 1,
      updated_at: new Date().toISOString(),
    };

    if (!interview.session_started_at) {
      interviewUpdates.session_started_at = new Date(Date.now() - startOffsetMs).toISOString();
    }

    await supabase
      .schema('private')
      .from('interviews')
      .update(interviewUpdates)
      .eq('id', interviewId);

    return NextResponse.json({ success: true, chunk }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('Chunk upload handler error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
