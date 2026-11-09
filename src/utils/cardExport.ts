/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Character, Conversation, ChatMessage } from '../types';

// ============================================================================
// 1. Character Card V2 (CCv2) JSON Export (SillyTavern, TavernAI, Agnaistic)
// ============================================================================

export interface CharacterCardV2 {
  spec: 'chara_card_v2';
  spec_version: '2.0';
  data: {
    name: string;
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    mes_example: string;
    creator_notes?: string;
    system_prompt?: string;
    post_history_instructions?: string;
    alternate_greetings?: string[];
    character_book?: any;
    tags?: string[];
    creator?: string;
    character_version?: string;
    extensions?: Record<string, any>;
  };
}

export function buildCharacterCardV2(character: Character): CharacterCardV2 {
  const primaryScenario = character.scenarios?.[0];
  const altGreetings = (character.scenarios || [])
    .slice(1)
    .map(s => s.openingMessage)
    .filter(Boolean);

  const bioParts: string[] = [];
  if (character.shortDescription) bioParts.push(character.shortDescription.trim());
  if (character.background && character.background.trim() !== (character.shortDescription || '').trim()) {
    bioParts.push(character.background.trim());
  }

  return {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: character.name,
      description: bioParts.join('\n\n') || character.shortDescription || `${character.name} — Roleplay character.`,
      personality: character.personality || '',
      scenario: primaryScenario?.scenarioInstructions || primaryScenario?.description || character.background || '',
      first_mes: primaryScenario?.openingMessage || character.firstMessage || 'Hello.',
      mes_example: character.exampleDialogue || '',
      creator_notes: character.creatorNotes || '',
      system_prompt: character.systemPrompt || '',
      post_history_instructions: '',
      alternate_greetings: altGreetings,
      tags: character.tagSlugs || [],
      creator: character.creatorUsername || 'Warden AI',
      character_version: '1.0',
      extensions: {
        warden_ai: {
          id: character.id,
          subtitle: character.subtitle,
          contentRating: character.contentRating,
          visibility: character.visibility,
          scenarios: character.scenarios,
          lorebookIds: character.lorebookIds
        }
      }
    }
  };
}

// ============================================================================
// 2. Client-Side PNG Chunk Injection for SillyTavern / CCv2 Character PNG Cards
// ============================================================================

// CRC32 table for PNG chunk checksum calculation
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c;
}

function calculateCrc(buf: Uint8Array, offset: number, length: number): number {
  let crc = 0xffffffff;
  for (let i = offset; i < offset + length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Injects a 'tEXt' chunk with keyword 'chara' containing base64 CCv2 data into a PNG buffer
 */
export function injectCharacterMetadataIntoPng(pngBytes: Uint8Array, charaData: CharacterCardV2): Uint8Array {
  const jsonStr = JSON.stringify(charaData);
  // Base64 encode JSON
  const base64Data = btoa(unescape(encodeURIComponent(jsonStr)));

  // 'chara\0' + base64Data
  const keyword = 'chara\0';
  const keywordBytes = new TextEncoder().encode(keyword);
  const dataBytes = new TextEncoder().encode(base64Data);

  const chunkDataLength = keywordBytes.length + dataBytes.length;
  const chunkLength = 4 + 4 + chunkDataLength + 4; // length + 'tEXt' + data + crc

  const textChunk = new Uint8Array(chunkLength);
  const view = new DataView(textChunk.buffer);

  // 1. Length (4 bytes big-endian)
  view.setUint32(0, chunkDataLength, false);

  // 2. Type: 'tEXt' (ASCII 116, 69, 88, 116)
  textChunk[4] = 116;
  textChunk[5] = 69;
  textChunk[6] = 88;
  textChunk[7] = 116;

  // 3. Keyword + Data
  textChunk.set(keywordBytes, 8);
  textChunk.set(dataBytes, 8 + keywordBytes.length);

  // 4. CRC over type and data
  const crc = calculateCrc(textChunk, 4, 4 + chunkDataLength);
  view.setUint32(8 + chunkDataLength, crc, false);

  // Insert chunk immediately after IHDR chunk in the PNG
  // PNG signature is 8 bytes
  // IHDR starts at byte 8: 4 bytes length, 4 bytes 'IHDR', length bytes data, 4 bytes crc
  if (pngBytes.length < 33 || pngBytes[0] !== 0x89 || pngBytes[1] !== 0x50) {
    throw new Error('Provided buffer is not a valid PNG image.');
  }

  const ihdrDataLen = new DataView(pngBytes.buffer, pngBytes.byteOffset, pngBytes.byteLength).getUint32(8, false);
  const ihdrEndOffset = 8 + 4 + 4 + ihdrDataLen + 4; // usually 33

  const result = new Uint8Array(pngBytes.length + chunkLength);
  result.set(pngBytes.subarray(0, ihdrEndOffset), 0);
  result.set(textChunk, ihdrEndOffset);
  result.set(pngBytes.subarray(ihdrEndOffset), ihdrEndOffset + chunkLength);

  return result;
}

/**
 * Creates an exportable PNG file with character card v2 metadata embedded.
 */
export async function generateSillyTavernPngCard(character: Character): Promise<Blob> {
  const cardData = buildCharacterCardV2(character);
  const imgUrl = character.avatarUrl || character.coverUrl || '';

  // Render to canvas to produce a clean standard PNG
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 400;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable');
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(async blob => {
          if (!blob) {
            reject(new Error('Canvas toBlob returned null'));
            return;
          }
          try {
            const arrayBuf = await blob.arrayBuffer();
            const pngBytes = new Uint8Array(arrayBuf);
            const injected = injectCharacterMetadataIntoPng(pngBytes, cardData);
            resolve(new Blob([injected.buffer as ArrayBuffer], { type: 'image/png' }));
          } catch (err) {
            reject(err);
          }
        }, 'image/png');
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => {
      // Fallback: draw placeholder canvas with character name
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(0, 0, 400, 600);
        ctx.fillStyle = '#a855f7';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(character.name, 200, 300);
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Warden AI Character Card', 200, 340);
        canvas.toBlob(async b => {
          if (!b) return reject(new Error('Fallback blob failed'));
          const arr = await b.arrayBuffer();
          const injected = injectCharacterMetadataIntoPng(new Uint8Array(arr), cardData);
          resolve(new Blob([injected.buffer as ArrayBuffer], { type: 'image/png' }));
        }, 'image/png');
      } else {
        reject(new Error('Failed to load character image'));
      }
    };
    img.src = imgUrl;
  });
}

