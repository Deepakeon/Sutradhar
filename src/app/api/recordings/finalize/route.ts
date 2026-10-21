import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { interviewId } = await req.json();

    if (!interviewId) {
      return NextResponse.json({ error: 'Missing interviewId' }, { status: 400 });
    }

    // Verify profile participation in the interview
    const { data: interview, error: dbError } = await supabase
      .schema('private')
      .from('interviews')
      .select('id, candidate_id, interviewer_id, status')
      .eq('id', interviewId)
      .single();

    if (dbError || !interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    if (interview.candidate_id !== user.id && interview.interviewer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Profile not in interview' }, { status: 403 });
    }

    // Fetch all uploaded chunks
    const { data: chunks, error: chunksError } = await supabase
      .schema('private')
      .from('interview_chunks')
      .select('*')
      .eq('interview_id', interviewId)
      .order('chunk_index', { ascending: true });

    if (chunksError) {
      return NextResponse.json({ error: chunksError.message }, { status: 500 });
    }

    // Filter valid chunks with public ID and URL
    const validChunks = (chunks || []).filter(
      (c) => Boolean(c.cloudinary_public_id && c.cloudinary_url)
    );

    const totalChunks = validChunks.length;
    const durationSeconds = validChunks.reduce((sum, c) => sum + (Number(c.duration_seconds) || 30), 0);

    let masterRecordingUrl: string | null = null;
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo';

    if (validChunks.length > 0) {
      if (validChunks.length === 1) {
        masterRecordingUrl = validChunks[0].cloudinary_url;
      } else {
        // Build Cloudinary spliced audio concatenation URL using fl_splice transformation
        // Base is first chunk, subsequently spliced with each additional chunk
        const basePublicId = validChunks[0].cloudinary_public_id.replace(/\.[^/.]+$/, '');
        const spliceLayers = validChunks
          .slice(1)
          .map((c) => {
            const cleanLayerId = c.cloudinary_public_id.replace(/\.[^/.]+$/, '').replace(/\//g, ':');
            return `fl_splice,l_video:${cleanLayerId}/fl_layer_apply`;
          })
          .join('/');

        masterRecordingUrl = `https://res.cloudinary.com/${cloudName}/video/upload/${spliceLayers}/${basePublicId}.webm`;
      }
    }

    // Update interview record
    const { error: updateError } = await supabase
      .schema('private')
      .from('interviews')
      .update({
        status: 'completed',
        master_recording_url: masterRecordingUrl,
        total_chunks: totalChunks,
        duration_seconds: Math.round(durationSeconds),
        updated_at: new Date().toISOString(),
      })
      .eq('id', interviewId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      masterRecordingUrl,
      totalChunks,
      durationSeconds: Math.round(durationSeconds),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
