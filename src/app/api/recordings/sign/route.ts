import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { interviewId, chunkIndex } = body;

    if (!interviewId || chunkIndex === undefined) {
      return NextResponse.json({ error: 'Missing interviewId or chunkIndex' }, { status: 400 });
    }

    // Verify profile participation in the interview
    const { data: interview, error: dbError } = await supabase
      .from('interviews')
      .select('id, candidate_id, interviewer_id')
      .eq('id', interviewId)
      .single();

    if (dbError || !interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    if (interview.candidate_id !== user.id && interview.interviewer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Profile not in interview' }, { status: 403 });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo';
    const apiKey = process.env.CLOUDINARY_API_KEY || 'demo_key';
    const apiSecret = process.env.CLOUDINARY_API_SECRET || 'demo_secret';

    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = `sutradhar/interviews/${interviewId}/chunks`;
    const publicId = `chunk_${chunkIndex}`;

    // Generate SHA-1 or SHA-256 signature via Cloudinary SDK
    const signature = cloudinary.utils.api_sign_request(
      {
        folder,
        public_id: publicId,
        timestamp,
      },
      apiSecret
    );

    return NextResponse.json({
      signature,
      timestamp,
      folder,
      publicId,
      apiKey,
      cloudName,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
