import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface UploadChunkParams {
  buffer: Buffer<any>;
  interviewId: string;
  role: 'candidate' | 'interviewer';
  chunkIndex: number;
  startOffsetMs: number;
}

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  duration?: number;
}

/**
 * Upload an in-memory audio chunk buffer to Cloudinary under the designated folder hierarchy.
 * Path convention: sutradhar/interviews/{interview_id}/{role}/chunk_{index}_{offset_ms}
 * Stored with resource_type 'video' as per streaming audio specification.
 */
export async function uploadAudioChunk({
  buffer,
  interviewId,
  role,
  chunkIndex,
  startOffsetMs,
}: UploadChunkParams): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: `sutradhar/interviews/${interviewId}/${role}`,
        public_id: `chunk_${chunkIndex}_${startOffsetMs}`,
        overwrite: true,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Cloudinary upload returned empty response'));
        }
        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url,
          duration: result.duration,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

export { cloudinary };
