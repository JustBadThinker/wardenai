/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import CryptoJS from 'crypto-js';
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
  algorithm: 'AES-256' | 'AES-GCM-256';
  kdf: 'PBKDF2';
  hasCustomPassword: boolean;
  ciphertext: string;
  salt?: string;
  iv?: string;
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

/**
 * Decodes a Base64 string into an ArrayBuffer safely (for legacy WebCrypto decrypt if applicable).
 */
function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export class WardenVaultService {
  /**
   * Exports all personas, conversations (with complete history), characters, and custom rules / prompts into
   * an encrypted .warden file. Excludes all provider API credentials.
   *
   * Uses pure-JS AES encryption so it works seamlessly across localhost, HTTPS, AND local network IPs
   * (e.g. http://192.168.1.x:3000 where window.crypto.subtle is disabled by browsers).
   */
  public async exportVault(
    userId: string,
    password?: string
  ): Promise<{ blob: Blob; filename: string; stats: VaultExportStats; rawContent: string }> {
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

    const plaintextJson = JSON.stringify(payload);

    // Encrypt payload with AES-256
    const encryptedCiphertext = CryptoJS.AES.encrypt(plaintextJson, effectivePass).toString();

    const envelope: WardenEncryptedEnvelope = {
      wardenEnvelope: 'WARDEN_VAULT_V1',
      format: 'warden',
      version: 1,
      algorithm: 'AES-256',
      kdf: 'PBKDF2',
      hasCustomPassword,
      ciphertext: encryptedCiphertext,
      exportedAt: payload.exportedAt
    };

    const envelopeString = JSON.stringify(envelope, null, 2);
    const blob = new Blob([envelopeString], { type: 'application/x-warden-vault' });

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const filename = `warden-${year}-${month}-${day}-${hours}${minutes}.warden`;

    return { blob, filename, stats, rawContent: envelopeString };
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

      let decryptedJson = '';

      // Decrypt using CryptoJS AES
      if (envelope.algorithm === 'AES-256' || !envelope.salt || !envelope.iv) {
        try {
          const bytes = CryptoJS.AES.decrypt(envelope.ciphertext, effectivePass);
          decryptedJson = bytes.toString(CryptoJS.enc.Utf8);
          if (!decryptedJson) {
            return {
              success: false,
              stats: { personasAdded: 0, conversationsAdded: 0, messagesAdded: 0, rulesAdded: 0, charactersAdded: 0 },
              error: 'Decryption failed: Incorrect password or corrupted vault file.'
            };
          }
        } catch {
          return {
            success: false,
            stats: { personasAdded: 0, conversationsAdded: 0, messagesAdded: 0, rulesAdded: 0, charactersAdded: 0 },
            error: 'Decryption failed: Incorrect password or corrupted vault file.'
          };
        }
      } else {
        // Fallback for WebCrypto AES-GCM envelope if present and supported
        if (window.crypto?.subtle) {
          try {
            const salt = new Uint8Array(base64ToBuffer(envelope.salt));
            const iv = new Uint8Array(base64ToBuffer(envelope.iv));
            const ciphertext = base64ToBuffer(envelope.ciphertext);

            const enc = new TextEncoder();
            const keyMaterial = await window.crypto.subtle.importKey(
              'raw',
              enc.encode(effectivePass),
              { name: 'PBKDF2' },
              false,
              ['deriveKey']
            );
            const key = await window.crypto.subtle.deriveKey(
              {
                name: 'PBKDF2',
                salt,
                iterations: 100_000,
                hash: 'SHA-256'
              },
              keyMaterial,
              { name: 'AES-GCM', length: 256 },
              false,
              ['decrypt']
            );

            const decBuf = await window.crypto.subtle.decrypt(
              { name: 'AES-GCM', iv },
              key,
              ciphertext
            );
            const dec = new TextDecoder();
            decryptedJson = dec.decode(decBuf);
          } catch {
            return {
              success: false,
              stats: { personasAdded: 0, conversationsAdded: 0, messagesAdded: 0, rulesAdded: 0, charactersAdded: 0 },
              error: 'Decryption failed: Incorrect password or corrupted vault file.'
            };
          }
        } else {
          return {
            success: false,
            stats: { personasAdded: 0, conversationsAdded: 0, messagesAdded: 0, rulesAdded: 0, charactersAdded: 0 },
            error: 'This vault was encrypted with WebCrypto AES-GCM, which requires HTTPS or localhost.'
          };
        }
      }

      const payload: WardenVaultPayload = JSON.parse(decryptedJson);

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
   * Downloads or shares the .warden backup file across desktop and Android mobile
   */
  public async downloadVaultFile(
    blob: Blob,
    filename: string,
    rawContent?: string
  ): Promise<{ method: 'native' | 'share' | 'download' | 'clipboard'; path?: string }> {
    // 1. Android APK Native Bridge: Direct save into Download/Warden/ without user prompts
    if (typeof window !== 'undefined' && (window as any).WardenNativeBridge?.saveFileToDownloads) {
      try {
        const text = rawContent || (await blob.text());
        const resStr = (window as any).WardenNativeBridge.saveFileToDownloads(
          filename,
          text,
          false,
          'Warden'
        );
        const res = typeof resStr === 'string' ? JSON.parse(resStr) : resStr;
        if (res?.success) {
          return { method: 'native', path: res.path };
        }
      } catch (err) {
        console.warn('[WardenVaultService] Native bridge save failed, trying share fallback:', err);
      }
    }

    // 2. Android & Mobile Web Share API:
    // Android WebViews do NOT support downloading blob: URLs via <a> tags.
    // navigator.share with File invokes Android's native system share sheet ("Save to Downloads", "Google Drive", etc.)
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        const file = new File([blob], filename, { type: 'application/octet-stream' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: filename,
            text: 'Warden AI Encrypted Backup Vault'
          });
          return { method: 'share' };
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return { method: 'share' };
        }
        console.warn('[WardenVaultService] Native file share failed, trying anchor fallback:', err);
      }
    }

    // 2. Standard Browser anchor download fallback (Desktop Chrome, Firefox, Edge, Safari)
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return { method: 'download' };
    } catch (err) {
      console.warn('[WardenVaultService] Anchor download failed:', err);
    }

    // 3. Fallback: Copy to clipboard if available
    if (rawContent && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(rawContent);
        return { method: 'clipboard' };
      } catch {}
    }

    return { method: 'download' };
  }
}

export const wardenVaultService = new WardenVaultService();
