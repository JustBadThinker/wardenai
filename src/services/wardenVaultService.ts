/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Character,
  Conversation,
  Lorebook,
  Persona,
  GlobalChatBackground
} from '../types';
import { storageService, BotRulePreset } from './storageService';

export interface WardenVaultPayload {
  format: 'warden-vault';
  version: 1;
  exportedAt: string;
  app: 'Warden AI';
  personas: Persona[];
  conversations: Conversation[];
  characters: Character[];
  botRulePresets: BotRulePreset[];
  lorebooks?: Lorebook[];
  globalBackground?: GlobalChatBackground;
}

export interface WardenEncryptedEnvelope {
  wardenEnvelope: 'WARDEN_VAULT_V1';
  format: 'warden';
  version: 1;
  algorithm: 'AES-GCM-256';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  hasCustomPassword: boolean;
  salt: string;       // base64
  iv: string;         // base64
  ciphertext: string; // base64
  exportedAt: string;
}

export interface VaultExportStats {
  personasCount: number;
  conversationsCount: number;
  messagesCount: number;
  rulesCount: number;
  charactersCount: number;
}

export interface VaultImportStats {
  personasAdded: number;
  conversationsAdded: number;
  messagesAdded: number;
  rulesAdded: number;
  charactersAdded: number;
}

const DEFAULT_VAULT_KEY = 'WardenAI_ClientStorage_Vault_Key_v1_ZeroAuth';
const PBKDF2_ITERATIONS = 100_000;

/**
 * Encodes an ArrayBuffer into a Base64 string safely without call stack size limit errors.
 */
function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunkSize = 0x8000; // 32KB chunks
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunkSize) as unknown as number[]
    );
  }
  return btoa(binary);
}

/**
 * Decodes a Base64 string into an ArrayBuffer safely.
 */
function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives an AES-GCM 256-bit key from a password string and random salt using PBKDF2-SHA256.
 */
