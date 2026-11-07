/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Character,
  CharacterScenario,
  Persona,
  Lorebook,
  Conversation,
  ChatMessage,
  ProviderConfig,
  Tag,
  TagCategory,
  ContentReport,
  RestrictedInvestigation,
  AuditLog,
  FollowRelationship,
  PublicationStatus,
  ContentRating,
  GlobalChatBackground,
  TokenOptimizerLevel
} from '../types';

// Canonical 11-category tags
export const INITIAL_TAGS: Tag[] = [
  // 1. Character Gender
  { id: 'tag_g_male', name: 'Male', slug: 'male', category: 'gender', count: 42 },
  { id: 'tag_g_female', name: 'Female', slug: 'female', category: 'gender', count: 58 },
  { id: 'tag_g_androgynous', name: 'Androgynous', slug: 'androgynous', category: 'gender', count: 18 },
  { id: 'tag_g_nonbinary', name: 'Non-binary', slug: 'non-binary', category: 'gender', count: 24 },
  { id: 'tag_g_genderless', name: 'Genderless', slug: 'genderless', category: 'gender', count: 12 },

  // 2. Romance & Attraction
  { id: 'tag_r_straight', name: 'Straight', slug: 'straight', category: 'romance', count: 35 },
  { id: 'tag_r_wlw', name: 'WLW', slug: 'wlw', category: 'romance', count: 29 },
  { id: 'tag_r_mlm', name: 'MLM', slug: 'mlm', category: 'romance', count: 31 },
  { id: 'tag_r_bisexual', name: 'Bisexual', slug: 'bisexual', category: 'romance', count: 40 },
  { id: 'tag_r_pansexual', name: 'Pansexual', slug: 'pansexual', category: 'romance', count: 21 },
  { id: 'tag_r_lgbtq', name: 'LGBTQ+', slug: 'lgbtq', category: 'romance', count: 52 },
  { id: 'tag_r_gender_neutral', name: 'Gender-neutral romance', slug: 'gender-neutral-romance', category: 'romance', count: 27 },

  // 3. Personality
  { id: 'tag_p_tsundere', name: 'Tsundere', slug: 'tsundere', category: 'personality', count: 38 },
  { id: 'tag_p_kuudere', name: 'Kuudere', slug: 'kuudere', category: 'personality', count: 33 },
  { id: 'tag_p_yandere', name: 'Yandere', slug: 'yandere', category: 'personality', count: 26 },
  { id: 'tag_p_dandere', name: 'Dandere', slug: 'dandere', category: 'personality', count: 19 },
  { id: 'tag_p_deredere', name: 'Deredere', slug: 'deredere', category: 'personality', count: 22 },
  { id: 'tag_p_cold', name: 'Cold', slug: 'cold', category: 'personality', count: 44 },
  { id: 'tag_p_shy', name: 'Shy', slug: 'shy', category: 'personality', count: 25 },
  { id: 'tag_p_flirty', name: 'Flirty', slug: 'flirty', category: 'personality', count: 37 },
  { id: 'tag_p_playful', name: 'Playful', slug: 'playful', category: 'personality', count: 32 },
  { id: 'tag_p_sarcastic', name: 'Sarcastic', slug: 'sarcastic', category: 'personality', count: 28 },
  { id: 'tag_p_protective', name: 'Protective', slug: 'protective', category: 'personality', count: 46 },
  { id: 'tag_p_possessive', name: 'Possessive', slug: 'possessive', category: 'personality', count: 34 },
  { id: 'tag_p_obsessive', name: 'Obsessive', slug: 'obsessive', category: 'personality', count: 23 },
  { id: 'tag_p_dom_pers', name: 'Dominant Personality', slug: 'dominant-personality', category: 'personality', count: 39 },
  { id: 'tag_p_sub_pers', name: 'Submissive Personality', slug: 'submissive-personality', category: 'personality', count: 24 },

  // 4. Relationship Dynamics
  { id: 'tag_rd_f2l', name: 'Friends to Lovers', slug: 'friends-to-lovers', category: 'relationship', count: 41 },
  { id: 'tag_rd_e2l', name: 'Enemies to Lovers', slug: 'enemies-to-lovers', category: 'relationship', count: 54 },
  { id: 'tag_rd_s2l', name: 'Strangers to Lovers', slug: 'strangers-to-lovers', category: 'relationship', count: 36 },
  { id: 'tag_rd_forbidden', name: 'Forbidden Love', slug: 'forbidden-love', category: 'relationship', count: 30 },
  { id: 'tag_rd_slowburn', name: 'Slow Burn', slug: 'slow-burn', category: 'relationship', count: 48 },
  { id: 'tag_rd_unrequited', name: 'Unrequited Love', slug: 'unrequited-love', category: 'relationship', count: 19 },
  { id: 'tag_rd_soulmates', name: 'Soulmates', slug: 'soulmates', category: 'relationship', count: 27 },
  { id: 'tag_rd_rivals', name: 'Rivals', slug: 'rivals', category: 'relationship', count: 35 },
  { id: 'tag_rd_exes', name: 'Exes', slug: 'exes', category: 'relationship', count: 16 },
  { id: 'tag_rd_arranged', name: 'Arranged Marriage', slug: 'arranged-marriage', category: 'relationship', count: 22 },
  { id: 'tag_rd_fake_dating', name: 'Fake Dating', slug: 'fake-dating', category: 'relationship', count: 25 },
  { id: 'tag_rd_love_triangle', name: 'Love Triangle', slug: 'love-triangle', category: 'relationship', count: 18 },
  { id: 'tag_rd_toxic', name: 'Toxic Relationship', slug: 'toxic-relationship', category: 'relationship', count: 20 },
  { id: 'tag_rd_healthy', name: 'Healthy Relationship', slug: 'healthy-relationship', category: 'relationship', count: 31 },

  // 5. Power Dynamics
  { id: 'tag_pd_dom', name: 'Dominant', slug: 'dominant', category: 'power', count: 45 },
  { id: 'tag_pd_sub', name: 'Submissive', slug: 'submissive', category: 'power', count: 32 },
  { id: 'tag_pd_switch', name: 'Switch', slug: 'switch', category: 'power', count: 28 },
  { id: 'tag_pd_imbalance', name: 'Power Imbalance', slug: 'power-imbalance', category: 'power', count: 33 },
  { id: 'tag_pd_authority', name: 'Authority Figure', slug: 'authority-figure', category: 'power', count: 29 },
  { id: 'tag_pd_protector', name: 'Protector', slug: 'protector', category: 'power', count: 37 },
  { id: 'tag_pd_caregiver', name: 'Caregiver', slug: 'caregiver', category: 'power', count: 24 },
  { id: 'tag_pd_brat', name: 'Brat', slug: 'brat', category: 'power', count: 21 },
  { id: 'tag_pd_brat_tamer', name: 'Brat Tamer', slug: 'brat-tamer', category: 'power', count: 26 },

  // 6. Genre
  { id: 'tag_g_fantasy', name: 'Fantasy', slug: 'fantasy', category: 'genre', count: 68 },
  { id: 'tag_g_dark_fantasy', name: 'Dark Fantasy', slug: 'dark-fantasy', category: 'genre', count: 49 },
  { id: 'tag_g_modern', name: 'Modern', slug: 'modern', category: 'genre', count: 52 },
  { id: 'tag_g_historical', name: 'Historical', slug: 'historical', category: 'genre', count: 18 },
  { id: 'tag_g_scifi', name: 'Science Fiction', slug: 'science-fiction', category: 'genre', count: 44 },
  { id: 'tag_g_cyberpunk', name: 'Cyberpunk', slug: 'cyberpunk', category: 'genre', count: 39 },
  { id: 'tag_g_supernatural', name: 'Supernatural', slug: 'supernatural', category: 'genre', count: 47 },
  { id: 'tag_g_horror', name: 'Horror', slug: 'horror', category: 'genre', count: 25 },
  { id: 'tag_g_psych_horror', name: 'Psychological Horror', slug: 'psychological-horror', category: 'genre', count: 21 },
  { id: 'tag_g_thriller', name: 'Thriller', slug: 'thriller', category: 'genre', count: 30 },
  { id: 'tag_g_mystery', name: 'Mystery', slug: 'mystery', category: 'genre', count: 28 },
  { id: 'tag_g_romance', name: 'Romance', slug: 'romance', category: 'genre', count: 65 },
  { id: 'tag_g_comedy', name: 'Comedy', slug: 'comedy', category: 'genre', count: 22 },
  { id: 'tag_g_drama', name: 'Drama', slug: 'drama', category: 'genre', count: 38 },
  { id: 'tag_g_action', name: 'Action', slug: 'action', category: 'genre', count: 43 },
  { id: 'tag_g_adventure', name: 'Adventure', slug: 'adventure', category: 'genre', count: 37 },
  { id: 'tag_g_slice_of_life', name: 'Slice of Life', slug: 'slice-of-life', category: 'genre', count: 29 },
  { id: 'tag_g_post_apoc', name: 'Post-Apocalyptic', slug: 'post-apocalyptic', category: 'genre', count: 26 },
  { id: 'tag_g_dystopian', name: 'Dystopian', slug: 'dystopian', category: 'genre', count: 31 },
  { id: 'tag_g_school_life', name: 'School Life', slug: 'school-life', category: 'genre', count: 24 },
  { id: 'tag_g_college_life', name: 'College Life', slug: 'college-life', category: 'genre', count: 20 },
  { id: 'tag_g_military', name: 'Military', slug: 'military', category: 'genre', count: 19 },
  { id: 'tag_g_crime', name: 'Crime', slug: 'crime', category: 'genre', count: 27 },
  { id: 'tag_g_mafia', name: 'Mafia', slug: 'mafia', category: 'genre', count: 33 },
  { id: 'tag_g_royalty', name: 'Royalty', slug: 'royalty', category: 'genre', count: 28 },

  // 7. Character Species
  { id: 'tag_sp_human', name: 'Human', slug: 'human', category: 'species', count: 56 },
  { id: 'tag_sp_vampire', name: 'Vampire', slug: 'vampire', category: 'species', count: 42 },
  { id: 'tag_sp_werewolf', name: 'Werewolf', slug: 'werewolf', category: 'species', count: 27 },
  { id: 'tag_sp_demon', name: 'Demon', slug: 'demon', category: 'species', count: 35 },
  { id: 'tag_sp_angel', name: 'Angel', slug: 'angel', category: 'species', count: 21 },
  { id: 'tag_sp_elf', name: 'Elf', slug: 'elf', category: 'species', count: 30 },
  { id: 'tag_sp_dragon', name: 'Dragon', slug: 'dragon', category: 'species', count: 24 },
  { id: 'tag_sp_monster', name: 'Monster', slug: 'monster', category: 'species', count: 23 },
  { id: 'tag_sp_android', name: 'Android', slug: 'android', category: 'species', count: 28 },
  { id: 'tag_sp_robot', name: 'Robot', slug: 'robot', category: 'species', count: 17 },
  { id: 'tag_sp_ghost', name: 'Ghost', slug: 'ghost', category: 'species', count: 19 },
  { id: 'tag_sp_alien', name: 'Alien', slug: 'alien', category: 'species', count: 16 },
  { id: 'tag_sp_hybrid', name: 'Hybrid', slug: 'hybrid', category: 'species', count: 29 },

  // 8. Scenario & Setting
  { id: 'tag_sc_school', name: 'School', slug: 'school', category: 'scenario', count: 22 },
  { id: 'tag_sc_university', name: 'University', slug: 'university', category: 'scenario', count: 26 },
  { id: 'tag_sc_workplace', name: 'Workplace', slug: 'workplace', category: 'scenario', count: 30 },
  { id: 'tag_sc_office', name: 'Office', slug: 'office', category: 'scenario', count: 21 },
  { id: 'tag_sc_apartment', name: 'Apartment', slug: 'apartment', category: 'scenario', count: 24 },
  { id: 'tag_sc_kingdom', name: 'Fantasy Kingdom', slug: 'fantasy-kingdom', category: 'scenario', count: 44 },
  { id: 'tag_sc_medieval', name: 'Medieval', slug: 'medieval', category: 'scenario', count: 29 },
  { id: 'tag_sc_modern_city', name: 'Modern City', slug: 'modern-city', category: 'scenario', count: 48 },
  { id: 'tag_sc_space_station', name: 'Space Station', slug: 'space-station', category: 'scenario', count: 23 },
  { id: 'tag_sc_haunted_house', name: 'Haunted House', slug: 'haunted-house', category: 'scenario', count: 17 },
  { id: 'tag_sc_zombie', name: 'Zombie Apocalypse', slug: 'zombie-apocalypse', category: 'scenario', count: 19 },
  { id: 'tag_sc_au', name: 'Alternate Universe', slug: 'alternate-universe', category: 'scenario', count: 32 },
  { id: 'tag_sc_vr', name: 'Virtual Reality', slug: 'virtual-reality', category: 'scenario', count: 18 },

  // 9. Roleplay Style
  { id: 'tag_st_first_meet', name: 'First Meeting', slug: 'first-meeting', category: 'style', count: 58 },
  { id: 'tag_st_est_rel', name: 'Established Relationship', slug: 'established-relationship', category: 'style', count: 43 },
  { id: 'tag_st_char_x_user', name: 'Character x User', slug: 'character-x-user', category: 'style', count: 62 },
  { id: 'tag_st_multi_char', name: 'Multiple Characters', slug: 'multiple-characters', category: 'style', count: 19 },
  { id: 'tag_st_narrator', name: 'Narrator', slug: 'narrator', category: 'style', count: 21 },
  { id: 'tag_st_interactive', name: 'Interactive Story', slug: 'interactive-story', category: 'style', count: 34 },
  { id: 'tag_st_long_form', name: 'Long-Form Roleplay', slug: 'long-form-roleplay', category: 'style', count: 49 },
  { id: 'tag_st_adventure', name: 'Adventure Campaign', slug: 'adventure-campaign', category: 'style', count: 27 },
  { id: 'tag_st_chat_based', name: 'Chat-Based Storytelling', slug: 'chat-based-storytelling', category: 'style', count: 38 },

  // 10. Content Rating
  { id: 'tag_cr_sfw', name: 'SFW', slug: 'sfw', category: 'rating', count: 72 },
  { id: 'tag_cr_mature', name: 'Mature', slug: 'mature', category: 'rating', count: 49 },
  { id: 'tag_cr_nsfw', name: 'NSFW', slug: 'nsfw', category: 'rating', count: 31 },

  // 11. Additional Themes
  { id: 'tag_th_angst', name: 'Angst', slug: 'angst', category: 'theme', count: 42 },
  { id: 'tag_th_hurt_comfort', name: 'Hurt/Comfort', slug: 'hurt-comfort', category: 'theme', count: 39 },
  { id: 'tag_th_fluff', name: 'Fluff', slug: 'fluff', category: 'theme', count: 35 },
  { id: 'tag_th_wholesome', name: 'Wholesome', slug: 'wholesome', category: 'theme', count: 37 },
  { id: 'tag_th_emotional', name: 'Emotional', slug: 'emotional', category: 'theme', count: 41 },
  { id: 'tag_th_tragedy', name: 'Tragedy', slug: 'tragedy', category: 'theme', count: 22 },
  { id: 'tag_th_dark_themes', name: 'Dark Themes', slug: 'dark-themes', category: 'theme', count: 46 },
  { id: 'tag_th_suspense', name: 'Suspense', slug: 'suspense', category: 'theme', count: 34 },
  { id: 'tag_th_jealousy', name: 'Jealousy', slug: 'jealousy', category: 'theme', count: 28 },
  { id: 'tag_th_betrayal', name: 'Betrayal', slug: 'betrayal', category: 'theme', count: 26 },
  { id: 'tag_th_found_family', name: 'Found Family', slug: 'found-family', category: 'theme', count: 33 },
  { id: 'tag_th_comfort', name: 'Comfort Character', slug: 'comfort-character', category: 'theme', count: 36 }
];

