/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Upload,
  FileCode,
  Image as ImageIcon,
  Globe,
  FileText,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  X,
  Sparkles,
  BookOpen,
  Info
} from 'lucide-react';
import { CharacterImportService, ImportedCardData, ImportParseResult } from '../../services/characterImportService';
import { Character, CharacterScenario, ContentRating } from '../../types';

interface CharacterImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (importedData: ImportedCardData) => void;
}

type ImportTab = 'png' | 'json' | 'url' | 'manual' | 'guide';

export const CharacterImportModal: React.FC<CharacterImportModalProps> = ({
  isOpen,
  onClose,
  onConfirmImport
}) => {
  const [activeTab, setActiveTab] = useState<ImportTab>('png');

  // Input states
  const [jsonText, setJsonText] = useState('');
  const [manualText, setManualText] = useState('');
  const [datacatUrl, setDatacatUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Parse result & preview state
  const [parseResult, setParseResult] = useState<ImportParseResult | null>(null);
  const [previewData, setPreviewData] = useState<ImportedCardData | null>(null);

  // Editable fields in preview
  const [previewName, setPreviewName] = useState('');
  const [previewAge, setPreviewAge] = useState<number>(20);
  const [previewShortDesc, setPreviewShortDesc] = useState('');
  const [previewPersonality, setPreviewPersonality] = useState('');
  const [previewBackground, setPreviewBackground] = useState('');
  const [previewFirstMessage, setPreviewFirstMessage] = useState('');
  const [previewRating, setPreviewRating] = useState<ContentRating>('SFW');
  const [includeLorebook, setIncludeLorebook] = useState(true);

  if (!isOpen) return null;

  // Handle PNG Card upload
  const handlePngFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setParseResult(null);

    const result = await CharacterImportService.parsePngCard(file);
    setParseResult(result);
    if (result.success && result.data) {
      loadPreview(result.data);
    }
    setIsProcessing(false);
  };

  // Handle JSON Card parsing
  const handleParseJson = () => {
    setIsProcessing(true);
    setParseResult(null);

    const result = CharacterImportService.parseJsonCard(jsonText);
    setParseResult(result);
    if (result.success && result.data) {
      loadPreview(result.data);
    }
    setIsProcessing(false);
  };

  // Handle Manual text parsing
  const handleParseManual = () => {
    setIsProcessing(true);
    setParseResult(null);

    const result = CharacterImportService.parseManualText(manualText);
    setParseResult(result);
    if (result.success && result.data) {
      loadPreview(result.data);
    }
    setIsProcessing(false);
  };

  // Handle Datacat URL fetch
  const handleFetchDatacat = async () => {
    setIsProcessing(true);
    setParseResult(null);

    const result = await CharacterImportService.fetchDatacatCharacter(datacatUrl);
    setParseResult(result);
    if (result.success && result.data) {
      loadPreview(result.data);
    }
    setIsProcessing(false);
  };

  // Populate preview state from parsed data
  const loadPreview = (data: ImportedCardData) => {
    setPreviewData(data);
    setPreviewName(data.name);
    setPreviewAge(data.age || 20);
    setPreviewShortDesc(data.shortDescription);
    setPreviewPersonality(data.personality);
    setPreviewBackground(data.background);
    setPreviewFirstMessage(data.firstMessage);
    setPreviewRating(data.contentRating);
  };

  // Apply imported card to character creator
  const handleFinalConfirm = () => {
    if (!previewData) return;

    const finalized: ImportedCardData = {
      ...previewData,
      name: previewName.trim() || previewData.name,
      age: Math.max(previewAge, 18),
      shortDescription: previewShortDesc.trim() || previewData.shortDescription,
      personality: previewPersonality.trim() || previewData.personality,
      background: previewBackground.trim() || previewData.background,
      firstMessage: previewFirstMessage.trim() || previewData.firstMessage,
      contentRating: previewRating,
      lorebook: includeLorebook ? previewData.lorebook : undefined
    };

    onConfirmImport(finalized);
    onClose();
  };

  const handleResetPreview = () => {
    setPreviewData(null);
    setParseResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0e111a] border border-[#222736] rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-modal-pop">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#1b202e] flex items-center justify-between bg-[#121622]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Import Character Card</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-700/30">
                  Datacat & CCv2/v3
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                Import from PNG cards, JSON cards, Datacat links, or raw text.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        {!previewData && (
          <div className="flex items-center border-b border-[#1a1f2c] bg-[#0c0e15] px-3 pt-2 gap-1 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveTab('png')}
              className={`px-3 py-2 font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'png'
                  ? 'bg-[#151926] text-purple-300 border-t border-x border-[#23293d]'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>PNG Card (tEXt)</span>
            </button>

            <button
              onClick={() => setActiveTab('json')}
              className={`px-3 py-2 font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'json'
                  ? 'bg-[#151926] text-purple-300 border-t border-x border-[#23293d]'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>JSON (V1/V2/V3)</span>
            </button>

            <button
              onClick={() => setActiveTab('url')}
              className={`px-3 py-2 font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'url'
                  ? 'bg-[#151926] text-purple-300 border-t border-x border-[#23293d]'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>JannyAI / Datacat URL</span>
            </button>

            <button
              onClick={() => setActiveTab('manual')}
              className={`px-3 py-2 font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'manual'
                  ? 'bg-[#151926] text-purple-300 border-t border-x border-[#23293d]'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Manual Text</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-2 font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'guide'
                  ? 'bg-[#151926] text-purple-300 border-t border-x border-[#23293d]'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Specs & Limits</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* VIEW A: IMPORT INPUT METHODS */}
          {!previewData && (
            <>
              {/* 1. PNG Card Import */}
              {activeTab === 'png' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-[#242b3d] hover:border-purple-500/50 rounded-2xl p-6 sm:p-8 text-center bg-[#111420]/50 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-purple-600/15 text-purple-400 flex items-center justify-center mx-auto mb-3">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">Upload PNG Character Card</h3>
                    <p className="text-xs text-neutral-400 max-w-md mx-auto mb-4">
                      Supports standard AI character PNGs containing embedded <code>tEXt</code> or <code>iTXt</code> metadata
                      chunks (Chub, SillyTavern, Janitor, Datacat exports).
                    </p>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold cursor-pointer transition-colors shadow-sm shadow-purple-600/30">
                      <Upload className="w-4 h-4" />
                      <span>Select PNG File</span>
                      <input
                        type="file"
                        accept="image/png"
                        onChange={handlePngFileSelect}
                        disabled={isProcessing}
                        className="hidden"
                      />
                    </label>
                    <div className="text-[11px] text-neutral-500 mt-2 font-mono">Max size: 15MB · PNG only</div>
                  </div>

                  <div className="bg-[#121520] border border-[#1d2232] rounded-xl p-3 flex items-start gap-2.5 text-neutral-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      Warden AI sanitizes and validates all image metadata chunk payloads. Embedded avatars are preserved
                      and converted to safe local data URLs without external tracking.
                    </p>
                  </div>
                </div>
              )}

              {/* 2. JSON Card Import */}
              {activeTab === 'json' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-neutral-200">Paste JSON Character Card:</label>
                    <label className="text-[11px] text-purple-400 hover:text-purple-300 cursor-pointer flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      <span>Upload .json file</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const r = new FileReader();
                          r.onload = ev => setJsonText(ev.target?.result as string);
                          r.readAsText(file);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <textarea
                    rows={8}
                    value={jsonText}
                    onChange={e => setJsonText(e.target.value)}
                    placeholder='{"spec": "chara_card_v2", "spec_version": "2.0", "data": { "name": "...", "description": "...", "first_mes": "..." }}'
                    className="w-full bg-[#111420] border border-[#212739] rounded-xl p-3 text-white font-mono text-[11px] focus:outline-none focus:border-purple-500"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-neutral-500 font-mono">
                      Accepts Tavern V1, V2, V3 spec, and Warden AI schemas.
                    </span>
                    <button
                      onClick={handleParseJson}
                      disabled={!jsonText.trim() || isProcessing}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl font-semibold transition-colors cursor-pointer"
                    >
                      {isProcessing ? 'Parsing...' : 'Parse JSON'}
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Community URL Import (JannyAI / Datacat / JanitorAI) */}
              {activeTab === 'url' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-neutral-200">Character Card URL (JannyAI / Datacat):</label>
                      <span className="text-[11px] text-purple-400 font-mono">JanitorAI / SillyTavern compatible</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={datacatUrl}
                        onChange={e => setDatacatUrl(e.target.value)}
                        placeholder="https://jannyai.com/characters/... or https://datacat.run/character/..."
                        className="flex-1 bg-[#111420] border border-[#212739] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-purple-500 font-mono text-xs"
                      />
                      <button
                        onClick={handleFetchDatacat}
                        disabled={!datacatUrl.trim() || isProcessing}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl font-semibold transition-colors cursor-pointer shrink-0"
                      >
                        {isProcessing ? 'Verifying...' : 'Fetch Card'}
                      </button>
                    </div>
                  </div>

                  {/* Community Hub compliance & CORS notice */}
                  <div className="bg-[#121622] border border-[#202636] rounded-xl p-3.5 space-y-2 text-neutral-300">
                    <div className="flex items-center gap-2 text-purple-400 font-bold">
                      <Globe className="w-4 h-4" />
                      <span>JannyAI & Datacat Import Notice</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-neutral-400">
                      Warden AI supports characters from <strong>JannyAI</strong> (JanitorAI card base) and <strong>Datacat</strong>:
                    </p>
                    <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-neutral-400">
                      <li>
                        <strong>Browser CORS & Cloudflare Protection:</strong> Web browsers enforce strict cross-origin restrictions that block direct URL calls to external hubs from client-side web apps.
                      </li>
                      <li>
                        <strong>100% Reliable Workflow:</strong> On JannyAI or Datacat, simply click <strong>"Download Card"</strong> or <strong>"Export V2"</strong> (or right-click the character portrait and save as PNG). Then drag-and-drop that PNG into the <strong>"PNG Card"</strong> tab above!
                      </li>
                      <li>
                        All JanitorAI personality traits, scenarios, example dialogues, lore, and avatars are automatically extracted with full fidelity.
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* 4. Manual Text Import */}
              {activeTab === 'manual' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-neutral-200">Paste Raw Text / W++ Definition:</label>
                    <span className="text-[11px] text-neutral-400">Heuristic extraction</span>
                  </div>

                  <textarea
                    rows={8}
                    value={manualText}
                    onChange={e => setManualText(e.target.value)}
                    placeholder={`Name: Seraphina
Description: A skilled tactical engineer in high-collared trenchcoat.
Personality: Analytical, calculating, secretive.
Scenario: Meeting at the underground transit hub during curfew.
First Message: *Seraphina leans against the pillar, eyes locked on you.* "You're late."
Tags: sci-fi, tactical, original-character`}
                    className="w-full bg-[#111420] border border-[#212739] rounded-xl p-3 text-white font-mono text-[11px] focus:outline-none focus:border-purple-500"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-neutral-500">
                      Auto-detects keys: Name, Description, Personality, Scenario, First Message, Tags.
                    </span>
                    <button
                      onClick={handleParseManual}
                      disabled={!manualText.trim() || isProcessing}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl font-semibold transition-colors cursor-pointer"
                    >
                      {isProcessing ? 'Extracting...' : 'Parse Text'}
                    </button>
                  </div>
                </div>
              )}

              {/* 5. Specs & Limits Guide */}
              {activeTab === 'guide' && (
                <div className="space-y-3 text-neutral-300">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Info className="w-4 h-4 text-purple-400" />
                    <span>Import Compatibility Matrix</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-3 bg-[#111420] border border-[#212739] rounded-xl space-y-1">
                      <span className="font-bold text-emerald-400">✓ PNG Character Cards</span>
                      <p className="text-neutral-400">
                        Fully parses <code>chara</code> and <code>ccv3</code> tEXt / iTXt chunks (both raw JSON & Base64 UTF-8 payloads). Extracts embedded portrait avatar automatically.
                      </p>
                    </div>
                    <div className="p-3 bg-[#111420] border border-[#212739] rounded-xl space-y-1">
                      <span className="font-bold text-emerald-400">✓ JSON V1, V2, V3 Cards</span>
                      <p className="text-neutral-400">
                        Compatible with standard Character Card v2/v3 specifications, alternate greetings, creator notes, and embedded lorebooks.
                      </p>
                    </div>
                    <div className="p-3 bg-[#111420] border border-[#212739] rounded-xl space-y-1">
                      <span className="font-bold text-emerald-400">✓ Manual W++ / Plain Text</span>
                      <p className="text-neutral-400">
                        Fallback parser extracts attributes from plain-text character prompts, roleplay templates, and structured lines.
                      </p>
                    </div>
                    <div className="p-3 bg-[#111420] border border-[#212739] rounded-xl space-y-1">
                      <span className="font-bold text-amber-400">⚡ Datacat Live URL Import</span>
                      <p className="text-neutral-400">
                        Subject to browser cross-origin limits and Datacat access controls. If live fetch is blocked, download the PNG card and upload it in the PNG tab.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-purple-950/20 border border-purple-800/30 rounded-xl space-y-1">
                    <span className="font-bold text-purple-300">Safety & Draft Guarantee</span>
                    <p className="text-neutral-400 text-[11px]">
                      All imported cards are saved as <strong>private drafts</strong> by default. No card is published or visible
                      publicly until you explicitly submit it and pass Warden AI's 18+ policy review.
                    </p>
                  </div>
                </div>
              )}

              {/* Error / Warning display */}
              {parseResult && !parseResult.success && (
                <div className="p-3.5 bg-rose-950/30 border border-rose-800/50 rounded-xl text-rose-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div className="space-y-1">
                    <div className="font-bold">{parseResult.error}</div>
                    {parseResult.warnings?.map((w, idx) => (
                      <div key={idx} className="text-[11px] text-rose-200/80">
                        • {w}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* VIEW B: IMPORT PREVIEW & FIELD REVIEW */}
          {previewData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1f2537]">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white">Parsed Character Preview</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-700/40 font-mono">
                    {previewData.originalFormat}
                  </span>
                </div>
                <button
                  onClick={handleResetPreview}
                  className="text-neutral-400 hover:text-white text-[11px] underline cursor-pointer"
                >
                  Choose another file
                </button>
              </div>

              {/* Warnings / Missing fields notification */}
              {previewData.missingMandatoryFields.length > 0 && (
                <div className="p-2.5 bg-amber-950/30 border border-amber-800/40 rounded-xl text-amber-300 flex items-start gap-2 text-[11px]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <span className="font-bold">Missing standard fields: </span>
                    {previewData.missingMandatoryFields.join(', ')}. Please fill them in below before continuing.
                  </div>
                </div>
              )}

              {/* Header preview: Avatar + Name + Age + Content Rating */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-[#121622] p-3 rounded-xl border border-[#1f2537]">
                <img
                  src={previewData.avatarUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150'}
                  alt={previewName}
                  className="w-16 h-16 rounded-xl object-cover ring-1 ring-purple-500/40 bg-neutral-900 shrink-0"
                />
                <div className="flex-1 w-full space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2 space-y-0.5">
                      <label className="text-[10px] font-semibold text-neutral-400">Character Name *</label>
                      <input
                        type="text"
                        value={previewName}
                        onChange={e => setPreviewName(e.target.value)}
                        className="w-full bg-[#181d2c] border border-[#293147] rounded-lg px-2.5 py-1 text-white text-xs font-bold focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-semibold text-neutral-400">Age (18+ Mandatory) *</label>
                      <input
                        type="number"
                        min="18"
                        value={previewAge}
                        onChange={e => setPreviewAge(Math.max(18, parseInt(e.target.value) || 18))}
                        className="w-full bg-[#181d2c] border border-[#293147] rounded-lg px-2.5 py-1 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[10px] text-neutral-400">Rating:</span>
                    {(['SFW', 'Mature', 'NSFW'] as ContentRating[]).map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setPreviewRating(r)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                          previewRating === r
                            ? r === 'NSFW'
                              ? 'bg-rose-950 text-rose-300 border border-rose-700'
                              : 'bg-purple-600 text-white'
                            : 'bg-[#181d2c] text-neutral-400 hover:text-white border border-[#293147]'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                    {previewData.creatorUsername && (
                      <span className="text-[10px] text-neutral-500 ml-auto">
                        Author: <strong className="text-neutral-300">{previewData.creatorUsername}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tag preview */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-neutral-400">Imported Tags</label>
                <div className="flex flex-wrap gap-1">
                  {previewData.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-[#161b29] text-purple-300 border border-[#262f46] text-[10px] font-mono"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Description & Personality */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-neutral-400">Short Description</label>
                <textarea
                  rows={2}
                  value={previewShortDesc}
                  onChange={e => setPreviewShortDesc(e.target.value)}
                  className="w-full bg-[#111420] border border-[#212739] rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-neutral-400">Personality & Traits</label>
                <textarea
                  rows={2}
                  value={previewPersonality}
                  onChange={e => setPreviewPersonality(e.target.value)}
                  className="w-full bg-[#111420] border border-[#212739] rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Scenario / Background */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-neutral-400">Scenario Context & World Setting</label>
                <textarea
                  rows={2}
                  value={previewBackground}
                  onChange={e => setPreviewBackground(e.target.value)}
                  className="w-full bg-[#111420] border border-[#212739] rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* First Message */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-neutral-400">Opening Greeting / First Message</label>
                <textarea
                  rows={3}
                  value={previewFirstMessage}
                  onChange={e => setPreviewFirstMessage(e.target.value)}
                  className="w-full bg-[#111420] border border-[#212739] rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-purple-500 font-sans"
                />
              </div>

              {/* Alternate greetings list indicator if present */}
              {previewData.alternateGreetings.length > 0 && (
                <div className="p-2.5 bg-[#121622] border border-[#1f2537] rounded-xl flex items-center justify-between text-neutral-300">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>
                      {previewData.alternateGreetings.length} Alternate Greeting(s) will be imported as additional
                      scenarios.
                    </span>
                  </div>
                </div>
              )}

              {/* Embedded Lorebook Notice */}
              {previewData.lorebook && (
                <div className="p-3 bg-purple-950/20 border border-purple-800/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-300">
                    <BookOpen className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">{previewData.lorebook.name}</div>
                      <div className="text-[10px] text-neutral-400">
                        {previewData.lorebook.entries.length} lorebook entries embedded in card
                      </div>
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-neutral-300">
                    <input
                      type="checkbox"
                      checked={includeLorebook}
                      onChange={e => setIncludeLorebook(e.target.checked)}
                      className="rounded accent-purple-500"
                    />
                    <span>Import Lorebook</span>
                  </label>
                </div>
              )}

              {/* Unsupported fields notification */}
              {previewData.unsupportedFields.length > 0 && (
                <div className="text-[10px] text-neutral-500">
                  Preserved extra card metadata: {previewData.unsupportedFields.slice(0, 5).join(', ')}
                  {previewData.unsupportedFields.length > 5 ? ` +${previewData.unsupportedFields.length - 5} more` : ''}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#1b202e] bg-[#121622] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer text-xs font-semibold"
          >
            Cancel
          </button>

          {previewData ? (
            <button
              onClick={handleFinalConfirm}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-purple-600/30"
            >
              <span>Apply to Character Creator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="text-[11px] text-neutral-400">
              Select or paste card data above to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