async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export class WardenVaultService {
  /**
   * Exports all personas, conversations (with history), characters, custom rules / prompts into
   * an encrypted .warden file. Excludes all provider API credentials.
   */
  public async exportVault(
    userId: string,
    password?: string
  ): Promise<{ blob: Blob; filename: string; stats: VaultExportStats }> {
    const hasCustomPassword = Boolean(password && password.trim().length > 0);
    const effectivePass = hasCustomPassword ? password!.trim() : DEFAULT_VAULT_KEY;

    // Collect all data entities from storage
    const personas = storageService.getPersonas(userId);
    const conversations = storageService.getConversations(userId);
    const characters = storageService.getCharacters();
    const customRules = storageService.getBotRulePresets().filter(p => !p.isBuiltin);
    const lorebooks = storageService.getLorebooks();
    const globalBackground = storageService.getGlobalChatBackground();

    const messagesCount = conversations.reduce((acc, c) => acc + (c.messages?.length || 0), 0);

    const stats: VaultExportStats = {
      personasCount: personas.length,
      conversationsCount: conversations.length,
      messagesCount,
      rulesCount: customRules.length,
      charactersCount: characters.length
    };

    const payload: WardenVaultPayload = {
      format: 'warden-vault',
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'Warden AI',
      personas,
      conversations,
      characters,
      botRulePresets: customRules,
      lorebooks,
      globalBackground
    };

    // Encrypt payload using Web Crypto API (AES-GCM-256 with PBKDF2)
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveAesKey(effectivePass, salt);

    const enc = new TextEncoder();
    const plaintext = enc.encode(JSON.stringify(payload));

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      plaintext
    );

    const envelope: WardenEncryptedEnvelope = {
      wardenEnvelope: 'WARDEN_VAULT_V1',
      format: 'warden',
      version: 1,
      algorithm: 'AES-GCM-256',
      kdf: 'PBKDF2-SHA256',
      iterations: PBKDF2_ITERATIONS,
      hasCustomPassword,
      salt: bufferToBase64(salt.buffer),
      iv: bufferToBase64(iv.buffer),
      ciphertext: bufferToBase64(ciphertextBuffer),
      exportedAt: payload.exportedAt
    };

    const envelopeString = JSON.stringify(envelope, null, 2);
    const blob = new Blob([envelopeString], { type: 'application/x-warden-vault' });

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `warden_vault_backup_${dateStr}.warden`;

    return { blob, filename, stats };
  }

  /**
   * Inspects a .warden file content to check whether it's valid and requires a password.
   */
  public inspectVaultFile(rawContent: string): {
    isValid: boolean;
    hasCustomPassword: boolean;
    version?: number;
    exportedAt?: string;
    error?: string;
  } {
    try {
      const parsed = JSON.parse(rawContent.trim());
      if (parsed.wardenEnvelope !== 'WARDEN_VAULT_V1' && parsed.format !== 'warden') {
        return {
          isValid: false,
          hasCustomPassword: false,
          error: 'File is not a valid Warden AI encrypted vault (.warden).'
        };
      }
      return {
        isValid: true,
        hasCustomPassword: Boolean(parsed.hasCustomPassword),
        version: parsed.version || 1,
        exportedAt: parsed.exportedAt
      };
    } catch {
      return {
        isValid: false,
        hasCustomPassword: false,
        error: 'Invalid file format. Could not parse .warden structure.'
      };
    }
  }

  /**
   * Decrypts and imports a .warden vault file.
   * If existing personas or chats exist, it ADDS them and preserves all existing items without deletion!
   */
  public async importVault(
    rawContent: string,
    currentUserId: string,
    password?: string
  ): Promise<{ success: boolean; stats: VaultImportStats; error?: string }> {
    try {
      const envelope: WardenEncryptedEnvelope = JSON.parse(rawContent.trim());
      if (envelope.wardenEnvelope !== 'WARDEN_VAULT_V1' && envelope.format !== 'warden') {
        return {
          success: false,
          stats: { personasAdded: 0, conversationsAdded: 0, messagesAdded: 0, rulesAdded: 0, charactersAdded: 0 },
          error: 'Invalid .warden envelope format.'
        };
      }

      const effectivePass = envelope.hasCustomPassword
        ? (password || '').trim()
        : DEFAULT_VAULT_KEY;

      if (envelope.hasCustomPassword && !effectivePass) {
        return {
          success: false,
          stats: { personasAdded: 0, conversationsAdded: 0, messagesAdded: 0, rulesAdded: 0, charactersAdded: 0 },
          error: 'Password is required to decrypt this .warden vault.'
        };
      }

      // Convert salt, iv, and ciphertext from Base64
      const salt = new Uint8Array(base64ToBuffer(envelope.salt));
      const iv = new Uint8Array(base64ToBuffer(envelope.iv));
      const ciphertext = base64ToBuffer(envelope.ciphertext);

      const key = await deriveAesKey(effectivePass, salt);

      let decryptedBuffer: ArrayBuffer;
      try {
        decryptedBuffer = await window.crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv
          },
          key,
          ciphertext
        );
      } catch {
        return {
          success: false,
          stats: { personasAdded: 0, conversationsAdded: 0, messagesAdded: 0, rulesAdded: 0, charactersAdded: 0 },
          error: 'Decryption failed: Incorrect password or corrupted vault file.'
        };
      }

      const dec = new TextDecoder();
      const payload: WardenVaultPayload = JSON.parse(dec.decode(decryptedBuffer));

      // --- MERGE LOGIC (Strictly preserving all existing user data) ---

      // 1. Personas: If user already has personas, DO NOT delete, but ADD imported personas cleanly!
      const existingPersonas = storageService.getPersonas(currentUserId);
      const existingPersonaIds = new Set(existingPersonas.map(p => p.id));
      const existingPersonaNames = new Set(existingPersonas.map(p => p.name.trim().toLowerCase()));

      let personasAdded = 0;
      if (Array.isArray(payload.personas)) {
        for (const p of payload.personas) {
          let finalId = p.id;
          let finalName = p.name;

          // If ID already exists, allocate a new unique ID so current persona is preserved untouched
          if (existingPersonaIds.has(finalId)) {
            finalId = `persona_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          }
          // If name matches an existing one, label it so user can differentiate easily
          if (existingPersonaNames.has(finalName.trim().toLowerCase())) {
            finalName = `${finalName} (Imported)`;
          }

          storageService.upsertPersona({
            ...p,
            id: finalId,
            name: finalName,
            userId: currentUserId
          });

          existingPersonaIds.add(finalId);
          existingPersonaNames.add(finalName.trim().toLowerCase());
          personasAdded++;
        }
      }

      // 2. Conversations & Message History: Preserve existing chats, append imported ones
      const existingConvs = storageService.getConversations(currentUserId);
      const existingConvIds = new Set(existingConvs.map(c => c.id));

      let conversationsAdded = 0;
      let messagesAdded = 0;
      if (Array.isArray(payload.conversations)) {
        for (const conv of payload.conversations) {
          let finalId = conv.id;
          if (existingConvIds.has(finalId)) {
            finalId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          }

          storageService.upsertConversation({
            ...conv,
            id: finalId,
            userId: currentUserId
          });

          existingConvIds.add(finalId);
          conversationsAdded++;
          messagesAdded += conv.messages?.length || 0;
        }
      }

      // 3. Custom Bot Rules / Prompts: Merge custom rule presets
      const existingRules = storageService.getBotRulePresets();
      const existingRuleNames = new Set(existingRules.map(r => r.name.trim().toLowerCase()));

      let rulesAdded = 0;
      if (Array.isArray(payload.botRulePresets)) {
        for (const rule of payload.botRulePresets) {
          if (!rule.isBuiltin) {
            let finalName = rule.name;
            if (existingRuleNames.has(finalName.trim().toLowerCase())) {
              finalName = `${finalName} (Imported)`;
            }

            storageService.saveBotRulePreset({
              ...rule,
              id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              name: finalName
            });

            existingRuleNames.add(finalName.trim().toLowerCase());
            rulesAdded++;
          }
        }
      }

      // 4. Characters: Merge characters into library
      const existingChars = storageService.getCharacters();
      const existingCharIds = new Set(existingChars.map(c => c.id));

      let charactersAdded = 0;
      if (Array.isArray(payload.characters)) {
        for (const char of payload.characters) {
          let finalId = char.id;
          if (existingCharIds.has(finalId)) {
            finalId = `char_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          }

          storageService.upsertCharacter({
            ...char,
            id: finalId
          });

          existingCharIds.add(finalId);
          charactersAdded++;
        }
      }

      // 5. Lorebooks: Merge lorebooks
      if (Array.isArray(payload.lorebooks)) {
        for (const lb of payload.lorebooks) {
          storageService.upsertLorebook(lb);
        }
      }

      return {
        success: true,
        stats: {
          personasAdded,
          conversationsAdded,
          messagesAdded,
          rulesAdded,
          charactersAdded
        }
      };
    } catch (err: any) {
      return {
        success: false,
        stats: { personasAdded: 0, conversationsAdded: 0, messagesAdded: 0, rulesAdded: 0, charactersAdded: 0 },
        error: err?.message || 'Failed to import .warden vault.'
      };
    }
  }

  /**
   * Triggers download of the .warden file in the user's browser.
   */
  public downloadVaultFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const wardenVaultService = new WardenVaultService();