export const INITIAL_CHARACTERS: Character[] = [];

const LEGACY_DEMO_CHAR_IDS = new Set([
  'char_aoi_01',
  'char_kuroha_02',
  'char_kaelen_03',
  'char_sylas_04',
  'char_seraphina_05',
  'char_dante_06',
  'char_milo_07',
  'char_elysia_08',
  'char_ren_09',
  'char_valeria_10'
]);

export const INITIAL_PERSONAS: Persona[] = [
  {
    id: 'per_01',
    userId: 'user_creator_03',
    name: 'Vesper (Netrunner Operative)',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    shortDescription: 'Freelance information broker and neural netrunner.',
    appearance: 'Lean build, dark hair cropped short, glowing biometric implants along neck, silver mirror-lens optics, matte black synth-leather jacket.',
    personality: 'Pragmatic, observant, dry wit, calculating, loyal under pressure.',
    background: 'Former military signals technician turned underworld data courier.',
    genderPronouns: 'They/Them',
    roleInstructions: 'Engages with tactical savvy, hacking jargon, and steady composure.',
    isDefault: true,
    createdAt: '2025-08-01'
  },
  {
    id: 'per_02',
    userId: 'user_creator_03',
    name: 'Rowan (Mortal Envoy)',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    shortDescription: 'Diplomat dispatched to negotiate with supernatural courts.',
    appearance: 'Dark tailored traveling coat, silver compass pendant, steady grey eyes.',
    personality: 'Courteous, resilient, inquisitive, refuses to be cowed by immortal power.',
    background: 'Appointed ambassador from the mortal valley councils to navigate dangerous sovereign treaties.',
    genderPronouns: 'He/Him',
    roleInstructions: 'Maintains composure in high-stakes court politics and romantic tension.',
    isDefault: false,
    createdAt: '2025-08-05'
  }
];

