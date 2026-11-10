/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KokoroTTS, TextSplitterStream } from 'kokoro-js';

let ttsInstance: any = null;
let isLoading = false;
let currentJobId = 0;
let isCancelled = false;

function splitIntoSpeechChunks(text: string, minChunkChars = 35): string[] {
  if (!text || !text.trim()) return [];
  
  let rawSentences: string[] = [];
  try {
    const splitter = new TextSplitterStream();
    splitter.push(text);
    splitter.flush();
    rawSentences = (splitter.sentences || []).map(s => s.trim()).filter(s => s.length > 0);
  } catch {
    rawSentences = text
      .split(/(?<=[.!?…])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  if (rawSentences.length <= 1) {
    return rawSentences.length === 1 ? rawSentences : [text.trim()];
  }

  const merged: string[] = [];
  let buffer = '';

  for (const sentence of rawSentences) {
    if (buffer) {
      buffer += ' ' + sentence;
    } else {
      buffer = sentence;
    }

    if (buffer.length >= minChunkChars) {
      merged.push(buffer.trim());
      buffer = '';
    }
  }

  if (buffer) {
    if (merged.length > 0 && buffer.length < minChunkChars) {
      merged[merged.length - 1] += ' ' + buffer;
    } else {
      merged.push(buffer.trim());
    }
  }

  return merged.length > 0 ? merged : [text.trim()];
}

async function ensureModelLoaded(): Promise<any> {
  if (ttsInstance) return ttsInstance;
  if (isLoading) {
    while (isLoading) {
      await new Promise(r => setTimeout(r, 100));
    }
    return ttsInstance;
  }
  isLoading = true;

  try {
    self.postMessage({
      type: 'PROGRESS',
      status: 'downloading',
      progress: 0,
      text: 'Starting Kokoro-82M neural model download...'
    });

    const modelId = 'onnx-community/Kokoro-82M-v1.0-ONNX';

    const progressCallback = (info: any) => {
      if (!info) return;
      if (info.status === 'progress' && info.progress !== undefined) {
        const pct = Math.round(info.progress);
        const fileName = info.file ? info.file.split('/').pop() : 'model weights';
        self.postMessage({
          type: 'PROGRESS',
          status: 'downloading',
          progress: pct,
          text: `Downloading ${fileName} (${pct}%)`
        });
      } else if (info.status === 'done') {
        self.postMessage({
          type: 'PROGRESS',
          status: 'downloading',
          progress: 95,
          text: 'Finalizing neural weights in cache...'
        });
      }
    };

    // NOTE: dtype 'q8' MUST use 'wasm' device!
    // Running INT8 quantized models on WebGPU corrupts matrix multiplication shaders and produces distorted/whisper audio.
    try {
      ttsInstance = await KokoroTTS.from_pretrained(modelId, {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: progressCallback
      });
    } catch {
      ttsInstance = await KokoroTTS.from_pretrained(modelId, {
        dtype: 'q8',
        progress_callback: progressCallback
      });
    }

    isLoading = false;
    self.postMessage({ type: 'MODEL_READY' });
    return ttsInstance;
  } catch (err: any) {
    isLoading = false;
    self.postMessage({
      type: 'ERROR',
      error: err?.message || 'Failed to download or initialize Kokoro model'
    });
    throw err;
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data || {};

  if (type === 'STOP' || type === 'CANCEL') {
    isCancelled = true;
    currentJobId++;
    self.postMessage({ type: 'STOPPED' });
    return;
  }

  if (type === 'LOAD_MODEL') {
    try {
      await ensureModelLoaded();
    } catch {
      // error notification posted in ensureModelLoaded
    }
  }

  if (type === 'GENERATE') {
    const { chunks: rawChunks, text, voice, speed, messageId, cacheKey, jobId } = payload || {};
    currentJobId = typeof jobId === 'number' ? jobId : currentJobId + 1;
    const thisJobId = currentJobId;
    isCancelled = false;

    try {
      const model = await ensureModelLoaded();
      if (!model) {
        throw new Error('Kokoro neural model failed to initialize');
      }

      if (isCancelled || thisJobId !== currentJobId) return;

      // Use pre-extracted quote chunks if provided, else fallback to text splitter
      let sentences: string[] = [];
      if (Array.isArray(rawChunks) && rawChunks.length > 0) {
        sentences = rawChunks.map((s: string) => (typeof s === 'string' ? s.trim() : '')).filter((s: string) => s.length > 0);
      } else {
        sentences = splitIntoSpeechChunks(text || '', 35);
      }

      const totalSentences = sentences.length > 0 ? sentences.length : 1;

      self.postMessage({
        type: 'GENERATING',
        jobId: thisJobId,
        messageId,
        cacheKey,
        text,
        currentChunk: 1,
        totalChunks: totalSentences,
        percent: 0
      });

      for (let i = 0; i < totalSentences; i++) {
        if (isCancelled || thisJobId !== currentJobId) {
          break;
        }

        const sentence = sentences[i] || '';
        if (!sentence.trim()) continue;

        const chunkIndex = i + 1;

        // Initial progress for this chunk
        self.postMessage({
          type: 'GENERATING_PROGRESS',
          jobId: thisJobId,
          messageId,
          cacheKey,
          percent: 15,
          currentChunk: chunkIndex,
          totalChunks: totalSentences
        });

        // Periodic intra-chunk progress tick while ONNX inference runs
        let currentPercent = 15;
        const progressInterval = setInterval(() => {
          if (isCancelled || thisJobId !== currentJobId) {
            clearInterval(progressInterval);
            return;
          }
          if (currentPercent < 90) {
            currentPercent += 15;
            self.postMessage({
              type: 'GENERATING_PROGRESS',
              jobId: thisJobId,
              messageId,
              cacheKey,
              percent: currentPercent,
              currentChunk: chunkIndex,
              totalChunks: totalSentences
            });
          }
        }, 300);

        let rawAudio: any = null;
        try {
          const targetVoice = (model?.voices && voice in model.voices) ? voice : 'af_heart';
          rawAudio = await model.generate(sentence, {
            voice: targetVoice,
            speed: speed || 1.0
          });
        } finally {
          clearInterval(progressInterval);
        }

        // Check if aborted while model was generating
        if (isCancelled || thisJobId !== currentJobId) {
          break;
        }

        if (rawAudio) {
          const blob = typeof rawAudio.toBlob === 'function'
            ? rawAudio.toBlob()
            : new Blob([rawAudio.toWav()], { type: 'audio/wav' });

          self.postMessage({
            type: 'CHUNK_AUDIO',
            jobId: thisJobId,
            messageId,
            cacheKey,
            chunkIndex: i,
            currentChunk: chunkIndex,
            totalChunks: totalSentences,
            percent: 100,
            blob
          });
        }
      }

      if (!isCancelled && thisJobId === currentJobId) {
        self.postMessage({
          type: 'AUDIO_READY',
          jobId: thisJobId,
          messageId,
          cacheKey
        });
      }
    } catch (err: any) {
      if (!isCancelled && thisJobId === currentJobId) {
        self.postMessage({
          type: 'GENERATE_ERROR',
          jobId: thisJobId,
          messageId,
          cacheKey,
          error: err?.message || 'Speech generation failed'
        });
      }
    }
  }
};
