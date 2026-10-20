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

    // Verify profile participation via security definer RPC
    const { data: interviewData, error: dbError } = await supabase
      .rpc('get_interview_session', { p_interview_id: interviewId });

    if (dbError || !interviewData) {
      return NextResponse.json({ error: 'Interview not found or unauthorized' }, { status: 404 });
    }

    // Fetch all uploaded chunks via security definer RPC
    const { data: chunksData, error: chunksError } = await supabase
      .rpc('get_interview_chunks', { p_interview_id: interviewId });

    if (chunksError) {
      return NextResponse.json({ error: chunksError.message }, { status: 500 });
    }

    const chunks = (chunksData || []) as Array<{
      chunk_index: number;
      cloudinary_public_id: string;
      cloudinary_url: string;
      duration_seconds: number;
    }>;

    const totalChunks = chunks.length;
    const durationSeconds = chunks.reduce((sum, c) => sum + (Number(c.duration_seconds) || 30), 0);

    let masterRecordingUrl: string | null = null;
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo';

    if (chunks && chunks.length > 0) {
      if (chunks.length === 1) {
        masterRecordingUrl = chunks[0].cloudinary_url;
      } else {
        // Build Cloudinary spliced audio concatenation URL using fl_splice transformation
        // Base is first chunk, subsequently spliced with each additional chunk
        const basePublicId = chunks[0].cloudinary_public_id.replace(/\.[^/.]+$/, '');
        const spliceLayers = chunks
          .slice(1)
          .map((c) => {
            const cleanLayerId = c.cloudinary_public_id.replace(/\.[^/.]+$/, '').replace(/\//g, ':');
            return `fl_splice,l_video:${cleanLayerId}/fl_layer_apply`;
          })
          .join('/');

        masterRecordingUrl = `https://res.cloudinary.com/${cloudName}/video/upload/${spliceLayers}/${basePublicId}.webm`;
      }
    }

    // Finalize interview record via security definer RPC
    const { error: updateError } = await supabase
      .rpc('finalize_interview_session', {
        p_interview_id: interviewId,
        p_master_recording_url: masterRecordingUrl || '',
        p_total_chunks: totalChunks,
        p_duration_seconds: Math.round(durationSeconds),
      });

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