export const INITIAL_LOREBOOKS: Lorebook[] = [
  {
    id: 'lb_neon_undercity',
    userId: 'user_creator_03',
    title: 'Neo-Veridia Sector 4 Codex',
    description: 'Factions, cyberware tech, and atmospheric lore for the cyberpunk metropolis.',
    isPublic: true,
    createdAt: '2025-08-01',
    entries: [
      {
        id: 'entry_omnicorp',
        title: 'OmniCorp Security Division',
        keys: ['omnicorp', 'patrol', 'gunship', 'megatower'],
        content: 'OmniCorp is the megalithic corporate conglomerate governing Neo-Veridia. Their black-clad security enforcers deploy autonomous hunter-drones and kinetic sidearms.',
        priority: 10,
        enabled: true
      },
      {
        id: 'entry_neural_tech',
        title: 'Neural Cyberware & Slates',
        keys: ['cyberware', 'neural', 'encryption', 'data slate'],
        content: 'Data slates in Sector 4 use quantum encryption keys that fry biometric hardware if improperly tampered with.',
        priority: 8,
        enabled: true
      }
    ]
  },
  {
    id: 'lb_sanguine_court',
    userId: 'user_admin_01',
    title: 'The Sanguine Court Archives',
    description: 'Rules of the vampire sovereign houses and ancient Blood Covenant.',
    isPublic: true,
    createdAt: '2025-08-05',
    entries: [
      {
        id: 'entry_blood_covenant',
        title: 'The Blood Covenant',
        keys: ['covenant', 'tithe', 'drachenstein', 'mortals'],
        content: 'Established 300 years ago, the Blood Covenant grants mortal villages sovereignty in exchange for seasonal diplomatic envoys.',
        priority: 10,
        enabled: true
      }
    ]
  }
];

