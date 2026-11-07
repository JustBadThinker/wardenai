/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Key,
  Check,
  Globe,
  Sliders,
  ChevronDown,
  ChevronUp,
  X,
  Upload,
  Download,
  FileJson
} from 'lucide-react';
import { Lorebook, LorebookEntry, User } from '../types';

interface LorebooksViewProps {
  lorebooks: Lorebook[];
  currentUser: User;
  onSaveLorebook: (lorebook: Lorebook) => void;
  onDeleteLorebook: (id: string) => void;
}

export const LorebooksView: React.FC<LorebooksViewProps> = ({
  lorebooks,
  currentUser,
  onSaveLorebook,
  onDeleteLorebook
}) => {
  const [selectedLorebookId, setSelectedLorebookId] = useState<string>(lorebooks[0]?.id || '');
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);

  // New entry form
  const [newEntryTitle, setNewEntryTitle] = useState('');
  const [newEntryKeys, setNewEntryKeys] = useState('');
  const [newEntrySecondaryKeys, setNewEntrySecondaryKeys] = useState('');
  const [newEntrySelective, setNewEntrySelective] = useState(false);
  const [newEntryContent, setNewEntryContent] = useState('');
  const [newEntryPriority, setNewEntryPriority] = useState(10);
  const [showAddEntry, setShowAddEntry] = useState(false);

  const selectedLorebook = lorebooks.find(l => l.id === selectedLorebookId) || lorebooks[0];

  // Handle Import from SillyTavern / Janitor AI / Chub JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Can be SillyTavern format { name: "...", entries: { "0": {...} } }
        // or Janitor AI / character_book format { name: "...", entries: [ {...} ] }
        const bookData = parsed.character_book || parsed;
        const title = bookData.name || bookData.title || file.name.replace(/\.[^/.]+$/, '');
        const description = bookData.description || 'Imported world compendium';

        let rawEntries: any[] = [];
        if (Array.isArray(bookData.entries)) {
          rawEntries = bookData.entries;
        } else if (typeof bookData.entries === 'object' && bookData.entries !== null) {
          rawEntries = Object.values(bookData.entries);
        }

        const entries: LorebookEntry[] = rawEntries.map((re, idx) => {
          const keys = Array.isArray(re.keys)
            ? re.keys
            : Array.isArray(re.key)
            ? re.key
            : typeof re.key === 'string'
            ? re.key.split(',').map((s: string) => s.trim())
            : [];
          const secondary = Array.isArray(re.keysecondary)
            ? re.keysecondary
            : Array.isArray(re.secondary_keys)
            ? re.secondary_keys
            : [];

          return {
            id: 'ent_' + Date.now().toString(36) + '_' + idx,
            title: re.comment || re.name || re.title || `Entry #${idx + 1}`,
            keys: keys.map((k: string) => k.toLowerCase().trim()).filter(Boolean),
            secondaryKeys: secondary.map((k: string) => k.toLowerCase().trim()).filter(Boolean),
            content: re.content || '',
            priority: Number(re.order ?? re.priority ?? re.insertion_order ?? 10),
            enabled: re.disable !== true && re.enabled !== false,
            selective: Boolean(re.selective),
            constant: Boolean(re.constant)
          };
        });

        const newLb: Lorebook = {
          id: 'lb_' + Date.now().toString(36),
          userId: currentUser.id,
          title,
          description,
          isPublic: true,
          createdAt: new Date().toISOString(),
          scanDepth: bookData.scan_depth || 100,
          tokenBudget: bookData.token_budget || 500,
          recursiveScanning: bookData.recursive_scanning || false,
          entries: entries.length > 0 ? entries : [
            {
              id: 'ent_' + Date.now().toString(36),
              title: 'Default Entry',
              keys: ['world'],
              content: 'World lore info.',
              priority: 10,
              enabled: true
            }
          ]
        };

        onSaveLorebook(newLb);
        setSelectedLorebookId(newLb.id);
      } catch (err) {
        alert('Failed to parse Lorebook JSON. Please make sure it is a valid SillyTavern, Janitor AI, or Chub lorebook file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export strictly in universal SillyTavern / Janitor AI format
  const handleExportJson = () => {
    if (!selectedLorebook) return;

    // Convert entries to standard SillyTavern format
    const stEntries: Record<string, any> = {};
    selectedLorebook.entries.forEach((ent, idx) => {
      stEntries[idx.toString()] = {
        uid: idx,
        key: ent.keys,
        keysecondary: ent.secondaryKeys || [],
        comment: ent.title,
        content: ent.content,
        constant: Boolean(ent.constant),
        selective: Boolean(ent.selective),
        order: ent.priority,
        position: 0,
        disable: !ent.enabled
      };
    });

    const exportPayload = {
      name: selectedLorebook.title,
      description: selectedLorebook.description,
      scan_depth: selectedLorebook.scanDepth || 100,
      token_budget: selectedLorebook.tokenBudget || 500,
      recursive_scanning: selectedLorebook.recursiveScanning || false,
      entries: stEntries
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedLorebook.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_lorebook.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateNewLorebook = () => {
    const newLb: Lorebook = {
      id: 'lb_' + Date.now().toString(36),
      userId: currentUser.id,
      title: 'New World Lorebook',
      description: 'World lore, factions, and locations.',
      isPublic: true,
      createdAt: new Date().toISOString(),
      entries: [
        {
          id: 'ent_' + Date.now().toString(36),
          title: 'Prime Location',
          keys: ['capital', 'citadel', 'city'],
          content: 'The central citadel of the realm, surrounded by concentric brass walls.',
          priority: 10,
          enabled: true
        }
      ]
    };
    onSaveLorebook(newLb);
    setSelectedLorebookId(newLb.id);
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntryTitle.trim() || !newEntryContent.trim() || !selectedLorebook) return;

    const keys = newEntryKeys
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(Boolean);

    const secondaryKeys = newEntrySecondaryKeys
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(Boolean);

    const newEntry: LorebookEntry = {
      id: 'ent_' + Date.now().toString(36),
      title: newEntryTitle.trim(),
      keys: keys.length ? keys : [newEntryTitle.trim().toLowerCase()],
      secondaryKeys,
      selective: newEntrySelective,
      content: newEntryContent.trim(),
      priority: Number(newEntryPriority) || 10,
      enabled: true
    };

    const updated = {
      ...selectedLorebook,
      entries: [...selectedLorebook.entries, newEntry]
    };

    onSaveLorebook(updated);
    setNewEntryTitle('');
    setNewEntryKeys('');
    setNewEntrySecondaryKeys('');
    setNewEntrySelective(false);
    setNewEntryContent('');
    setShowAddEntry(false);
  };

  const handleDeleteEntry = (entryId: string) => {
    if (!selectedLorebook) return;
    const updated = {
      ...selectedLorebook,
      entries: selectedLorebook.entries.filter(e => e.id !== entryId)
    };
    onSaveLorebook(updated);
  };

  const handleToggleEntry = (entryId: string) => {
    if (!selectedLorebook) return;
    const updated = {
      ...selectedLorebook,
      entries: selectedLorebook.entries.map(e => (e.id === entryId ? { ...e, enabled: !e.enabled } : e))
    };
    onSaveLorebook(updated);
  };

  return (
    <div className="max-w-5xl mx-auto pb-16 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span>Lorebooks & World Compendiums</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Create contextual world encyclopedias that dynamically trigger and inject into active AI roleplay prompts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-700">
            <Upload className="w-4 h-4 text-purple-400" />
            <span>Import (.json)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </label>

          {selectedLorebook && (
            <button
              onClick={handleExportJson}
              className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-700"
              title="Export SillyTavern / Janitor AI JSON"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export</span>
            </button>
          )}

          <button
            onClick={handleCreateNewLorebook}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>New Lorebook</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Lorebooks List */}
        <div className="space-y-3">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
            Compendiums ({lorebooks.length})
          </span>

          <div className="space-y-2">
            {lorebooks.map(lb => (
              <div
                key={lb.id}
                onClick={() => setSelectedLorebookId(lb.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedLorebook?.id === lb.id
                    ? 'bg-indigo-600/15 border-indigo-500/40 text-white ring-1 ring-indigo-500/20'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <div className="font-bold text-xs truncate">{lb.title}</div>
                <div className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                  {lb.description}
                </div>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-neutral-500 font-mono">
                  <span>{lb.entries.length} entries</span>
                  <span aria-hidden="true">·</span>
                  <span>{lb.isPublic ? 'Public' : 'Private'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (2 cols): Selected Lorebook Entries */}
        {selectedLorebook ? (
          <div className="md:col-span-2 space-y-5">
            <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-2xl space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-white">{selectedLorebook.title}</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">{selectedLorebook.description}</p>
                </div>
                {lorebooks.length > 1 && (
                  <button
                    onClick={() => onDeleteLorebook(selectedLorebook.id)}
                    className="p-1.5 text-neutral-500 hover:text-rose-400 transition-colors"
                    title="Delete Lorebook"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Entries Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Knowledge Entries ({selectedLorebook.entries.length})
                </span>
                <button
                  onClick={() => setShowAddEntry(!showAddEntry)}
                  className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Add Entry</span>
                </button>
              </div>

              {/* Add Entry Card */}
              {showAddEntry && (
                <form
                  onSubmit={handleAddEntry}
                  className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <span className="text-xs font-bold text-white">Create Knowledge Entry</span>
                    <button
                      type="button"
                      onClick={() => setShowAddEntry(false)}
                      className="text-neutral-500 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-300">
                      Entry Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. OmniCorp Security"
                      value={newEntryTitle}
                      onChange={e => setNewEntryTitle(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-neutral-300">
                        Primary Activation Keywords
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. omnicorp, gunship, patrol"
                        value={newEntryKeys}
                        onChange={e => setNewEntryKeys(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-neutral-300 flex items-center justify-between">
                        <span>Secondary Keywords (SillyTavern)</span>
                        <span className="text-[10px] text-neutral-500">Optional</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. sector 4, undercity"
                        value={newEntrySecondaryKeys}
                        onChange={e => setNewEntrySecondaryKeys(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="entrySelective"
                      checked={newEntrySelective}
                      onChange={e => setNewEntrySelective(e.target.checked)}
                      className="rounded text-indigo-600 bg-neutral-900 border-neutral-800"
                    />
                    <label htmlFor="entrySelective" className="text-xs text-neutral-300 cursor-pointer">
                      Selective trigger (Requires both primary AND secondary keywords in recent text)
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-300">
                      Content to Inject into Context
                    </label>
                    <textarea
                      rows={3}
                      placeholder="World information that the AI will receive when triggered..."
                      value={newEntryContent}
                      onChange={e => setNewEntryContent(e.target.value)}
                      className="w-full p-2.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddEntry(false)}
                      className="px-3 py-1 bg-neutral-800 text-neutral-300 text-xs rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg"
                    >
                      Save Entry
                    </button>
                  </div>
                </form>
              )}

              {/* Entries List */}
              <div className="space-y-3">
                {selectedLorebook.entries.map(entry => (
                  <div
                    key={entry.id}
                    className={`p-4 rounded-xl border transition-all space-y-2 ${
                      entry.enabled
                        ? 'bg-neutral-900/80 border-neutral-800'
                        : 'bg-neutral-950 border-neutral-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={entry.enabled}
                          onChange={() => handleToggleEntry(entry.id)}
                          className="rounded text-indigo-600 bg-neutral-950 border-neutral-800 cursor-pointer"
                        />
                        <h4 className="text-xs font-bold text-white">{entry.title}</h4>
                      </div>

                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="text-neutral-500 hover:text-rose-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <Key className="w-3 h-3 text-neutral-500" />
                      {entry.keys.map(k => (
                        <span key={k} className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                          {k}
                        </span>
                      ))}
                      {entry.secondaryKeys && entry.secondaryKeys.map(sk => (
                        <span key={sk} className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" title="Secondary keyword">
                          +{sk}
                        </span>
                      ))}
                      {entry.selective && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[9px] font-bold uppercase">
                          Selective
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-neutral-300 leading-relaxed pt-1">
                      {entry.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="md:col-span-2 text-center py-16 text-xs text-neutral-500">
            Select or create a lorebook to view its entries.
          </div>
        )}
      </div>
    </div>
  );
};