// ============================================================================
// 3. Chat Transcript Exporters (Markdown, Plain Text, JSON)
// ============================================================================

export function exportTranscriptMarkdown(
  conversation: Conversation,
  character: Character,
  userPersonaName: string = 'User'
): string {
  const lines: string[] = [];
  lines.push(`# Roleplay Transcript: ${character.name}`);
  if (character.subtitle) lines.push(`*${character.subtitle}*`);
  lines.push('');
  lines.push(`- **Date**: ${new Date(conversation.createdAt || Date.now()).toLocaleDateString()}`);
  lines.push(`- **Character**: ${character.name} (@${character.creatorUsername})`);
  lines.push(`- **User Persona**: ${userPersonaName}`);
  lines.push(`- **Messages Count**: ${conversation.messages?.length || 0}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  (conversation.messages || []).forEach(msg => {
    const isUser = msg.sender === 'user' || msg.senderRole === 'user';
    const speaker = isUser ? (msg.personaName || userPersonaName) : character.name;
    const time = msg.timestamp || '';
    lines.push(`### ${speaker} ${time ? `*(${time})*` : ''}`);
    lines.push('');
    lines.push(msg.content.trim());
    lines.push('');
  });

  return lines.join('\n');
}

export function exportTranscriptPlainText(
  conversation: Conversation,
  character: Character,
  userPersonaName: string = 'User'
): string {
  const lines: string[] = [];
  lines.push(`ROLEPLAY TRANSCRIPT: ${character.name.toUpperCase()}`);
  lines.push(`Created: ${new Date(conversation.createdAt || Date.now()).toLocaleString()}`);
  lines.push(`Character: ${character.name}`);
  lines.push(`User Persona: ${userPersonaName}`);
  lines.push('='.repeat(60));
  lines.push('');

  (conversation.messages || []).forEach(msg => {
    const isUser = msg.sender === 'user' || msg.senderRole === 'user';
    const speaker = isUser ? (msg.personaName || userPersonaName) : character.name;
    lines.push(`[${speaker}]:`);
    lines.push(msg.content.trim());
    lines.push('');
  });

  return lines.join('\n');
}

export function exportTranscriptJson(
  conversation: Conversation,
  character: Character
): string {
  return JSON.stringify(
    {
      version: 'warden_transcript_v1',
      exportedAt: new Date().toISOString(),
      character: {
        id: character.id,
        name: character.name,
        creator: character.creatorUsername
      },
      conversation: {
        id: conversation.id,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages: conversation.messages.map(m => ({
          role: m.senderRole || (m.sender === 'user' ? 'user' : 'assistant'),
          speaker: m.sender === 'user' ? (m.personaName || 'User') : character.name,
          content: m.content,
          timestamp: m.timestamp
        }))
      }
    },
    null,
    2
  );
}

// ============================================================================
// 4. Download Utility Helper
// ============================================================================

export async function downloadFile(filename: string, content: string | Blob, mimeType: string = 'text/plain') {
  const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content;

  // 1. Android APK Native Bridge: Direct save into Download/Warden/
  if (typeof window !== 'undefined' && (window as any).WardenNativeBridge?.saveFileToDownloads) {
    try {
      const text = typeof content === 'string' ? content : await blob.text();
      const resStr = (window as any).WardenNativeBridge.saveFileToDownloads(
        filename,
        text,
        false,
        'Warden'
      );
      const res = typeof resStr === 'string' ? JSON.parse(resStr) : resStr;
      if (res?.success) {
        return;
      }
    } catch (err) {
      console.warn('[downloadFile] Native bridge save failed, falling back:', err);
    }
  }

  // 2. On Android/mobile WebViews, anchor clicks on blob: URLs fail silently.
  // Using Web Share API lets the user save directly to Downloads or Google Drive via Android's native system sheet.
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const file = new File([blob], filename, { type: mimeType });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename
        });
        return;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.warn('[downloadFile] Native file share failed, falling back to anchor:', err);
    }
  }

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (err) {
    console.warn('[downloadFile] Anchor download failed:', err);
  }
}