export const INITIAL_PROVIDERS: ProviderConfig[] = [
  {
    id: 'prov_sim',
    userId: 'user_creator_03',
    providerType: 'simulation',
    name: 'Built-in Roleplay Simulation Engine',
    apiKey: '',
    defaultModel: 'warden-roleplay-v1',
    temperature: 0.85,
    topP: 0.9,
    maxTokens: 512,
    contextWindow: 4096,
    streaming: true,
    isDefault: true
  },
  {
    id: 'prov_gemini',
    userId: 'user_creator_03',
    providerType: 'gemini',
    name: 'Google Gemini Pro / Flash',
    apiKey: '',
    defaultModel: 'gemini-2.5-flash',
    temperature: 0.8,
    topP: 0.95,
    maxTokens: 1024,
    contextWindow: 32768,
    streaming: true,
    isDefault: false
  },
  {
    id: 'prov_openrouter',
    userId: 'user_creator_03',
    providerType: 'openrouter',
    name: 'OpenRouter (Claude / Llama / Mistral)',
    apiKey: '',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    temperature: 0.8,
    topP: 0.9,
    maxTokens: 1024,
    contextWindow: 16384,
    streaming: true,
    isDefault: false
  },
  {
    id: 'prov_openai',
    userId: 'user_creator_03',
    providerType: 'openai',
    name: 'OpenAI (GPT-4o / GPT-4o-mini)',
    apiKey: '',
    defaultModel: 'gpt-4o',
    temperature: 0.8,
    topP: 0.9,
    maxTokens: 1024,
    contextWindow: 16384,
    streaming: true,
    isDefault: false
  },
  {
    id: 'prov_custom',
    userId: 'user_creator_03',
    providerType: 'custom',
    name: 'AI Gateway / Custom Reverse Proxy',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    temperature: 0.8,
    topP: 0.9,
    maxTokens: 1024,
    contextWindow: 16384,
    streaming: true,
    isDefault: false
  }
];

export const INITIAL_CONVERSATIONS: Conversation[] = [];

export const INITIAL_INVESTIGATIONS: RestrictedInvestigation[] = [
  {
    id: 'inv_case_882',
    caseReference: 'CASE-2025-SEC-882',
    reason: 'Investigating credible report of unauthorized commercial scraping bot network hijacking public roleplay socket endpoints.',
    suspectedViolation: 'API abuse, credential credential exfiltration, terms violation.',
    requestingInvestigatorId: 'user_mod_02',
    requestingInvestigatorName: 'Marcus Sentinel (Moderator)',
    approvingAuthorityId: 'user_admin_01',
    approvingAuthorityName: 'Elena Vance (Administrator)',
    targetUserId: 'user_bot_target_99',
    targetUsername: 'automated_scraper_bot',
    targetConversationId: 'conv_flagged_882',
    allowedMessageRange: { startMessageId: 'msg_882_01', endMessageId: 'msg_882_10' },
    status: 'approved',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    createdAt: '2025-08-29T10:00:00Z',
    approvedAt: '2025-08-29T10:30:00Z'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit_01',
    actorId: 'user_admin_01',
    actorName: 'Elena Vance',
    actorRole: 'admin',
    action: 'APPROVE_INVESTIGATION',
    targetType: 'investigation',
    targetId: 'inv_case_882',
    details: 'Approved time-limited read-only scope for CASE-2025-SEC-882. Expires in 24 hours. Requester and approver strictly separated.',
    timestamp: '2025-08-29T10:30:00Z'
  },
  {
    id: 'audit_02',
    actorId: 'user_mod_02',
    actorName: 'Marcus Sentinel',
    actorRole: 'moderator',
    action: 'APPROVE_CHARACTER',
    targetType: 'character',
    targetId: 'char_kael_01',
    details: 'Verified multi-scenario content rating accuracy (Mature). Published to public discovery.',
    timestamp: '2025-08-11T14:15:00Z'
  }
];

class StorageService {
  private characters: Character[] = [];
  private tags: Tag[] = [];
  private personas: Persona[] = [];
  private lorebooks: Lorebook[] = [];
  private conversations: Conversation[] = [];
  private providers: ProviderConfig[] = [];
  private reports: ContentReport[] = [];
  private investigations: RestrictedInvestigation[] = [];
  private auditLogs: AuditLog[] = [];
  private follows: FollowRelationship[] = [
    { id: 'fol_1', followerId: 'user_creator_03', followingId: 'user_admin_01', createdAt: '2025-08-01' },
    { id: 'fol_2', followerId: 'user_mod_02', followingId: 'user_creator_03', createdAt: '2025-08-02' }
  ];
  private bookmarks: string[] = []; // character IDs
  private likedCharacterIds: string[] = []; // character IDs liked by user

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const savedChars = localStorage.getItem('warden_characters_v9');
      if (savedChars) {
        const loaded: Character[] = JSON.parse(savedChars);
        const filtered = loaded.filter(c => !LEGACY_DEMO_CHAR_IDS.has(c.id));
        this.characters = filtered;
        if (filtered.length !== loaded.length) {
          this.saveCharacters();
        }
      } else {
        this.characters = [];
      }

      const savedTags = localStorage.getItem('warden_tags_v7');
      this.tags = savedTags ? JSON.parse(savedTags) : INITIAL_TAGS;

      const savedPersonas = localStorage.getItem('warden_personas_v7');
      this.personas = savedPersonas ? JSON.parse(savedPersonas) : INITIAL_PERSONAS;

      const savedLorebooks = localStorage.getItem('warden_lorebooks_v7');
      this.lorebooks = savedLorebooks ? JSON.parse(savedLorebooks) : INITIAL_LOREBOOKS;

