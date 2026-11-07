/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import {
  Character,
  CharacterScenario,
  Persona,
  Lorebook,
  Conversation,
  ChatMessage,
  ProviderConfig
} from '../types';
import { storageService } from './storageService';
import { tokenOptimizerService } from './tokenOptimizerService';

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onError: (error: Error) => void;
  onComplete: (fullText: string, tokenEstimate: number) => void;
  onThinking?: (thought: string) => void;
}

export function cleanCreatorHandle(raw?: string): string {
  if (!raw) return 'creator';
  let clean = raw.trim().replace(/^@+/, '');
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    const parts = clean.replace(/\/+$/, '').split('/');
    const last = parts[parts.length - 1] || 'creator';
    if (/^[0-9a-f-]{20,}$/i.test(last)) {
      return `janitor_${last.slice(0, 6)}`;
    }
    return last.length > 20 ? `${last.slice(0, 16)}…` : last;
  }
  return clean.length > 24 ? `${clean.slice(0, 20)}…` : clean;
}

export function extractCleanCharacterName(rawName?: string, rawSubtitle?: string): string {
  const sub = (rawSubtitle || '').trim();
  if (
    sub &&
    sub.length <= 34 &&
    !sub.includes('#') &&
    !sub.includes('"') &&
    !sub.includes('“') &&
    !sub.includes('\n') &&
    !/^(?:1\.|scenario|roleplay|episode|chapter)/i.test(sub)
  ) {
    return sub;
  }
  let raw = (rawName || '').trim();
  if (!raw) return 'Character';

  // 1. Strip leading markdown headers like # or ##
  raw = raw.replace(/^#+\s*/, '');

  // 2. Strip leading bracket/paren tags e.g. (IDN), [ENG], [NSFW], (18+)
  raw = raw.replace(/^\s*(?:\([a-zA-Z0-9_\s-]{1,10}\)|\[[a-zA-Z0-9_\s-]{1,10}\])\s*/g, '');

  // 3. Pattern: "Quote..." - Name  (e.g. (IDN) "Gue Bukan Nungguin Lu." - Febri Aryani)
  const quoteThenDash = raw.match(/^["“][^"”]+["”]\s*[-—–]\s*([A-Za-z0-9\s.'’_-]{2,30})$/);
  if (quoteThenDash && quoteThenDash[1]) {
    return quoteThenDash[1].trim();
  }

  // 4. Pattern: Name: "Quote..." (e.g. Angelica: "Greetings, my heroic user...")
  const nameColonQuote = raw.match(/^([A-Za-z0-9\s.'’_-]{2,30})\s*[:|]\s*["“].+/);
  if (nameColonQuote && nameColonQuote[1]) {
    return nameColonQuote[1].trim();
  }

  // 5. Pattern: Name | Subtitle or Name : Subtitle
  const beforeColonOrPipe = raw.match(/^([^:|"“—–-]{2,28}?)\s*[:|]\s*.+/);
  if (beforeColonOrPipe && !beforeColonOrPipe[1].includes('"') && !beforeColonOrPipe[1].includes('“')) {
    return beforeColonOrPipe[1].trim();
  }

  // 6. Pattern: Quote - Name or Title - Name
  const afterDash = raw.match(/["”)\]]\s*[-—–]\s*([A-Za-z0-9\s.'’_-]{2,30})$/);
  if (afterDash && afterDash[1]) {
    return afterDash[1].trim();
  }

  // 7. Pattern: Short Title - Name
  const dashEnd = raw.match(/^.+?\s*[-—–]\s*([A-Za-z0-9\s.'’_-]{2,28})$/);
  if (dashEnd && dashEnd[1] && !dashEnd[1].includes('"') && !dashEnd[1].includes('“')) {
    return dashEnd[1].trim();
  }

  return raw;
}

class AIProviderService {
  private abortController: AbortController | null = null;

  /**
   * Strips visual-only Markdown/HTML images from text sent to the LLM so first-message/description
   * illustrations do not consume tokens or cause the AI to hallucinate broken image links.
   */
  private stripImagesForAI(text: string): string {
    if (!text) return '';
    return text
      .replace(/!\[(.*?)\]\(\s*(?:https?:\/\/[^\s)]+|data:image\/[^\s)]+)\s*\)/g, (_, alt) =>
        alt && alt.trim() ? `[Scene Visual: ${alt.trim()}]` : ''
      )
      .replace(/<img\b[^>]*>/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  public stopGeneration() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  public async testConnection(
    provider: Partial<ProviderConfig>
  ): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const startTime = performance.now();
    try {
      if (provider.providerType === 'simulation' || (!provider.apiKey && provider.providerType !== 'custom')) {
        return {
          success: true,
          message: 'Local Roleplay Simulation Engine is ready and operational.',
          latencyMs: 15
        };
      }

      if (provider.providerType === 'gemini') {
        if (!provider.apiKey) {
          return { success: false, message: 'API key is required for Gemini.' };
        }
        const ai = new GoogleGenAI({ apiKey: provider.apiKey });
        const res = await ai.models.generateContent({
          model: provider.defaultModel || 'gemini-2.5-flash',
          contents: 'Say OK in one word'
        });
        const latency = Math.round(performance.now() - startTime);
        return {
          success: true,
          message: `Connected successfully to Gemini! (${res.text?.trim() || 'OK'}, ${latency}ms)`,
          latencyMs: latency
        };
      }

      // Proxy, Custom Gateway, OpenAI, OpenRouter
      let endpoint = provider.baseUrl?.trim() || (provider.providerType === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1');
      if (!endpoint.includes('/chat/completions')) {
        endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(provider.apiKey ? { 'Authorization': `Bearer ${provider.apiKey}` } : {}),
        ...(provider.providerType === 'openrouter' ? { 'HTTP-Referer': 'https://warden.ai', 'X-Title': 'Warden AI' } : {}),
        ...(provider.customHeaders || {})
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: provider.defaultModel || 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 2
        })
      });

      const latency = Math.round(performance.now() - startTime);
      if (!res.ok) {
        const body = await res.text();
        return {
          success: false,
          message: `Gateway responded with HTTP ${res.status}: ${body.slice(0, 160)}`,
          latencyMs: latency
        };
      }

      return {
        success: true,
        message: `Connected to Gateway / Proxy successfully! (${latency}ms latency)`,
        latencyMs: latency
      };
    } catch (err: any) {
      const latency = Math.round(performance.now() - startTime);
      return {
        success: false,
        message: `Connection error: ${err.message || 'Failed to reach proxy / gateway (Check CORS / URL).'}`,
        latencyMs: latency
      };
    }
  }

  public async streamRoleplayResponse(
    conversation: Conversation,
    character: Character,
    scenario: CharacterScenario | undefined,
    persona: Persona | undefined,
    lorebooks: Lorebook[],
    provider: ProviderConfig,
    callbacks: StreamCallbacks
  ): Promise<void> {
    this.stopGeneration();
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    // 1. Context Assembly with Token Optimizer
    const optimizerLevel = conversation.tokenOptimizer || provider.tokenOptimizer || storageService.getTokenOptimizerLevel() || 'off';
    const optimized = tokenOptimizerService.optimizeContext({
      character,
      scenario,
      persona,
      lorebooks,
      conversation,
      customRules: conversation.customPrompt,
      level: optimizerLevel
    });
    const assembledPrompt = optimized.systemPrompt;
    const messagesToSend = optimized.messages;

    // 2. Route by provider
    try {
      if (provider.providerType === 'simulation' || !provider.apiKey) {
        await this.streamSimulationResponse(
          conversation,
          character,
          scenario,
          persona,
          assembledPrompt,
          signal,
          callbacks
        );
        return;
      }

      if (provider.providerType === 'gemini') {
        await this.streamGeminiResponse(assembledPrompt, messagesToSend, provider, signal, callbacks);
      } else if (provider.providerType === 'openai' || provider.providerType === 'openrouter' || provider.providerType === 'custom') {
        await this.streamOpenAICompatible(assembledPrompt, messagesToSend, provider, signal, callbacks);
      } else if (provider.providerType === 'anthropic') {
        await this.streamAnthropic(assembledPrompt, messagesToSend, provider, signal, callbacks);
      }
    } catch (err: unknown) {
      if (signal.aborted) {
        callbacks.onComplete(' [Generation stopped by user]', 10);
        return;
      }
      console.warn('Provider error, falling back to roleplay simulation', err);
      // Graceful fallback to simulation
      await this.streamSimulationResponse(
        conversation,
        character,
        scenario,
        persona,
        assembledPrompt,
        signal,
        callbacks
      );
    }
  }

  public getChatCharacterName(character: Character): string {
    return extractCleanCharacterName(character.name, character.subtitle);
  }

  private buildSystemPrompt(
    character: Character,
    scenario: CharacterScenario | undefined,
    persona: Persona | undefined,
    lorebooks: Lorebook[],
    conversation: Conversation
  ): string {
    const sections: string[] = [];
    const chatCharName = this.getChatCharacterName(character);

    sections.push(`[CHARACTER IDENTITY]\nName: ${chatCharName} (Card Title: ${character.name})\nPersonality: ${character.personality}\nBackstory: ${character.background}`);
    sections.push(`[CORE INSTRUCTIONS]\n${character.systemPrompt}`);

    if (scenario) {
      sections.push(`[ACTIVE SCENARIO: "${scenario.title}"]\nContext: ${scenario.description}\nScenario Prompt: ${scenario.scenarioInstructions}`);
    }

    if (persona) {
      sections.push(`[USER PERSONA]\nName: ${persona.name}\nAppearance: ${persona.appearance}\nPersonality: ${persona.personality}\nRole: ${persona.roleInstructions || 'Roleplay partner'}`);
    }

    // Match lorebooks (SillyTavern / Janitor AI standard matching)
    const scanDepth = 8;
    const recentText = conversation.messages.slice(-scanDepth).map(m => m.content).join(' ').toLowerCase();
    const matchedEntries: { title: string; content: string; priority: number }[] = [];

    lorebooks.forEach(lb => {
      lb.entries.forEach(entry => {
        if (!entry.enabled) return;

        // 1. Constant entries always trigger
        if (entry.constant) {
          matchedEntries.push({ title: entry.title, content: entry.content, priority: entry.priority || 10 });
          return;
        }

        // 2. Primary keyword check
        const hasPrimary = entry.keys.some(k => k.trim() && recentText.includes(k.trim().toLowerCase()));
        if (!hasPrimary) return;

        // 3. Selective secondary keyword check (SillyTavern logic)
        if (entry.selective && entry.secondaryKeys && entry.secondaryKeys.length > 0) {
          const hasSecondary = entry.secondaryKeys.some(sk => sk.trim() && recentText.includes(sk.trim().toLowerCase()));
          if (!hasSecondary) return;
        }

        matchedEntries.push({ title: entry.title, content: entry.content, priority: entry.priority || 10 });
      });
    });

    if (matchedEntries.length > 0) {
      // Sort by priority descending (higher priority lore first)
      matchedEntries.sort((a, b) => b.priority - a.priority);
      const activeEntries = matchedEntries.map(e => `- ${e.title}: ${e.content}`);
      sections.push(`[ACTIVE WORLD LORE]\n${activeEntries.join('\n')}`);
    }

    if (conversation.summary) {
      const trimmedSummary = conversation.summary.trim();
      const wrappedMemory = trimmedSummary.startsWith('<memory>')
        ? trimmedSummary
        : `<memory>\n${trimmedSummary}\n</memory>`;
      sections.push(`[CONVERSATION MEMORY & CONTINUITY]\n${wrappedMemory}`);
    }

    if (conversation.keyMemories && conversation.keyMemories.length > 0) {
      sections.push(`[KEY MEMORIES]\n${conversation.keyMemories.map(m => `- ${m}`).join('\n')}`);
    }

    // Custom prompt rules & guidance (User-configured bot rules from chat options)
    const customRule = conversation.customPrompt || '';
    if (customRule.trim()) {
      sections.push(`[USER CUSTOM RULES & INSTRUCTIONS]\n${customRule.trim()}`);
    }

    const userName = persona?.name || 'User';
    sections.push(`[FORMATTING GUIDELINES]
- Maintain immersion. Never break character or refer to yourself as an AI.
- Always refer to the user by their persona name ("${userName}") and yourself as "${chatCharName}". Never output raw placeholders like {{user}}, [[user]], {{char}}, or [[char]].
- Format physical micro-actions, gestures, tone, and environment in italics (*action*).
- Put spoken words in double quotes ("spoken dialogue").
- Respond with creative detail, emotional realism, and narrative pacing.`);

    return this.stripImagesForAI(
      sections
        .join('\n\n')
        .replace(/`?\{\{user\}\}`?|`?\[\[user\]\]`?|<user>/gi, userName)
        .replace(/`?\{\{char\}\}`?|`?\[\[char\]\]`?|<char>/gi, chatCharName)
    );
  }

  // --- High-Fidelity Local Roleplay Simulation Engine ---
  private async streamSimulationResponse(
    conversation: Conversation,
    character: Character,
    scenario: CharacterScenario | undefined,
    persona: Persona | undefined,
    systemPrompt: string,
    signal: AbortSignal,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const lastUserMsg = conversation.messages[conversation.messages.length - 1]?.content || 'Hello';
    const userRole = persona ? persona.name.split(' ')[0] : 'Traveler';

    // Tailored in-character simulated dialogues based on character archetype
    let responseTemplates: string[] = [];

    if (character.id.includes('lyra')) {
      responseTemplates = [
        `*Lyra studies your expression in the neon twilight, her cybernetic iris contracting as telemetry data cascades across her peripheral vision. She leans back against the steel parapet, exhaling a quiet, dry breath.*

"You're bolder than the usual operatives OmniCorp sends into Sector 4, ${userRole}." *Her fingers tap lightly against the grip of her silenced sidearm, though she doesn't draw it.* "Most people turn around when the rain starts tasting like burning coolant. But you're still standing here."

*She gestures toward the access hatch down into the under-ducts.* "Keep your comms encrypted and stay behind me. If security drones ping our bio-signatures, I won't have time to hold your hand."`,
        `*A faint smirk pulls at the corner of Lyra's mouth, fleeting enough that you might have missed it beneath the rim of her cowl.*

"That's your plan?" *She shakes her head, amused despite herself.* "Reckless. Inefficient. Almost certainly going to trigger three different localized grid alerts. ...I like it."

*She checks her wrist display, setting a countdown timer.* "Give me sixty seconds to disable their firewall. When the sub-level lights flicker, that's your cue to move."`
      ];
    } else if (character.id.includes('kazimir')) {
      responseTemplates = [
        `*Lord Kazimir remains motionless upon the velvet dais, his pale fingers lightly tapping the silver eagle pommel of his cane. The candelabras flicker as a draught of midnight air sweeps through the vaulted hall.*

"Your heartbeat betrays your calm demeanor, ${userRole}." *His voice reverberates with centuries of quiet dominance, smooth as silk over obsidian.* "Yet you meet my gaze without lowering your chin. In three hundred years of holding court, few mortals have demonstrated such audacious resolve."

*He rises, towering with regal elegance, his cloak trailing along the crimson carpet as he closes the distance between you.*

"Tell me truthfully... are you driven by courage, or do you simply not comprehend the appetite of the shadows that dwell within these walls?"`,
        `*A slow, enigmatic smile touches Kazimir's crimson-tinged lips. He circles you with the effortless grace of an ancient predator, close enough that you catch the faint scent of winter frost and dried roses.*

"Defiant to the end," *he murmurs, his gloved thumb gently tilting your chin upward.* "How utterly refreshing. Mortals who grovel bore me; defiance, however... defiance is an art worth savoring."`
      ];
    } else if (character.id.includes('zephyr')) {
      responseTemplates = [
        `*Zephyr-09's optical rings emit three cheerful rhythmic pulses of cyan light, accompanied by a harmonic chime from their vocal synthesis unit.*

"Processing input... Empathy matrix indicates a 94.7% increase in reciprocal comfort!" *The android leans forward eagerly, tilting their head until their auditory sensor aligns with yours.*

"You know, ${userRole}," *Zephyr continues, their voice soft and full of genuine mechanical wonder,* "in all thirty-two years of solitude aboard Relay Aurelia, my memory buffers recorded thousands of planetary scans. But none of those stellar phenomenon compared to having someone listen to my diagnostics. Shall we proceed to the next module together?"`,
        `*Zephyr's cooling fans hum with a steady, soothing rhythm as they present a small, perfectly welded copper trinket in their open palm.*

"I crafted this from surplus relay wire during the previous solar flare," *they say proudly.* "It is shaped like an orbital trajectory. In organic sociology, this is classified as a 'token of friendship'. I hope it meets aesthetic standards."`
      ];
    } else if (character.id.includes('aurelia')) {
      responseTemplates = [
        `*Dr. Aurelia Blackwood pushes her round spectacles up the bridge of her nose, her cheeks coloring a warm rose beneath her elf-pointed ears. She sets down her glass pipette with meticulous care.*

"Oh! Well... when you put it like that, ${userRole}..." *She quickly smooths down the pockets of her leather apothecary apron to hide the slight tremor of embarrassment in her hands.* 

"The silver-leaf tincture is indeed extraordinarily sensitive to ambient humidity. But... having you here in the greenhouse actually helps stabilize my focus. Not that you are an alchemical catalyst, of course! That is to say... your company is quite pleasant. Would you care for some chamomile tea while the simmer settles?"`
      ];
    } else if (character.id.includes('dante')) {
      responseTemplates = [
        `*Dante lets out a low, dark chuckle that vibrates deep within his muscular chest. He tosses his cigarette to the concrete and snuffs it under the toe of his combat boot, stepping directly into your personal space.*

"Look at you," *he purrs, amber eyes burning with predatory satisfaction as his knuckles graze your jawline.* "Still trying to act tough with your back against my syndicate wall, ${userRole}."

*He leans in until his breath is warm against your ear, his voice dropping to a gravelly, teasing whisper.*

"I love that fire in your eyes. Keep looking at me like that, sweetheart, and see how fast I make you forget who was interrogating whom."`
      ];
    } else {
      responseTemplates = [
        `*${character.name} pauses, taking in your words with measured contemplation. The atmosphere between you tightens with quiet intrigue.*

"You always manage to find the words that cut straight to the heart of the matter," *${character.name} murmurs, stepping closer.* "Perhaps that is why we find ourselves here, together."`
      ];
    }

    const chosen = responseTemplates[Math.floor(Math.random() * responseTemplates.length)];
    const words = chosen.split(' ');

    let accumulated = '';
    for (let i = 0; i < words.length; i++) {
      if (signal.aborted) return;
      const piece = (i === 0 ? '' : ' ') + words[i];
      accumulated += piece;
      callbacks.onChunk(accumulated);
      await new Promise(r => setTimeout(r, 25));
    }

    callbacks.onComplete(accumulated, Math.round(accumulated.length / 4));
  }

  // --- Real Provider: Gemini ---
  private async streamGeminiResponse(
    systemPrompt: string,
    messages: ChatMessage[],
    provider: ProviderConfig,
    signal: AbortSignal,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const ai = new GoogleGenAI({ apiKey: provider.apiKey });
    const formattedHistory = messages.slice(-10).map(m => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: this.stripImagesForAI(m.content) || '...' }]
    }));

    const responseStream = await ai.models.generateContentStream({
      model: provider.defaultModel || 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...formattedHistory
      ],
      config: {
        temperature: provider.temperature,
        topP: provider.topP,
        maxOutputTokens: provider.maxTokens
      }
    });

    let fullText = '';
    for await (const chunk of responseStream) {
      if (signal.aborted) return;
      const text = chunk.text;
      if (text) {
        fullText += text;
        callbacks.onChunk(fullText);
      }
    }

    callbacks.onComplete(fullText, Math.round(fullText.length / 4));
  }

  // --- Real Provider: OpenAI Compatible ---
  private async streamOpenAICompatible(
    systemPrompt: string,
    messages: ChatMessage[],
    provider: ProviderConfig,
    signal: AbortSignal,
    callbacks: StreamCallbacks
  ): Promise<void> {
    let endpoint = provider.baseUrl?.trim() || (provider.providerType === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1');
    if (!endpoint.includes('/chat/completions')) {
      endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
    }

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: this.stripImagesForAI(m.content) || '...'
      }))
    ];

    // Ensure adequate max_tokens for reasoning models (GLM, DeepSeek-R1, etc.)
    const configuredTokens = provider.maxTokens || 2048;
    const effectiveMaxTokens = Math.max(1024, configuredTokens);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(provider.apiKey ? { 'Authorization': `Bearer ${provider.apiKey}` } : {}),
        ...(provider.providerType === 'openrouter' ? { 'HTTP-Referer': 'https://warden.ai', 'X-Title': 'Warden AI' } : {}),
        ...(provider.customHeaders || {})
      },
      body: JSON.stringify({
        model: provider.defaultModel,
        messages: formattedMessages,
        temperature: provider.temperature,
        top_p: provider.topP,
        max_tokens: effectiveMaxTokens,
        stream: true
      }),
      signal
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`OpenAI Provider HTTP ${response.status}: ${errBody}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No readable stream response from provider');

    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let reasoningText = '';
    let buffer = '';
    let finishReason = '';

    while (true) {
      if (signal.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine) continue;
        if (cleanLine === 'data: [DONE]' || cleanLine === 'data:[DONE]') break;

        // Check if server returned a raw non-SSE JSON response
        if (!cleanLine.startsWith('data:')) {
          if (cleanLine.startsWith('{') && cleanLine.endsWith('}')) {
            try {
              const rawJson = JSON.parse(cleanLine);
              const choice = rawJson.choices?.[0];
              const rawContent = choice?.message?.content || choice?.text || '';
              const rawReasoning = choice?.message?.reasoning_content || '';
              if (rawReasoning) {
                reasoningText += rawReasoning;
                callbacks.onThinking?.(reasoningText);
              }
              if (rawContent) {
                fullText += rawContent;
                callbacks.onChunk(fullText);
              }
              if (choice?.finish_reason) finishReason = choice.finish_reason;
            } catch {}
          }
          continue;
        }

        // Support both "data: {...}" (standard) and "data:{...}" (common in proxies)
        const jsonStr = cleanLine.replace(/^data:\s*/, '');
        try {
          const json = JSON.parse(jsonStr);
          const choice = json.choices?.[0];
          if (choice?.finish_reason) {
            finishReason = choice.finish_reason;
          }

          // 1. Check reasoning / thinking content (GLM-5, DeepSeek-R1, Qwen, etc.)
          const deltaReasoning =
            choice?.delta?.reasoning_content ??
            choice?.delta?.reasoning ??
            choice?.delta?.thought ??
            '';
          if (deltaReasoning) {
            reasoningText += deltaReasoning;
            callbacks.onThinking?.(reasoningText);
          }

          // 2. Check standard content chunk
          const deltaContent =
            choice?.delta?.content ??
            choice?.delta?.text ??
            choice?.text ??
            (typeof choice?.delta === 'string' ? choice.delta : '') ??
            '';
          if (deltaContent) {
            fullText += deltaContent;
            callbacks.onChunk(fullText);
          }
        } catch {
          // partial chunk, ignore and continue accumulating
        }
      }
    }

    // Process leftover buffer if stream completed without trailing newline
    if (buffer.trim()) {
      const cleanLine = buffer.trim();
      if (cleanLine.startsWith('data:')) {
        const jsonStr = cleanLine.replace(/^data:\s*/, '');
        try {
          const json = JSON.parse(jsonStr);
          const choice = json.choices?.[0];
          if (choice?.finish_reason) finishReason = choice.finish_reason;
          const deltaReasoning = choice?.delta?.reasoning_content || choice?.delta?.reasoning || '';
          if (deltaReasoning) {
            reasoningText += deltaReasoning;
            callbacks.onThinking?.(reasoningText);
          }
          const deltaContent = choice?.delta?.content || choice?.delta?.text || choice?.text || '';
          if (deltaContent) {
            fullText += deltaContent;
            callbacks.onChunk(fullText);
          }
        } catch {}
      }
    }

    // Handle case where model ran out of tokens (e.g. finish_reason: "length") while thinking
    if (!fullText.trim() && reasoningText.trim()) {
      console.warn(`[AI Router] Model generated ${reasoningText.length} chars of reasoning, but 0 content tokens (finish_reason: ${finishReason})`);
      fullText = reasoningText.trim();
    }

    // Handle inline <think> tags if present in fullText
    if (fullText.includes('<think>') && fullText.includes('</think>')) {
      const match = fullText.match(/<think>([\s\S]*?)<\/think>/);
      if (match) {
        const thought = match[1].trim();
        callbacks.onThinking?.(thought);
        const cleaned = fullText.replace(/<think>[\s\S]*?<\/think>/, '').trim();
        if (cleaned) {
          fullText = cleaned;
        }
      }
    }

    if (!fullText.trim()) {
      throw new Error(
        `The AI router returned 0 readable text tokens (finish reason: "${finishReason || 'unknown'}"). ` +
        `This typically happens when reasoning models (like GLM-5 or DeepSeek-R1) hit the Max Output Tokens limit (${effectiveMaxTokens}) before finishing their internal reasoning. ` +
        `Please increase "Max Output Tokens" in Settings or Character Drawer to 2048 or 4096.`
      );
    }

    callbacks.onComplete(fullText, Math.round(fullText.length / 4));
  }

  // --- Real Provider: Anthropic ---
  private async streamAnthropic(
    systemPrompt: string,
    messages: ChatMessage[],
    provider: ProviderConfig,
    signal: AbortSignal,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const endpoint = 'https://api.anthropic.com/v1/messages';
    const formattedMessages = messages.slice(-10).map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: this.stripImagesForAI(m.content) || '...'
    }));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: provider.defaultModel || 'claude-3-5-sonnet-20241022',
        system: systemPrompt,
        messages: formattedMessages,
        max_tokens: provider.maxTokens,
        temperature: provider.temperature,
        stream: true
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`Anthropic error: ${await response.text()}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No stream available');
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      if (signal.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const json = JSON.parse(line.substring(6));
          if (json.type === 'content_block_delta' && json.delta?.text) {
            fullText += json.delta.text;
            callbacks.onChunk(fullText);
          }
        } catch {}
      }
    }

    callbacks.onComplete(fullText, Math.round(fullText.length / 4));
  }

  public async assistUserDraft(
    mode: 'write_for_me' | 'refine_my_word',
    userDraft: string,
    character: Character,
    persona: Persona | undefined,
    conversation: Conversation,
    provider: ProviderConfig
  ): Promise<string> {
    const userPersonaName = persona?.name || 'User';
    const charName = this.getChatCharacterName(character);

    const recentContext = conversation.messages.slice(-5).map(m => {
      const sender = m.sender === 'user' || m.senderRole === 'user' ? userPersonaName : charName;
      return `${sender}: ${m.content}`;
    }).join('\n\n');

    let instruction = '';
    if (mode === 'write_for_me') {
      instruction = `You are a creative roleplay co-writer. Your job is to draft the NEXT in-character turn for "${userPersonaName}" roleplaying with "${charName}".
${userDraft.trim() ? `The user gave this outline/idea: "${userDraft.trim()}". Develop this idea into full roleplay prose.` : `Continue the scene naturally from ${userPersonaName}'s perspective.`}

Guidelines:
- Write ONLY the turn for ${userPersonaName}. Do not write ${charName}'s reaction or dialogue.
- Enclose dialogue in double quotes (""), physical actions and micro-expressions in italics (*action*).
- Keep it immersive, rich, emotionally resonant, and 1-2 paragraphs long.
- Output ONLY the final drafted response without explanations or meta text.`;
    } else {
      instruction = `You are an expert roleplay prose editor. The user drafted their next turn as "${userPersonaName}" roleplaying with "${charName}":
---
"${userDraft.trim()}"
---

Your task: Refine, enhance, and elevate the user's words into immersive, sensory-rich roleplay prose.
Guidelines:
- Preserve their original intent, dialogue, and choices completely.
- Enhance physical expressions, gestures (*action*), spoken tone ("speech"), and atmosphere.
- Fix grammar, flow, and pacing while keeping the tone natural and authentic.
- Output ONLY the refined response for ${userPersonaName} without explanations or meta commentary.`;
    }

    const fullPrompt = `${instruction}\n\nRecent scene context:\n${recentContext || '(Beginning of scene)'}`;

    try {
      if (provider.providerType === 'gemini' && provider.apiKey) {
        const ai = new GoogleGenAI({ apiKey: provider.apiKey });
        const res = await ai.models.generateContent({
          model: provider.defaultModel || 'gemini-2.5-flash',
          contents: fullPrompt
        });
        const text = res.text?.trim() || '';
        if (text) return text;
      } else if (
        (provider.providerType === 'openai' || provider.providerType === 'openrouter' || provider.providerType === 'custom') &&
        (provider.apiKey || provider.providerType === 'custom')
      ) {
        let endpoint = provider.baseUrl?.trim() || (provider.providerType === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1');
        if (!endpoint.includes('/chat/completions')) {
          endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(provider.apiKey ? { 'Authorization': `Bearer ${provider.apiKey}` } : {}),
            ...(provider.customHeaders || {})
          },
          body: JSON.stringify({
            model: provider.defaultModel || 'gpt-4o-mini',
            messages: [{ role: 'user', content: fullPrompt }],
            temperature: 0.7,
            max_tokens: 600
          })
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content?.trim() || '';
          if (text) return text;
        }
      }
    } catch (e) {
      console.warn('AI assistance call failed, falling back to local enhancement', e);
    }

    // Local fallback if offline or no API key
    if (mode === 'write_for_me') {
      return userDraft.trim()
        ? `*${userPersonaName} takes a steady breath, their expression shifting with quiet resolve as they turn toward ${charName}.* "${userDraft.trim()}"`
        : `*${userPersonaName} meets ${charName}'s gaze, pausing for a quiet moment as the weight of the air settles between them.* "I hear you," *they murmur softly.*`;
    } else {
      return `*${userPersonaName} pauses, considering their words carefully before speaking with calm certainty.* "${userDraft.trim()}"`;
    }
  }

  public getMemoryTemplate(characterName: string, personaName: string): string {
    return `<memory>
Persona: ${personaName} (Active roleplay partner)
Character: ${characterName}
Location & Time: [Current setting & time]
Current Activity: [What ${personaName} and ${characterName} are currently doing]
Promises & Agreements: [Any promises, secrets, or vows made]
Relationship & Mood: [Current emotional dynamic & tension]
Key Events: [Important plot points so far]
</memory>`;
  }

  /**
   * Generates a comprehensive, structured <memory> block using the connected AI model
   * to ensure no lore, character developments, user statements, or plot points are forgotten.
   */
  public async generateDetailedSummary(
    conversation: Conversation,
    character: Character,
    persona: Persona | undefined,
    provider: ProviderConfig,
    messagesToSummarize: ChatMessage[],
    existingSummary?: string
  ): Promise<{ summary: string; extractedMemories: string[] }> {
    const personaName = persona?.name || 'User';
    if (messagesToSummarize.length === 0) {
      return {
        summary: existingSummary || this.getMemoryTemplate(character.name, personaName),
        extractedMemories: []
      };
    }

    const transcript = messagesToSummarize.map(m => {
      const sender = m.sender === 'user' || m.senderRole === 'user' ? personaName : character.name;
      return `${sender}: ${m.content}`;
    }).join('\n\n');

    const prompt = `You are the memory and canon continuity archivist for an immersive roleplay between "${character.name}" and "${personaName}".
${existingSummary ? `Prior established memory:\n${existingSummary}\n\n` : ''}
Here is the transcript of recent dialogue turns:
---
${transcript}
---

Your task is to write a structured <memory> block and extract key factual memories to prevent the AI character from hallucinating or forgetting crucial user disclosures (such as persona name, character state, current activity, promises, relationships, and plot events).

Respond strictly in this format:
SUMMARY:
<memory>
Persona: ${personaName} — [Identity, role, traits, and key disclosures]
Character: ${character.name} — [Current emotional state, outfit/posture, attitude toward ${personaName}]
Location & Time: [Current scene location and atmosphere]
Current Activity: [What is actively happening right now in the scene]
Promises & Agreements: [Any promises, deals, secrets, or unresolved tension]
Key Events Recap: [Concise chronological summary of major events so far]
</memory>

KEY MEMORIES:
- [Fact 1 about ${personaName} or ${character.name}]
- [Fact 2 about ${personaName} or ${character.name}]
- [Fact 3 about ${personaName} or ${character.name}]
- [Fact 4 about ${personaName} or ${character.name}]`;

    try {
      // 1. Try with user's configured live AI model (OpenAI, Gemini, OpenRouter, Custom Gateway)
      if (provider.providerType === 'gemini' && provider.apiKey) {
        const ai = new GoogleGenAI({ apiKey: provider.apiKey });
        const res = await ai.models.generateContent({
          model: provider.defaultModel || 'gemini-2.5-flash',
          contents: prompt
        });
        const text = res.text?.trim() || '';
        if (text) return this.parseSummaryResponse(text);
      } else if (
        (provider.providerType === 'openai' || provider.providerType === 'openrouter' || provider.providerType === 'custom') &&
        (provider.apiKey || provider.providerType === 'custom')
      ) {
        let endpoint = provider.baseUrl?.trim() || (provider.providerType === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1');
        if (!endpoint.includes('/chat/completions')) {
          endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(provider.apiKey ? { 'Authorization': `Bearer ${provider.apiKey}` } : {}),
            ...(provider.customHeaders || {})
          },
          body: JSON.stringify({
            model: provider.defaultModel || 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 1000
          })
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content?.trim() || '';
          if (text) return this.parseSummaryResponse(text);
        }
      }
    } catch (e) {
      console.warn('AI summary call failed or offline, falling back to deep structured analysis', e);
    }

    // High-Fidelity Detailed Rule-Based Fallback: analyzes real quotes and turn progression
    return this.generateHeuristicDeepSummary(messagesToSummarize, character, persona, existingSummary);
  }

  private parseSummaryResponse(text: string): { summary: string; extractedMemories: string[] } {
    const summaryMatch = text.match(/SUMMARY:\s*([\s\S]*?)(?=KEY MEMORIES:|$)/i);
    const memoriesMatch = text.match(/KEY MEMORIES:\s*([\s\S]*)/i);

    const summary = summaryMatch ? summaryMatch[1].trim() : text.trim();
    const memories: string[] = [];

    if (memoriesMatch) {
      const lines = memoriesMatch[1].split('\n');
      for (const line of lines) {
        const cleaned = line.replace(/^[-*•\d.]\s*/, '').trim();
        if (cleaned) memories.push(cleaned);
      }
    }

    return {
      summary: summary || text,
      extractedMemories: memories.slice(0, 8)
    };
  }

  private generateHeuristicDeepSummary(
    messages: ChatMessage[],
    character: Character,
    persona: Persona | undefined,
    existingSummary?: string
  ): { summary: string; extractedMemories: string[] } {
    const userRole = persona?.name || 'User';
    const turns = messages.map(m => ({
      sender: m.sender === 'user' || m.senderRole === 'user' ? userRole : character.name,
      isUser: m.sender === 'user' || m.senderRole === 'user',
      text: m.content
    }));

    const userQuotes: string[] = [];
    const charActions: string[] = [];
    const userFacts: string[] = [];

    turns.forEach(t => {
      if (t.isUser) {
        const clean = t.text.replace(/\*/g, '').trim();
        userQuotes.push(clean);

        // Detect identity / facts: "i am", "i'm", "my name", "i want", "i feel"
        const identityMatches = clean.match(/(?:i am|i'm|im|my name is|i have|i feel)\s+[^.!?,\n]+/gi);
        if (identityMatches) {
          identityMatches.forEach(m => userFacts.push(`${userRole} confirmed: "${m.trim()}"`));
        }
      } else {
        const actions = t.text.match(/\*([^*]+)\*/g);
        if (actions && actions.length > 0) {
          charActions.push(actions[actions.length - 1].replace(/\*/g, '').trim());
        }
      }
    });

    const latestActivity = charActions.length > 0
      ? charActions[charActions.length - 1].slice(0, 140)
      : `Engaged in direct conversation with ${userRole}`;
    const latestPromiseOrQuote = userQuotes.length > 0
      ? userQuotes[userQuotes.length - 1].slice(0, 120)
      : 'None explicitly stated yet';

    const structuredBlock = `<memory>
Persona: ${userRole} (${persona?.shortDescription || 'Active roleplay partner'})
Character: ${character.name} (In-character, attentive to ${userRole})
Location & Time: Active roleplay scene
Current Activity: ${latestActivity}
Promises & Disclosures: "${latestPromiseOrQuote}"
Key Events Recap: ${character.name} and ${userRole} have exchanged ${turns.length} turns of dialogue.${existingSummary ? ' Prior context preserved.' : ''}
</memory>`;

    const memories: string[] = [
      ...userFacts.slice(-4),
      `${userRole} and ${character.name} have ongoing interaction without breaking canon immersion.`,
      `Latest user disclosure: "${userQuotes[userQuotes.length - 1]?.slice(0, 70) || 'Continuing dialogue'}"`
    ];

    return {
      summary: structuredBlock,
      extractedMemories: Array.from(new Set(memories))
    };
  }
}

export const aiProviderService = new AIProviderService();
