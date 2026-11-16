/**
 * Client-Side Whisper Speech-to-Text Web Worker
 *
 * Runs quantized multilingual whisper-base via Transformers.js in a separate background thread,
 * ensuring zero main-thread freezing and offline model caching via the browser Cache API.
 */

// Self reference in web worker
const ctx: Worker = self as any;

let transcriberPromise: Promise<any> | null = null;

async function getTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const { pipeline, env } = await import('@xenova/transformers');

      // Configure caching and execution backends
      env.allowLocalModels = false;
      env.useBrowserCache = true;

      return await pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
        progress_callback: (progress: any) => {
          if (progress.status === 'progress') {
            ctx.postMessage({
              type: 'download-progress',
              file: progress.file,
              progress: Math.round(progress.progress || 0),
              loaded: progress.loaded,
              total: progress.total,
            });
          }
        },
      });
    })();
  }
  return transcriberPromise;
}

ctx.onmessage = async (event: MessageEvent) => {
  const { type, interviewId, audioBuffer } = event.data || {};

  if (type === 'start') {
    try {
      ctx.postMessage({
        type: 'download-progress',
        progress: 10,
        loaded: 7500000,
        total: 75000000,
      });

      const transcriber = await getTranscriber();

      ctx.postMessage({
        type: 'download-progress',
        progress: 100,
        loaded: 75000000,
        total: 75000000,
      });

      ctx.postMessage({
        type: 'transcription-progress',
        progress: 15,
      });

      // Transcribe audio input
      const result = await transcriber(audioBuffer, {
        return_timestamps: true,
        chunk_length_s: 30,
        stride_length_s: 5,
        callback_function: (beams: any) => {
          if (beams && beams.length > 0) {
            ctx.postMessage({
              type: 'transcription-progress',
              progress: 50,
            });
          }
        },
      });

      const rawChunks = (result as any)?.chunks || [];
      const segments = rawChunks.map((chunk: any) => ({
        start: chunk.timestamp ? chunk.timestamp[0] : 0,
        end: chunk.timestamp ? chunk.timestamp[1] : 0,
        text: (chunk.text || '').trim(),
      }));

      const fullText = (result as any)?.text || segments.map((s: any) => s.text).join(' ');

      ctx.postMessage({
        type: 'complete',
        transcript: {
          interviewId,
          segments: segments.length > 0 ? segments : [{ start: 0, end: 1, text: fullText }],
          text: fullText,
          createdAt: new Date().toISOString(),
          model: 'whisper-base',
        },
      });
    } catch (err: any) {
      console.error('Whisper worker transcription error:', err);
      ctx.postMessage({
        type: 'error',
        error: err?.message || 'Transcription failed',
      });
    }
  }
};

export {};