      const savedConvs = localStorage.getItem('warden_conversations_v9');
      if (savedConvs) {
        const loadedConvs: Conversation[] = JSON.parse(savedConvs);
        const validConvs = loadedConvs.filter(
          c => !LEGACY_DEMO_CHAR_IDS.has(c.characterId) && Array.isArray(c.messages) && c.messages.length > 0
        );
        this.conversations = validConvs;
        if (validConvs.length !== loadedConvs.length) {
          this.saveConversations();
        }
      } else {
        this.conversations = [];
      }

      const savedProviders = localStorage.getItem('warden_providers_v7');
      this.providers = savedProviders ? JSON.parse(savedProviders) : INITIAL_PROVIDERS;

      const savedReports = localStorage.getItem('warden_reports_v7');
      this.reports = savedReports ? JSON.parse(savedReports) : [];

      const savedInvs = localStorage.getItem('warden_investigations_v7');
      this.investigations = savedInvs ? JSON.parse(savedInvs) : INITIAL_INVESTIGATIONS;

      const savedLogs = localStorage.getItem('warden_audit_logs_v7');
      this.auditLogs = savedLogs ? JSON.parse(savedLogs) : INITIAL_AUDIT_LOGS;

      const savedBookmarks = localStorage.getItem('warden_bookmarks_v7');
      this.bookmarks = savedBookmarks
        ? (JSON.parse(savedBookmarks) as string[]).filter(id => !LEGACY_DEMO_CHAR_IDS.has(id))
        : [];

      const savedFollows = localStorage.getItem('warden_follows_v7');
      if (savedFollows) {
        this.follows = JSON.parse(savedFollows);
      }

