import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadAudioChunk } from '../cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import { Writable } from 'stream';

vi.mock('cloudinary', () => {
  return {
    v2: {
      config: vi.fn(),
      uploader: {
        upload_stream: vi.fn(),
      },
    },
  };
});

describe('uploadAudioChunk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads audio buffer to Cloudinary under the correct path with resource_type video', async () => {
    const mockResult = {
      public_id: 'sutradhar/interviews/interview-123/interviewer/chunk_1_10000',
      secure_url: 'https://res.cloudinary.com/demo/video/upload/chunk_1_10000.webm',
      duration: 10.02,
    };

    vi.mocked(cloudinary.uploader.upload_stream).mockImplementation(
      (options: any, callback?: any) => {
        const stream = new Writable({
          write(_chunk, _encoding, next) {
            next();
          },
        });
        // Call callback on finish
        stream.on('finish', () => {
          if (callback) {
            callback(null, mockResult);
          }
        });
        return stream as any;
      }
    );

    const fakeBuffer = Buffer.from('fake-audio-binary-data');
    const result = await uploadAudioChunk({
      buffer: fakeBuffer,
      interviewId: 'interview-123',
      role: 'interviewer',
      chunkIndex: 1,
      startOffsetMs: 10000,
    });

    expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
      expect.objectContaining({
        resource_type: 'video',
        folder: 'sutradhar/interviews/interview-123/interviewer',
        public_id: 'chunk_1_10000',
        overwrite: true,
      }),
      expect.any(Function)
    );

    expect(result).toEqual({
      public_id: mockResult.public_id,
      secure_url: mockResult.secure_url,
      duration: 10.02,
    });
  });

  it('rejects if Cloudinary upload_stream encounters an error', async () => {
    vi.mocked(cloudinary.uploader.upload_stream).mockImplementation(
      (_options: any, callback?: any) => {
        const stream = new Writable({
          write(_chunk, _encoding, next) {
            next();
          },
        });
        stream.on('finish', () => {
          if (callback) {
            callback(new Error('Cloudinary server error'), null);
          }
        });
        return stream as any;
      }
    );

    const fakeBuffer = Buffer.from('audio');
    await expect(
      uploadAudioChunk({
        buffer: fakeBuffer,
        interviewId: 'interview-123',
        role: 'candidate',
        chunkIndex: 0,
        startOffsetMs: 0,
      })
    ).rejects.toThrow('Cloudinary server error');
  });
});
