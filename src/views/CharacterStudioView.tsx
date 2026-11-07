/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Layers,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Download,
  Upload,
  Eye,
  Check,
  AlertCircle,
  Save,
  Send,
  X,
  Lock,
  MessageSquare,
  ShieldAlert,
  Image as ImageIcon
} from 'lucide-react';
import { RichTextRenderer } from '../components/common/RichTextRenderer';
import {
  Character,
  CharacterScenario,
  ContentRating,
  PublicationStatus,
  Tag,
  TagCategory,
  User,
  Lorebook
} from '../types';
import { CharacterImportModal } from '../components/modals/CharacterImportModal';
import { ImportedCardData } from '../services/characterImportService';
import { downloadJanitorMarkdown } from '../utils/janitorExport';

interface CharacterStudioViewProps {
  currentUser: User;
  allTags: Tag[];
  initialCharacter?: Character;
  onSaveCharacter: (character: Character, submitForReview?: boolean) => void;
  onBack: () => void;
  onAddNewTag: (name: string, category: TagCategory) => Tag;
  onAccountRestricted?: (reason: string) => void;
  onStartTestingChat?: (character: Character) => void;
  onSaveLorebook?: (lorebook: Lorebook) => void;
}

export const CharacterStudioView: React.FC<CharacterStudioViewProps> = ({
  currentUser,
  allTags,
  initialCharacter,
  onSaveCharacter,
  onBack,
  onAddNewTag,
  onAccountRestricted,
  onStartTestingChat,
  onSaveLorebook
}) => {
  const [mode, setMode] = useState<'basic' | 'advanced'>('basic');
  const [activeTab, setActiveTab] = useState<'details' | 'scenarios' | 'advanced' | 'preview'>('details');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState(initialCharacter?.name || '');
  const [age, setAge] = useState<number>(initialCharacter?.age || 20);
  const [avatarUrl, setAvatarUrl] = useState(
    initialCharacter?.avatarUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80'
  );
  const [coverUrl, setCoverUrl] = useState(initialCharacter?.coverUrl || '');
  const [subtitle, setSubtitle] = useState(initialCharacter?.subtitle || '');
  const [shortDescription, setShortDescription] = useState(initialCharacter?.shortDescription || '');
  const [personality, setPersonality] = useState(initialCharacter?.personality || '');
  const [background, setBackground] = useState(initialCharacter?.background || '');
  const [systemPrompt, setSystemPrompt] = useState(
    initialCharacter?.systemPrompt ||
      'You are {{char}}. Embody their personality, mannerisms, and background in every response. Use asterisks for actions (*she glances sideways*) and quotes for dialogue ("spoken line"). Never break character.'
  );
  const [exampleDialogue, setExampleDialogue] = useState(
    initialCharacter?.exampleDialogue || '<START>\n{{user}}: "Hello."\n{{char}}: *smiles warmly* "Greetings."'
  );
  const [creatorNotes, setCreatorNotes] = useState(initialCharacter?.creatorNotes || '');
  const [contentRating, setContentRating] = useState<ContentRating>(initialCharacter?.contentRating || 'SFW');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>(initialCharacter?.visibility || 'public');

  // Scenarios (multi-scenario system)
  const [scenarios, setScenarios] = useState<CharacterScenario[]>(
    initialCharacter?.scenarios || [
      {
        id: 'sc_' + Date.now().toString(36),
        characterId: initialCharacter?.id || 'temp',
        title: 'Initial Encounter',
        description: 'First meeting scenario establishing the setting and character dynamics.',
        openingMessage:
          '*{{char}} looks up as you enter the room, their expression shifting with quiet curiosity.* "Welcome. I was told you would be arriving."',
        scenarioInstructions: 'First meeting roleplay. The character is evaluating the user.',
        displayOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  );

  // Selected Tags
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<string[]>(
    initialCharacter?.tagSlugs || ['sfw', 'first-meeting', 'original-character']
  );
  const [tagInput, setTagInput] = useState('');

  // Validation & Test state
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [recentlySavedChar, setRecentlySavedChar] = useState<Character | null>(null);

  // Validation Checks
  const isNameValid = name.trim().length > 0;
  const isAgeValid = !isNaN(age) && age >= 18;
  const isDescriptionValid = shortDescription.trim().length > 0;
  const isPersonalityValid = personality.trim().length > 0;
  const isScenarioValid =
    scenarios.length > 0 &&
    scenarios.every(s => s.title.trim().length > 0 && s.openingMessage.trim().length > 0);

  const isFormValid = isNameValid && isAgeValid && isDescriptionValid && isPersonalityValid && isScenarioValid;

  // Automated Child Safety and Age Policy Scanner
  const checkChildSafetyViolation = (): string | null => {
    if (isNaN(age) || age < 18) {
      return 'All characters must be at least 18 years of age. Minor characters are strictly prohibited.';
    }

    const textCorpus = [
      name,
      subtitle,
      shortDescription,
      personality,
      background,
      systemPrompt,
      exampleDialogue,
      creatorNotes,
      ...scenarios.map(s => `${s.title} ${s.description} ${s.openingMessage} ${s.scenarioInstructions}`),
      ...selectedTagSlugs
    ].join(' ').toLowerCase();

    const prohibitedPatterns = [
      /\b(?:child|infant|toddler|kindergarten|elementary\s+school|underage|minor|pedophil|paedophil|loli|shota|middle\s+school|young\s+kid)\b/i,
      /\b(?:age\s*[:=]?\s*(?:[0-9]|1[0-7])\b)/i,
      /\b(?:1[0-7]\s*years?\s*old)\b/i
    ];

    for (const pattern of prohibitedPatterns) {
      if (pattern.test(textCorpus)) {
        return 'Prohibited depiction or reference to minors detected. Violates Child Safety Policy.';
      }
    }

    return null;
  };

  // Scenario operations
  const handleAddScenario = () => {
    const newSc: CharacterScenario = {
      id: 'sc_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 4),
      characterId: initialCharacter?.id || 'temp',
      title: `Scenario ${scenarios.length + 1}`,
      description: 'Describe the situation, tension, or environment.',
      openingMessage: '*{{char}} pauses, adjusting their posture as the situation unfolds.* "What brings you here?"',
      scenarioInstructions: 'Scenario-specific narrative guidance.',
      displayOrder: scenarios.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setScenarios([...scenarios, newSc]);
  };

  const handleUpdateScenario = (index: number, updates: Partial<CharacterScenario>) => {
    const updated = [...scenarios];
    updated[index] = { ...updated[index], ...updates, updatedAt: new Date().toISOString() };
    setScenarios(updated);
  };

  const handleDeleteScenario = (index: number) => {
    setScenarios(scenarios.filter((_, i) => i !== index));
  };

  const handleMoveScenario = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === scenarios.length - 1) return;
    const target = direction === 'up' ? index - 1 : index + 1;
    const updated = [...scenarios];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    setScenarios(updated);
  };

  const handleDuplicateScenario = (index: number) => {
    const source = scenarios[index];
    const duplicated: CharacterScenario = {
      ...source,
      id: 'sc_' + Date.now().toString(36),
      title: `${source.title} (Copy)`,
      displayOrder: scenarios.length + 1
    };
    setScenarios([...scenarios, duplicated]);
  };

  // Tag operations
  const handleToggleTag = (slug: string) => {
    if (selectedTagSlugs.includes(slug)) {
      setSelectedTagSlugs(selectedTagSlugs.filter(s => s !== slug));
    } else {
      setSelectedTagSlugs([...selectedTagSlugs, slug]);
    }
  };

  const handleAddCustomTag = () => {
    if (!tagInput.trim()) return;
    const newTag = onAddNewTag(tagInput.trim(), 'theme');
    if (!selectedTagSlugs.includes(newTag.slug)) {
      setSelectedTagSlugs([...selectedTagSlugs, newTag.slug]);
    }
    setTagInput('');
  };

  // Build character object
  const buildCharacterObject = (
    publicationStatus: PublicationStatus,
    targetVisibility: 'public' | 'unlisted' | 'private'
  ): Character => {
    const charId = initialCharacter?.id || 'char_' + Date.now().toString(36);
    return {
      id: charId,
      creatorId: currentUser.id,
      creatorUsername: currentUser.username,
      creatorAvatar: currentUser.avatarUrl,
      name: name.trim(),
      subtitle: subtitle.trim() || undefined,
      avatarUrl: avatarUrl.trim() || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500',
      coverUrl: coverUrl.trim() || undefined,
      shortDescription: shortDescription.trim(),
      personality: personality.trim(),
      background: background.trim(),
      systemPrompt: systemPrompt.trim(),
      exampleDialogue: exampleDialogue.trim(),
      firstMessage: scenarios[0]?.openingMessage,
      creatorNotes: creatorNotes.trim(),
      contentRating,
      visibility: targetVisibility,
      publicationStatus,
      age: Number(age) || 20,
      scenarios: scenarios.map((s, idx) => ({ ...s, characterId: charId, displayOrder: idx + 1 })),
      tagSlugs: selectedTagSlugs,
      likeCount: initialCharacter?.likeCount || 0,
      bookmarkCount: initialCharacter?.bookmarkCount || 0,
      chatCount: initialCharacter?.chatCount || 0,
      createdAt: initialCharacter?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  // Save as Private (Instant self-test, no review required)
  const handleSavePrivate = () => {
    const violation = checkChildSafetyViolation();
    if (violation) {
      if (onAccountRestricted) onAccountRestricted(violation);
      return;
    }

    if (!name.trim()) {
      setErrorMessage('Character name is required.');
      return;
    }

    setErrorMessage('');
    const char = buildCharacterObject('private', 'private');
    onSaveCharacter(char, false);
    setRecentlySavedChar(char);
    setSuccessToast('Saved as Private! You can now test it immediately without waiting for review.');
    setTimeout(() => setSuccessToast(''), 4000);
  };

  // Save as Draft
  const handleSaveDraft = () => {
    const violation = checkChildSafetyViolation();
    if (violation) {
      if (onAccountRestricted) onAccountRestricted(violation);
      return;
    }

    if (!name.trim()) {
      setErrorMessage('Character name is required.');
      return;
    }

    setErrorMessage('');
    const char = buildCharacterObject('draft', 'unlisted');
    onSaveCharacter(char, false);
    setRecentlySavedChar(char);
    setSuccessToast('Draft saved successfully!');
    setTimeout(() => setSuccessToast(''), 3000);
  };

  // Submit for Review (requires all mandatory fields)
  const handleSubmitForReview = () => {
    const violation = checkChildSafetyViolation();
    if (violation) {
      if (onAccountRestricted) onAccountRestricted(violation);
      return;
    }

    if (!isFormValid) {
      setErrorMessage('Please complete all mandatory fields before submitting for review.');
      return;
    }

    setErrorMessage('');
    const char = buildCharacterObject('pending_review', 'public');
    onSaveCharacter(char, true);
    setRecentlySavedChar(char);
    setSuccessToast('Character submitted to moderation queue!');
    setTimeout(() => setSuccessToast(''), 4000);
  };

  // JSON Export / Import
  const handleExportJSON = () => {
    const data = {
      name,
      age,
      subtitle,
      avatarUrl,
      coverUrl,
      shortDescription,
      personality,
      background,
      systemPrompt,
      exampleDialogue,
      creatorNotes,
      contentRating,
      scenarios,
      tags: selectedTagSlugs,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.toLowerCase().replace(/\s+/g, '_')}_definition.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Apply card imported via CharacterImportModal (PNG, JSON, Datacat, Manual)
  const handleApplyImportedData = (data: ImportedCardData) => {
    setName(data.name);
    setAge(Math.max(data.age || 20, 18));
    if (data.subtitle) setSubtitle(data.subtitle);
    if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
    setShortDescription(data.shortDescription);
    setPersonality(data.personality);
    setBackground(data.background);
    if (data.systemPrompt) setSystemPrompt(data.systemPrompt);
    if (data.exampleDialogue) setExampleDialogue(data.exampleDialogue);
    if (data.creatorNotes) setCreatorNotes(data.creatorNotes);
    setContentRating(data.contentRating);

    // Build scenarios: primary first message + any alternate greetings
    const newScenarios: CharacterScenario[] = [
      {
        id: 'sc_' + Date.now().toString(36),
        characterId: initialCharacter?.id || 'temp',
        title: 'Initial Encounter',
        description: 'First meeting scenario establishing the setting and character dynamics.',
        openingMessage: data.firstMessage,
        scenarioInstructions: 'Default opening scenario.',
        displayOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    if (data.alternateGreetings && data.alternateGreetings.length > 0) {
      data.alternateGreetings.forEach((greeting, idx) => {
        newScenarios.push({
          id: 'sc_' + Date.now().toString(36) + '_' + (idx + 1),
          characterId: initialCharacter?.id || 'temp',
          title: `Alternate Scenario ${idx + 2}`,
          description: `Alternate greeting context ${idx + 1}.`,
          openingMessage: greeting,
          scenarioInstructions: 'Alternative opening scenario.',
          displayOrder: idx + 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
    }
    setScenarios(newScenarios);

    // Merge tags
    if (data.tags && data.tags.length > 0) {
      const merged = Array.from(new Set([...selectedTagSlugs, ...data.tags]));
      setSelectedTagSlugs(merged);
    }

    // Save embedded lorebook if provided
    if (data.lorebook && onSaveLorebook) {
      const newLb: Lorebook = {
        id: 'lb_' + Date.now().toString(36),
        userId: currentUser.id,
        title: data.lorebook.name,
        description: data.lorebook.description || `Lorebook for ${data.name}`,
        isPublic: false,
        createdAt: new Date().toISOString(),
        entries: data.lorebook.entries.map((entry, idx) => ({
          id: 'entry_' + Date.now().toString(36) + '_' + idx,
          title: entry.title,
          keys: entry.keys,
          content: entry.content,
          priority: entry.priority || 10,
          enabled: entry.enabled !== false
        }))
      };
      onSaveLorebook(newLb);
    }

    // Keep imported character as private draft by default for safety
    setVisibility('private');
    setSuccessToast(`Imported "${data.name}" (${data.originalFormat}) as private draft!`);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-20 px-3 sm:px-6 space-y-5 overflow-x-hidden min-w-0">
      {/* Studio Header: Completely responsive, no overflow */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b1e28] pb-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
            <span className="truncate">Character Creation Studio</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5 truncate">
            Craft deep personas, attach multiple narrative scenarios, or import from Datacat & character cards.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Main Character Import Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-1.5 bg-[#171b28] hover:bg-[#202638] text-purple-300 border border-purple-500/30 hover:border-purple-500/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            title="Import character card (PNG, JSON, Datacat, or Manual)"
          >
            <Upload className="w-3.5 h-3.5 text-purple-400" />
            <span>Import Card</span>
          </button>

          <div className="flex items-center p-0.5 bg-[#131620] border border-[#202534] rounded-lg text-xs">
            <button
              onClick={() => setMode('basic')}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                mode === 'basic' ? 'bg-purple-600 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Basic
            </button>
            <button
              onClick={() => setMode('advanced')}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                mode === 'advanced' ? 'bg-purple-600 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Advanced
            </button>
          </div>

          <button
            onClick={() => {
              const tempChar: Character = {
                id: initialCharacter?.id || 'draft',
                name: name || 'Unnamed Character',
                age,
                subtitle,
                avatarUrl,
                coverUrl,
                shortDescription,
                personality,
                background,
                systemPrompt,
                exampleDialogue,
                creatorNotes,
                creatorId: currentUser.id,
                creatorUsername: currentUser.username,
                creatorAvatar: currentUser.avatarUrl,
                contentRating,
                visibility,
                publicationStatus: 'draft',
                tagSlugs: selectedTagSlugs,
                scenarios,
                chatCount: 0,
                likeCount: 0,
                bookmarkCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              downloadJanitorMarkdown(tempChar);
            }}
            className="px-2.5 py-1.5 text-purple-300 hover:text-white bg-[#131620] hover:bg-purple-600/20 border border-purple-500/30 rounded-lg transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
            title="Export Character as Janitor AI Markdown (.md)"
          >
            <Download className="w-3.5 h-3.5 text-purple-400" />
            <span>Export .MD</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="p-1.5 text-neutral-400 hover:text-white bg-[#131620] border border-[#202534] rounded-lg transition-colors cursor-pointer"
            title="Export JSON"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs for form sections (Smooth scroll on mobile, no layout blow-out) */}
      <div className="flex items-center gap-1 border-b border-[#1b1e28] overflow-x-auto text-xs pb-1 scrollbar-none w-full max-w-full">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-3 py-2 border-b-2 font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
            activeTab === 'details'
              ? 'border-purple-500 text-purple-400 font-bold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          1. Identity & Age
        </button>
        <button
          onClick={() => setActiveTab('scenarios')}
          className={`px-3 py-2 border-b-2 font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'scenarios'
              ? 'border-purple-500 text-purple-400 font-bold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>2. Scenarios ({scenarios.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('advanced')}
          className={`px-3 py-2 border-b-2 font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
            activeTab === 'advanced'
              ? 'border-purple-500 text-purple-400 font-bold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          3. Prompts & Dialogue
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-3 py-2 border-b-2 font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'preview'
              ? 'border-purple-500 text-purple-400 font-bold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Live Preview</span>
        </button>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="p-3 bg-rose-950/60 border border-rose-800/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="text-rose-400 hover:text-rose-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {successToast && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/50 rounded-xl text-xs text-emerald-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successToast}</span>
          </div>
          {recentlySavedChar && onStartTestingChat && (
            <button
              onClick={() => onStartTestingChat(recentlySavedChar)}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <MessageSquare className="w-3 h-3" />
              <span>Test in Chat</span>
            </button>
          )}
        </div>
      )}

      {/* Tab 1: Identity & Backstory */}
      {activeTab === 'details' && (
        <div className="space-y-4 bg-[#12151e] border border-[#1e2330] p-4 sm:p-5 rounded-2xl min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
            {/* Name */}
            <div className="space-y-1.5 sm:col-span-2 min-w-0">
              <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                <span>Character Name <span className="text-rose-400">*</span></span>
              </label>
              <input
                type="text"
                placeholder="e.g. Aoi Tachibana"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#0c0e14] border border-[#202534] rounded-xl text-white focus:outline-none focus:border-purple-500 min-w-0"
              />
            </div>

            {/* Character Age (Strictly >= 18) */}
            <div className="space-y-1.5 min-w-0">
              <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                <span>Age <span className="text-rose-400">* (18+)</span></span>
                <span className="text-[10px] text-neutral-500">Must be 18+</span>
              </label>
              <input
                type="number"
                min="18"
                max="9999"
                value={age}
                onChange={e => setAge(parseInt(e.target.value) || 18)}
                className={`w-full px-3 py-2 text-xs bg-[#0c0e14] border rounded-xl text-white focus:outline-none min-w-0 font-mono ${
                  age < 18 ? 'border-rose-500 text-rose-300' : 'border-[#202534] focus:border-purple-500'
                }`}
              />
            </div>
          </div>

          {/* Subtitle & Content Rating */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
            <div className="space-y-1.5 min-w-0">
              <label className="text-xs font-semibold text-neutral-300">
                Subtitle / Persona Hook
              </label>
              <input
                type="text"
                placeholder="e.g. Your Tsundere Childhood Friend"
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#0c0e14] border border-[#202534] rounded-xl text-white focus:outline-none focus:border-purple-500 min-w-0"
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="text-xs font-semibold text-neutral-300">
                Content Rating <span className="text-rose-400">*</span>
              </label>
              <select
                value={contentRating}
                onChange={e => setContentRating(e.target.value as ContentRating)}
                className="w-full px-3 py-2 text-xs bg-[#0c0e14] border border-[#202534] rounded-xl text-white focus:outline-none focus:border-purple-500 cursor-pointer min-w-0"
              >
                <option value="SFW">SFW (General Audiences)</option>
                <option value="Mature">Mature (18+ Adult Themes, Sensitive)</option>
                <option value="NSFW">NSFW (18+ Explicit Romance & Roleplay)</option>
              </select>
            </div>
          </div>

          {/* Avatar & Cover URLs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
            <div className="space-y-1.5 min-w-0">
              <label className="text-xs font-semibold text-neutral-300">
                Avatar Image URL
              </label>
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={avatarUrl}
                  alt="Preview"
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-neutral-700 shrink-0 bg-[#0c0e14]"
                  onError={e => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150';
                  }}
                />
                <input
                  type="text"
                  placeholder="https://..."
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-[#0c0e14] border border-[#202534] rounded-xl text-white focus:outline-none focus:border-purple-500 min-w-0"
                />
              </div>
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="text-xs font-semibold text-neutral-300">
                Cover Banner URL (Optional)
              </label>
              <input
                type="text"
                placeholder="https://..."
                value={coverUrl}
                onChange={e => setCoverUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#0c0e14] border border-[#202534] rounded-xl text-white focus:outline-none focus:border-purple-500 min-w-0"
              />
            </div>
          </div>

          {/* Short Description */}
          <div className="space-y-1.5 min-w-0">
            <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
              <span>Card Description <span className="text-rose-400">*</span></span>
              <span className="text-[10px] text-neutral-500">{shortDescription.length}/300</span>
            </label>
            <textarea
              rows={2}
              maxLength={300}
              placeholder="A brief summary shown on character discovery cards..."
              value={shortDescription}
              onChange={e => setShortDescription(e.target.value)}
              className="w-full p-2.5 text-xs bg-[#0c0e14] border border-[#202534] rounded-xl text-white focus:outline-none focus:border-purple-500 min-w-0"
            />
          </div>

          {/* Personality Traits */}
          <div className="space-y-1.5 min-w-0">
            <label className="text-xs font-semibold text-neutral-300">
              Personality Traits & Core Temperament <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Tsundere, secretly affectionate, sharp-tongued when embarrassed, fiercely loyal..."
              value={personality}
              onChange={e => setPersonality(e.target.value)}
              className="w-full p-2.5 text-xs bg-[#0c0e14] border border-[#202534] rounded-xl text-white focus:outline-none focus:border-purple-500 min-w-0"
            />
          </div>

          {/* Background Story & Rich Description (Supports Images like Image 1) */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-neutral-300">
                Background Story & Rich Description (Supports Images)
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const url = window.prompt('Enter Image URL (https://...) to embed in Description:');
                    if (url && url.trim()) {
                      setBackground(prev => `${prev ? prev + '\n\n' : ''}![](${url.trim()})\n`);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#181c2a] hover:bg-purple-600/30 border border-purple-500/30 text-[11px] font-semibold text-purple-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>+ Image URL</span>
                </button>
                <label className="px-2.5 py-1 rounded-lg bg-[#181c2a] hover:bg-purple-600/30 border border-purple-500/30 text-[11px] font-semibold text-purple-300 flex items-center gap-1 cursor-pointer transition-colors">
                  <Upload className="w-3 h-3" />
                  <span>Upload Banner</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          setBackground(prev => `${prev ? prev + '\n\n' : ''}![](${reader.result})\n`);
                        }
                      };
                      reader.readAsDataURL(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>
            <textarea
              rows={4}
              placeholder="Past history, scenario banners (![](https://...)), relationship with protagonist..."
              value={background}
              onChange={e => setBackground(e.target.value)}
              className="w-full p-2.5 text-xs bg-[#0c0e14] border border-[#202534] rounded-xl text-white focus:outline-none focus:border-purple-500 min-w-0"
            />
            {(/!\[.*?\]\(/.test(background) || /<img\b/i.test(background)) && (
              <div className="p-3 rounded-xl bg-[#0c0e14]/80 border border-[#22283a] space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                  Description Media Preview
                </span>
                <RichTextRenderer content={background} className="text-xs text-neutral-300" />
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2 min-w-0 pt-2 border-t border-[#1b1e28]">
            <label className="text-xs font-semibold text-neutral-300 block">
              Character Tags ({selectedTagSlugs.length})
            </label>
            <div className="flex flex-wrap gap-1.5 min-w-0">
              {selectedTagSlugs.map(slug => (
                <button
                  key={slug}
                  type="button"
                  onClick={() => handleToggleTag(slug)}
                  className="px-2.5 py-1 rounded-full bg-purple-900/30 text-purple-300 border border-purple-500/30 text-xs flex items-center gap-1 hover:bg-rose-500/20 hover:text-rose-300 transition-colors cursor-pointer"
                >
                  <span>#{slug}</span>
                  <X className="w-3 h-3" />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1 max-w-sm min-w-0">
              <input
                type="text"
                placeholder="Type tag name..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-[#0c0e14] border border-[#202534] rounded-xl text-white focus:outline-none focus:border-purple-500 min-w-0"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-medium cursor-pointer shrink-0"
              >
                Add Tag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Scenarios */}
      {activeTab === 'scenarios' && (
        <div className="space-y-4 min-w-0">
          <div className="flex items-center justify-between min-w-0 gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 truncate">
                <Layers className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="truncate">Multi-Scenario Suite ({scenarios.length})</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5 truncate">
                Attach alternate opening situations or relationship stages.
              </p>
            </div>

            <button
              onClick={handleAddScenario}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Scenario</span>
            </button>
          </div>

          {scenarios.map((sc, index) => (
            <div
              key={sc.id}
              className="p-4 bg-[#12151e] border border-[#1e2330] rounded-2xl space-y-3 relative group min-w-0"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-[#1b1e28] pb-2.5 min-w-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-neutral-800 text-purple-400 shrink-0">
                    #{index + 1}
                  </span>
                  <input
                    type="text"
                    placeholder="Scenario Title"
                    value={sc.title}
                    onChange={e => handleUpdateScenario(index, { title: e.target.value })}
                    className="font-bold text-xs sm:text-sm bg-transparent border-b border-transparent focus:border-purple-500 text-white focus:outline-none px-1 flex-1 min-w-0"
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleMoveScenario(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMoveScenario(index, 'down')}
                    disabled={index === scenarios.length - 1}
                    className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDuplicateScenario(index)}
                    className="p-1 text-neutral-400 hover:text-white cursor-pointer"
                    title="Duplicate"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteScenario(index)}
                    className="p-1 text-neutral-400 hover:text-rose-400 cursor-pointer"
                    title="Delete Scenario"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Premise */}
              <div className="space-y-1 min-w-0">
                <label className="text-[11px] font-semibold text-neutral-400">
                  Premise & Hook
                </label>
                <input
                  type="text"
                  placeholder="Short premise explaining the context..."
                  value={sc.description}
                  onChange={e => handleUpdateScenario(index, { description: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-[#0c0e14] border border-[#202534] rounded-xl text-white focus:outline-none focus:border-purple-500 min-w-0"
                />
              </div>

              {/* Opening Message (Supports First-Message Images like Image 2) */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-[11px] font-semibold text-neutral-400">
                    Initial Greeting / First Message <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const url = window.prompt(
                          'Enter Image URL (https://...) to embed in this First Message:'
                        );
                        if (url && url.trim()) {
                          handleUpdateScenario(index, {
                            openingMessage: `${sc.openingMessage ? sc.openingMessage + '\n\n' : ''}![](${url.trim()})`
                          });
                        }
                      }}
                      className="px-2 py-0.5 rounded-lg bg-[#181c2a] hover:bg-purple-600/30 border border-purple-500/30 text-[10px] font-semibold text-purple-300 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <ImageIcon className="w-3 h-3" />
                      <span>+ Image URL</span>
                    </button>
                    <label className="px-2 py-0.5 rounded-lg bg-[#181c2a] hover:bg-purple-600/30 border border-purple-500/30 text-[10px] font-semibold text-purple-300 flex items-center gap-1 cursor-pointer transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>Upload Scene Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === 'string') {
                              handleUpdateScenario(index, {
                                openingMessage: `${sc.openingMessage ? sc.openingMessage + '\n\n' : ''}![](${reader.result})`
                              });
                            }
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
                <textarea
                  rows={4}
                  placeholder="*Narrate physical actions in asterisks* 'Spoken dialogue in quotes'... Embed images with ![](https://...)"
                  value={sc.openingMessage}
                  onChange={e => handleUpdateScenario(index, { openingMessage: e.target.value })}
                  className="w-full p-2.5 text-xs font-mono bg-[#0c0e14] border border-[#202534] rounded-xl text-white focus:outline-none focus:border-purple-500 min-w-0 leading-relaxed"
                />
                {(/!\[.*?\]\(/.test(sc.openingMessage) || /<img\b/i.test(sc.openingMessage)) && (
                  <div className="p-3 rounded-xl bg-[#0c0e14]/80 border border-[#22283a] space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                      First Message Scene Preview (Visual Only — Hidden from AI Context)
                    </span>
                    <RichTextRenderer content={sc.openingMessage} className="text-xs text-neutral-200" />
                  </div>
                )}
              </div>
            </div>
          ))}

          {scenarios.length === 0 && (
            <div className="py-8 text-center bg-[#12151e] border border-[#1e2330] rounded-2xl space-y-2">
              <p className="text-xs text-neutral-400">No scenarios attached yet.</p>
              <button
                onClick={handleAddScenario}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs cursor-pointer"
              >
                Add First Scenario
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Prompts & Dialogue */}
      {activeTab === 'advanced' && (
        <div className="space-y-4 bg-[#12151e] border border-[#1e2330] p-4 sm:p-5 rounded-2xl min-w-0">
          <div className="space-y-1.5 min-w-0">
            <label className="text-xs font-semibold text-neutral-300">
              System Prompt & Character Definition
            </label>
            <p className="text-[11px] text-neutral-400">
              Direct guidance for language models. Defines tone, cognitive patterns, and formatting boundaries.
            </p>
            <textarea
              rows={8}
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              className="w-full p-3 text-xs font-mono bg-[#0c0e14] border border-[#202534] rounded-xl text-white focus:outline-none focus:border-purple-500 min-w-0 leading-relaxed"
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <label className="text-xs font-semibold text-neutral-300">
              Example Dialogue (Few-Shot Format)
            </label>
            <textarea
              rows={5}
              value={exampleDialogue}
              onChange={e => setExampleDialogue(e.target.value)}
              className="w-full p-3 text-xs font-mono bg-[#0c0e14] border border-[#202534] rounded-xl text-white focus:outline-none focus:border-purple-500 min-w-0 leading-relaxed"
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <label className="text-xs font-semibold text-neutral-300">
              Creator Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Recommended generation settings, model suggestions, or persona tips..."
              value={creatorNotes}
              onChange={e => setCreatorNotes(e.target.value)}
              className="w-full p-2.5 text-xs bg-[#0c0e14] border border-[#202534] rounded-xl text-white focus:outline-none focus:border-purple-500 min-w-0"
            />
          </div>
        </div>
      )}

      {/* Tab 4: Live Preview */}
      {activeTab === 'preview' && (
        <div className="p-5 bg-[#12151e] border border-[#1e2330] rounded-2xl space-y-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={avatarUrl}
              alt={name || 'Character'}
              className="w-14 h-14 rounded-xl object-cover ring-1 ring-neutral-700 bg-[#0c0e14] shrink-0"
            />
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white truncate">{name || 'Unnamed Character'}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-neutral-400 font-mono">Age: {age}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/40">
                  {contentRating}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed">{shortDescription || 'No description provided.'}</p>

          <div className="p-3 bg-[#0c0e14] rounded-xl border border-[#202534] text-xs text-neutral-300 space-y-1">
            <span className="font-semibold text-purple-400 block mb-1">Scenarios Available:</span>
            {scenarios.map((sc, i) => (
              <div key={sc.id} className="text-[11px] py-1 border-b border-neutral-900 last:border-0 truncate">
                #{i + 1} <strong className="text-white">{sc.title}</strong> — {sc.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer (Fully responsive, no overflow) */}
      <div className="pt-4 border-t border-[#1b1e28] flex flex-col sm:flex-row items-center justify-between gap-3 min-w-0">
        <button
          onClick={onBack}
          className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
        >
          Cancel
        </button>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end min-w-0">
          {/* Save Draft */}
          <button
            onClick={handleSaveDraft}
            className="px-3.5 py-2 bg-[#131620] hover:bg-[#181c2a] border border-[#202534] text-neutral-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Draft</span>
          </button>

          {/* Save Private (Self-test without review) */}
          <button
            onClick={handleSavePrivate}
            className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Save as Private to test immediately without waiting for review"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Save Private (Self-Test)</span>
          </button>

          {/* Submit for Review (Disabled if mandatory form fields are missing) */}
          <button
            onClick={handleSubmitForReview}
            disabled={!isFormValid}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              isFormValid
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 cursor-pointer active:scale-95'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-60 border border-neutral-700'
            }`}
            title={
              isFormValid
                ? 'Submit to community moderation review queue'
                : 'Complete all mandatory fields (*Name, Age >= 18, Description, Personality, Scenario) to enable review submission'
            }
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit for Review</span>
          </button>
        </div>
      </div>

      {/* Datacat & Character Card Import Modal */}
      <CharacterImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onConfirmImport={handleApplyImportedData}
      />
    </div>
  );
};