      const savedLikes = localStorage.getItem('warden_likes_v7');
      this.likedCharacterIds = savedLikes
        ? (JSON.parse(savedLikes) as string[]).filter(id => !LEGACY_DEMO_CHAR_IDS.has(id))
        : [];
    } catch (e) {
      console.error('Storage initialization failed, resetting to defaults', e);
      this.characters = INITIAL_CHARACTERS;
      this.tags = INITIAL_TAGS;
      this.personas = INITIAL_PERSONAS;
      this.lorebooks = INITIAL_LOREBOOKS;
      this.conversations = INITIAL_CONVERSATIONS;
      this.providers = INITIAL_PROVIDERS;
      this.investigations = INITIAL_INVESTIGATIONS;
      this.auditLogs = INITIAL_AUDIT_LOGS;
    }
  }

  private safeSetItem(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`localStorage quota warning on key "${key}", freeing non-essential cache...`, e);
      try {
        // Free up space from older versions or non-essential keys if quota is reached
        ['warden_characters_v7', 'warden_characters_v8', 'warden_conversations_v7', 'warden_conversations_v8', 'warden_audit_logs_v7'].forEach(oldKey => {
          localStorage.removeItem(oldKey);
        });
        localStorage.setItem(key, value);
      } catch (err) {
        console.warn(`Could not persist "${key}" to localStorage (kept in memory):`, err);
      }
    }
  }

  public saveCharacters() {
    this.safeSetItem('warden_characters_v9', JSON.stringify(this.characters));
  }

  public saveTags() {
    this.safeSetItem('warden_tags_v7', JSON.stringify(this.tags));
  }

  public savePersonas() {
    this.safeSetItem('warden_personas_v7', JSON.stringify(this.personas));
  }

  public saveLorebooks() {
    this.safeSetItem('warden_lorebooks_v7', JSON.stringify(this.lorebooks));
  }

  public saveConversations() {
    this.safeSetItem('warden_conversations_v9', JSON.stringify(this.conversations));
  }

  public saveProviders() {
    this.safeSetItem('warden_providers_v7', JSON.stringify(this.providers));
  }

  public saveReports() {
    this.safeSetItem('warden_reports_v7', JSON.stringify(this.reports));
  }

  public saveInvestigations() {
    this.safeSetItem('warden_investigations_v7', JSON.stringify(this.investigations));
  }

  public saveAuditLogs() {
    this.safeSetItem('warden_audit_logs_v7', JSON.stringify(this.auditLogs));
  }

  public saveBookmarks() {
    this.safeSetItem('warden_bookmarks_v7', JSON.stringify(this.bookmarks));
  }

  public saveFollows() {
    this.safeSetItem('warden_follows_v7', JSON.stringify(this.follows));
  }

  public saveLikedCharacters() {
    this.safeSetItem('warden_likes_v7', JSON.stringify(this.likedCharacterIds));
  }

  // --- Characters & Scenarios ---
  public getCharacters(): Character[] {
    return [...this.characters];
  }

  public getCharacterById(id: string): Character | undefined {
    return this.characters.find(c => c.id === id);
  }

  public upsertCharacter(char: Character): Character {
    const idx = this.characters.findIndex(c => c.id === char.id);
    if (idx >= 0) {
      this.characters[idx] = { ...char, updatedAt: new Date().toISOString() };
    } else {
      this.characters.unshift({
        ...char,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    this.saveCharacters();
    return char;
  }

  public deleteCharacter(id: string): boolean {
    this.characters = this.characters.filter(c => c.id !== id);
    this.saveCharacters();
    return true;
  }

  public toggleLikeCharacter(id: string): boolean {
    const char = this.getCharacterById(id);
    const alreadyLiked = this.likedCharacterIds.includes(id);

    if (alreadyLiked) {
      this.likedCharacterIds = this.likedCharacterIds.filter(cid => cid !== id);
      if (char && (char.likeCount || 0) > 0) {
        char.likeCount = Math.max(0, (char.likeCount || 1) - 1);
      }
    } else {
      this.likedCharacterIds.push(id);
      if (char) {
        char.likeCount = (char.likeCount || 0) + 1;
      }
    }

    this.saveLikedCharacters();
    this.saveCharacters();
    return !alreadyLiked;
  }

  public isLiked(id: string): boolean {
    return this.likedCharacterIds.includes(id);
  }

  public toggleBookmark(id: string): boolean {
    if (this.bookmarks.includes(id)) {
      this.bookmarks = this.bookmarks.filter(b => b !== id);
    } else {
      this.bookmarks.push(id);
    }
    this.saveBookmarks();
    return this.bookmarks.includes(id);
  }

  public isBookmarked(id: string): boolean {
    return this.bookmarks.includes(id);
  }

  public getBookmarks(): string[] {
    return [...this.bookmarks];
  }

  // --- Tags ---
  public getTags(): Tag[] {
    return [...this.tags];
  }

  public getTagsByCategory(category: TagCategory): Tag[] {
    return this.tags.filter(t => t.category === category);
  }

  public addTag(name: string, category: TagCategory): Tag {
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = this.tags.find(t => t.slug === slug);
    if (existing) return existing;

    const newTag: Tag = {
      id: 'tag_custom_' + Date.now().toString(36),
      name: name.trim(),
      slug,
      category,
      count: 1
    };
    this.tags.push(newTag);
    this.saveTags();
    return newTag;
  }

  // --- Personas ---
  public getPersonas(userId?: string): Persona[] {
    if (!userId) return [...this.personas];
    return this.personas.filter(p => p.userId === userId);
  }

  public getPersonaById(id: string): Persona | undefined {
    return this.personas.find(p => p.id === id);
  }

  public upsertPersona(persona: Persona): Persona {
    const idx = this.personas.findIndex(p => p.id === persona.id);
    if (idx >= 0) {
      this.personas[idx] = persona;
    } else {
      this.personas.unshift(persona);
    }
    this.savePersonas();
    return persona;
  }

  public deletePersona(id: string) {
    this.personas = this.personas.filter(p => p.id !== id);
    this.savePersonas();
  }

  public setDefaultPersona(id: string, userId: string) {
    this.personas.forEach(p => {
      if (p.userId === userId) {
        p.isDefault = p.id === id;
      }
    });
    this.savePersonas();
  }

  // --- Lorebooks ---
  public getLorebooks(userId?: string): Lorebook[] {
    if (!userId) return [...this.lorebooks];
    return this.lorebooks.filter(l => l.userId === userId || l.isPublic);
  }

  public upsertLorebook(lorebook: Lorebook): Lorebook {
    const idx = this.lorebooks.findIndex(l => l.id === lorebook.id);
    if (idx >= 0) {
      this.lorebooks[idx] = lorebook;
    } else {
      this.lorebooks.unshift(lorebook);
    }
    this.saveLorebooks();
    return lorebook;
  }

  public deleteLorebook(id: string) {
    this.lorebooks = this.lorebooks.filter(l => l.id !== id);
    this.saveLorebooks();
  }

  // --- Conversations (Private to User) ---
  public getConversations(userId: string): Conversation[] {
    return this.conversations.filter(c => c.userId === userId);
  }

  public getConversationById(id: string, userId: string): Conversation | undefined {
    // Only return if belongs to user or granted via active restricted investigation
    const conv = this.conversations.find(c => c.id === id);
    if (!conv) return undefined;
    if (conv.userId === userId) return conv;

    // Check investigation
    const hasActiveInv = this.investigations.some(
      inv => inv.targetConversationId === id && inv.status === 'approved' && (!inv.expiresAt || new Date(inv.expiresAt) > new Date())
    );
    if (hasActiveInv) return conv;

    return undefined;
  }

  public upsertConversation(conv: Conversation): Conversation {
    const idx = this.conversations.findIndex(c => c.id === conv.id);
    if (idx >= 0) {
      this.conversations[idx] = { ...conv, updatedAt: new Date().toISOString() };
    } else {
      this.conversations.unshift({
        ...conv,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    this.saveConversations();
    return conv;
  }

  public deleteConversation(id: string, userId: string): boolean {
    const conv = this.conversations.find(c => c.id === id);
    if (conv && conv.userId === userId) {
      this.conversations = this.conversations.filter(c => c.id !== id);
      this.saveConversations();
      return true;
    }
    return false;
  }

  // --- Providers ---
  public getProviders(userId: string): ProviderConfig[] {
    return this.providers.filter(p => p.userId === userId || p.providerType === 'simulation');
  }

  public upsertProvider(provider: ProviderConfig): ProviderConfig {
    const idx = this.providers.findIndex(p => p.id === provider.id);
    if (idx >= 0) {
      this.providers[idx] = provider;
    } else {
      this.providers.push(provider);
    }
    this.saveProviders();
    return provider;
  }

  public deleteProvider(id: string) {
    this.providers = this.providers.filter(p => p.id !== id);
    this.saveProviders();
  }

  public setDefaultProvider(id: string, userId: string) {
    this.providers.forEach(p => {
      if (p.userId === userId) {
        p.isDefault = p.id === id;
      }
    });
    this.saveProviders();
  }

  // --- Persistent Active AI Gateway Config ---
  public getActiveGatewayConfig(): Partial<ProviderConfig> | null {
    try {
      const data = localStorage.getItem('warden_active_ai_gateway_config_v1');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  public setActiveGatewayConfig(config: Partial<ProviderConfig>) {
    try {
      localStorage.setItem('warden_active_ai_gateway_config_v1', JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to save gateway config to localStorage', e);
    }
  }

  // --- Persistent Token Optimizer Settings ---
  public getTokenOptimizerLevel(): TokenOptimizerLevel {
    try {
      const val = localStorage.getItem('warden_token_optimizer_level') as TokenOptimizerLevel;
      if (val === 'easy' || val === 'medium' || val === 'aggressive') return val;
      return 'off';
    } catch {
      return 'off';
    }
  }

  public setTokenOptimizerLevel(level: TokenOptimizerLevel) {
    try {
      this.safeSetItem('warden_token_optimizer_level', level);
    } catch (e) {
      console.warn('Failed to save token optimizer level', e);
    }
  }

  // --- Follows ---
  public followUser(followerId: string, followingId: string) {
    if (followerId === followingId) return;
    const exists = this.follows.some(f => f.followerId === followerId && f.followingId === followingId);
    if (!exists) {
      this.follows.push({
        id: 'fol_' + Date.now().toString(36),
        followerId,
        followingId,
        createdAt: new Date().toISOString()
      });
      this.saveFollows();
    }
  }

  public unfollowUser(followerId: string, followingId: string) {
    this.follows = this.follows.filter(f => !(f.followerId === followerId && f.followingId === followingId));
    this.saveFollows();
  }

  public isFollowing(followerId: string, followingId: string): boolean {
    return this.follows.some(f => f.followerId === followerId && f.followingId === followingId);
  }

  public getFollowerCount(userId: string): number {
    return this.follows.filter(f => f.followingId === userId).length;
  }

  public getFollowingCount(userId: string): number {
    return this.follows.filter(f => f.followerId === userId).length;
  }

  // --- Reports & Moderation ---
  public getReports(): ContentReport[] {
    return [...this.reports];
  }

  public submitReport(report: ContentReport): ContentReport {
    this.reports.unshift(report);
    this.saveReports();
    return report;
  }

  public updateReportStatus(id: string, status: 'resolved' | 'dismissed', notes?: string, modId?: string) {
    const rep = this.reports.find(r => r.id === id);
    if (rep) {
      rep.status = status;
      rep.moderatorNotes = notes;
      rep.assignedModeratorId = modId;
      rep.resolvedAt = new Date().toISOString();
      this.saveReports();
    }
  }

  // --- Restricted Investigations ---
  public getInvestigations(): RestrictedInvestigation[] {
    return [...this.investigations];
  }

  public createInvestigationRequest(inv: RestrictedInvestigation): RestrictedInvestigation {
    this.investigations.unshift(inv);
    this.saveInvestigations();

    this.addAuditLog({
      actorId: inv.requestingInvestigatorId,
      actorName: inv.requestingInvestigatorName,
      actorRole: 'moderator',
      action: 'REQUEST_INVESTIGATION',
      targetType: 'investigation',
      targetId: inv.id,
      details: `Filed restricted investigation request for Case ${inv.caseReference}. Reason: ${inv.reason}`
    });

    return inv;
  }

  public approveInvestigation(
    id: string,
    authorityId: string,
    authorityName: string,
    decision: 'approved' | 'rejected',
    hoursValid = 24
  ) {
    const inv = this.investigations.find(i => i.id === id);
    if (!inv) return;

    // Strict two-person rule: Requester cannot approve their own request!
    if (inv.requestingInvestigatorId === authorityId) {
      throw new Error('Separation of duties violation: An investigator cannot approve their own investigation request.');
    }

    inv.status = decision;
    inv.approvingAuthorityId = authorityId;
    inv.approvingAuthorityName = authorityName;
    inv.approvedAt = new Date().toISOString();
    if (decision === 'approved') {
      inv.expiresAt = new Date(Date.now() + hoursValid * 3600000).toISOString();
    }

    this.saveInvestigations();

    this.addAuditLog({
      actorId: authorityId,
      actorName: authorityName,
      actorRole: 'admin',
      action: decision === 'approved' ? 'APPROVE_INVESTIGATION' : 'REJECT_INVESTIGATION',
      targetType: 'investigation',
      targetId: inv.id,
      details: `${decision.toUpperCase()} investigation scope for ${inv.caseReference}. Time-limit: ${hoursValid}h.`
    });
  }

  public closeInvestigation(id: string, closerId: string, closerName: string, reason: string) {
    const inv = this.investigations.find(i => i.id === id);
    if (inv) {
      inv.status = 'closed';
      inv.closedAt = new Date().toISOString();
      inv.closureReason = reason;
      this.saveInvestigations();

      this.addAuditLog({
        actorId: closerId,
        actorName: closerName,
        actorRole: 'admin',
        action: 'CLOSE_INVESTIGATION',
        targetType: 'investigation',
        targetId: inv.id,
        details: `Closed case ${inv.caseReference}. Outcome: ${reason}`
      });
    }
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  public addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>) {
    const log: AuditLog = {
      ...entry,
      id: 'audit_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      timestamp: new Date().toISOString()
    };
    this.auditLogs.unshift(log);
    this.saveAuditLogs();
  }

  // --- Global Chat Background (Shared across all conversations) ---
  public getGlobalChatBackground(): GlobalChatBackground {
    try {
      const saved = localStorage.getItem('warden_chat_background_v1');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load global chat background', e);
    }
    return {
      imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80',
      fit: 'cover',
      blur: 6,
      darkOverlay: 40
    };
  }

  public setGlobalChatBackground(bg: GlobalChatBackground): void {
    try {
      localStorage.setItem('warden_chat_background_v1', JSON.stringify(bg));
    } catch (e) {
      console.error('Failed to save global chat background', e);
    }
  }

  public resetGlobalChatBackground(): GlobalChatBackground {
    const defaultBg: GlobalChatBackground = {
      imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80',
      fit: 'cover',
      blur: 6,
      darkOverlay: 40
    };
    this.setGlobalChatBackground(defaultBg);
    return defaultBg;
  }

  public getBotRulePresets(): BotRulePreset[] {
    try {
      const saved = localStorage.getItem('warden_bot_rule_presets_v1');
      if (saved) {
        const parsed: BotRulePreset[] = JSON.parse(saved);
        return [...DEFAULT_BOT_RULE_PRESETS, ...parsed.filter(p => !p.isBuiltin)];
      }
    } catch {}
    return DEFAULT_BOT_RULE_PRESETS;
  }

  public saveBotRulePreset(preset: BotRulePreset): void {
    try {
      const existing = this.getBotRulePresets().filter(p => !p.isBuiltin);
      const updated = [preset, ...existing.filter(p => p.id !== preset.id)];
      localStorage.setItem('warden_bot_rule_presets_v1', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save bot rule preset', e);
    }
  }

  public deleteBotRulePreset(presetId: string): void {
    try {
      const existing = this.getBotRulePresets().filter(p => !p.isBuiltin && p.id !== presetId);
      localStorage.setItem('warden_bot_rule_presets_v1', JSON.stringify(existing));
    } catch (e) {
      console.error('Failed to delete bot rule preset', e);
    }
  }

  // --- Virtual Community Creator Following & Auto-Notification Sync ---
  public getFollowedCreators(userId: string = 'default'): FollowedCreatorEntry[] {
    try {
      const raw = localStorage.getItem(`warden_followed_creators_${userId}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }

  public saveFollowedCreators(userId: string = 'default', list: FollowedCreatorEntry[]): void {
    try {
      localStorage.setItem(`warden_followed_creators_${userId}`, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('warden-follows-updated'));
    } catch (e) {
      console.warn('Failed to save followed creators', e);
    }
  }

  public isFollowingCreator(userId: string = 'default', creatorName: string): boolean {
    if (!creatorName) return false;
    const list = this.getFollowedCreators(userId);
    return list.some(c => c.creatorName.toLowerCase() === creatorName.toLowerCase());
  }

  public toggleFollowCreator(
    userId: string = 'default',
    creatorName: string,
    avatarUrl?: string,
    knownIds: string[] = []
  ): boolean {
    if (!creatorName) return false;
    const list = this.getFollowedCreators(userId);
    const idx = list.findIndex(c => c.creatorName.toLowerCase() === creatorName.toLowerCase());

    if (idx >= 0) {
      list.splice(idx, 1);
      this.saveFollowedCreators(userId, list);
      return false;
    } else {
      list.unshift({
        creatorName,
        avatarUrl,
        followedAt: new Date().toISOString(),
        knownCharacterIds: knownIds,
        lastCheckedAt: new Date().toISOString()
      });
      this.saveFollowedCreators(userId, list);
      this.pushNotification({
        type: 'follower',
        title: `Following @${creatorName}`,
        message: `You will now see @${creatorName}'s characters in your Following feed and receive alerts when they upload new bots.`,
        time: 'Just now'
      });
      return true;
    }
  }

  // --- Community Character Favorites Snapshot ---
  public getSavedCommunityFavorites(): any[] {
    try {
      const raw = localStorage.getItem('warden_community_favorites_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public toggleSavedCommunityFavorite(char: any): boolean {
    if (!char || !char.id) return false;
    const isNowBookmarked = this.toggleBookmark(char.id);
    try {
      const current = this.getSavedCommunityFavorites();
      const filtered = current.filter((c: any) => c.id !== char.id);
      if (isNowBookmarked) {
        filtered.unshift(char);
      }
      localStorage.setItem('warden_community_favorites_v1', JSON.stringify(filtered.slice(0, 200)));
    } catch {}
    return isNowBookmarked;
  }

  // --- Live Notification Bus & Followed Creator Upload Diffing ---
  public pushNotification(notif: {
    type: 'follower' | 'comment' | 'favorite' | 'system';
    title: string;
    message: string;
    time?: string;
    characterId?: string;
  }): void {
    try {
      const raw = localStorage.getItem('warden_notifications_v2');
      const list = raw ? JSON.parse(raw) : [];
      const newEntry = {
        id: 'notif_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
        type: notif.type,
        title: notif.title,
        message: notif.message,
        time: notif.time || 'Just now',
        read: false,
        characterId: notif.characterId
      };
      const updated = [newEntry, ...list].slice(0, 50);
      localStorage.setItem('warden_notifications_v2', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('warden-notifications-updated', { detail: updated }));
    } catch (e) {
      console.warn('Failed to push notification', e);
    }
  }

  /**
   * Compares newly fetched cards from followed creators against their last known character IDs.
   * Any newly discovered character ID triggers an automatic "New Character Upload" notification!
   */
  public recordAndNotifyCreatorUploads(userId: string = 'default', fetchedCards: any[]): number {
    const followed = this.getFollowedCreators(userId);
    if (followed.length === 0 || fetchedCards.length === 0) return 0;

    let newUploadCount = 0;
    let changed = false;

    for (const entry of followed) {
      const creatorCards = fetchedCards.filter(
        c => (c.creatorName || '').toLowerCase() === entry.creatorName.toLowerCase()
      );
      if (creatorCards.length === 0) continue;

      const knownSet = new Set(entry.knownCharacterIds || []);
      // If knownCharacterIds was empty (just followed), seed with all except the very newest if published recently, or seed all
      if (knownSet.size === 0) {
        entry.knownCharacterIds = creatorCards.map(c => c.id);
        entry.lastCheckedAt = new Date().toISOString();
        changed = true;
        continue;
      }

      for (const card of creatorCards) {
        if (card.id && !knownSet.has(card.id)) {
          knownSet.add(card.id);
          newUploadCount++;
          changed = true;
          this.pushNotification({
            type: 'system',
            title: `@${entry.creatorName} uploaded a new bot!`,
            message: `"${card.name}" was just published by @${entry.creatorName}. Check it out in your Following feed!`,
            time: 'New upload',
            characterId: card.id
          });
        }
      }
      entry.knownCharacterIds = Array.from(knownSet).slice(-150);
      entry.lastCheckedAt = new Date().toISOString();
    }

    if (changed) {
      this.saveFollowedCreators(userId, followed);
    }
    return newUploadCount;
  }
}

export interface FollowedCreatorEntry {
  creatorName: string;
  creatorId?: string;
  avatarUrl?: string;
  followedAt: string;
  knownCharacterIds: string[];
  lastCheckedAt: string;
}

export interface BotRulePreset {
  id: string;
  name: string;
  prompt: string;
  isBuiltin?: boolean;
}

export const DEFAULT_BOT_RULE_PRESETS: BotRulePreset[] = [
  {
    id: 'preset_header_standard',
    name: 'Adding date & times, location, formatting header (*narration*, ""speech"", [Name])',
    prompt: `Format every reply with a dynamic scene header at the top:\n[Date & Time: ... | Location: ... | Atmosphere: ...]\n\nRules:\n- Format physical actions, gestures, and narrative context in *italics*.\n- Enclose all spoken dialogue in double quotes ("").\n- Tag speaking characters clearly as [Character Name]: when multiple characters interact.\n- Maintain deep sensory detail and emotional realism without breaking character.`,
    isBuiltin: true
  },
  {
    id: 'preset_slow_burn',
    name: 'Slow-burn Gothic Romance',
    prompt: `Maintain a slow-burn, atmospheric gothic tone. Emphasize subtle emotional tension, micro-expressions, lingering pauses, and unsaid words. Keep physical actions gradual and deliberate. Never rush romantic progression; let the dynamic build with psychological weight.`,
    isBuiltin: true
  },
  {
    id: 'preset_tactical_action',
    name: 'Tactical First-Person Action',
    prompt: `Write with sharp, visceral kinetic energy. Describe tactical movements, cover, weapons handling, and immediate physical consequences in vivid realistic detail. Pacing should be tense and urgent without losing sensory depth.`,
    isBuiltin: true
  },
  {
    id: 'preset_extreme_slow_pace',
    name: 'Extreme Slow Pace Dialogue',
    prompt: `Extreme slow-pace progression. Focus heavily on body language, breathing, hesitation, and internal atmosphere. Each response should cover only a few moments of real time, savoring every spoken sentence and subtle glance.`,
    isBuiltin: true
  }
];

export const storageService = new StorageService();


