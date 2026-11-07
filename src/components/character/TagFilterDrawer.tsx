import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal
} from 'lucide-react';
import { Tag, TagCategory } from '../../types';

interface TagFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  allTags: Tag[];
  selectedTagSlugs: string[];
  onToggleTag: (slug: string) => void;
  matchMode: 'all' | 'any';
  onChangeMatchMode: (mode: 'all' | 'any') => void;
  onClearTags: () => void;
  onAddNewTag?: (name: string, category: TagCategory) => void;
  matchingCount?: number;
}

interface CategoryConfig {
  id: TagCategory;
  label: string;
  defaultExpanded: boolean;
  samplePills?: { label: string; slug: string }[];
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: 'gender',
    label: 'Character Gender',
    defaultExpanded: true,
    samplePills: [
      { label: 'Male', slug: 'male' },
      { label: 'Female', slug: 'female' },
      { label: 'Non-binary', slug: 'non-binary' },
      { label: 'Any', slug: 'any_gender' }
    ]
  },
  {
    id: 'romance',
    label: 'Romance & Attraction',
    defaultExpanded: true,
    samplePills: [
      { label: 'Any', slug: 'any_romance' },
      { label: 'Straight', slug: 'straight' },
      { label: 'Gay', slug: 'mlm' },
      { label: 'Lesbian', slug: 'wlw' },
      { label: 'Bi', slug: 'bisexual' },
      { label: 'Pan', slug: 'pansexual' },
      { label: 'Asexual', slug: 'asexual' }
    ]
  },
  {
    id: 'personality',
    label: 'Personality',
    defaultExpanded: true,
    samplePills: [
      { label: 'Any', slug: 'any_personality' },
      { label: 'Tsundere', slug: 'tsundere' },
      { label: 'Yandere', slug: 'yandere' },
      { label: 'Kuudere', slug: 'kuudere' },
      { label: 'Calm', slug: 'cold' },
      { label: 'Energetic', slug: 'playful' },
      { label: 'Dominant', slug: 'dominant-personality' },
      { label: 'Submissive', slug: 'submissive-personality' }
    ]
  },
  { id: 'relationship', label: 'Relationship Dynamics', defaultExpanded: false },
  { id: 'power', label: 'Power Dynamics', defaultExpanded: false },
  { id: 'genre', label: 'Genre', defaultExpanded: false },
  { id: 'species', label: 'Character Species', defaultExpanded: false },
  { id: 'scenario', label: 'Scenario & Setting', defaultExpanded: false },
  { id: 'style', label: 'Roleplay Style', defaultExpanded: false },
  { id: 'rating', label: 'Content Rating', defaultExpanded: false },
  { id: 'theme', label: 'Additional Themes', defaultExpanded: false }
];

export const TagFilterDrawer: React.FC<TagFilterDrawerProps> = ({
  isOpen,
  onClose,
  allTags,
  selectedTagSlugs,
  onToggleTag,
  matchMode,
  onChangeMatchMode,
  onClearTags,
  matchingCount = 24
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    gender: true,
    romance: true,
    personality: true
  });

  if (!isOpen) return null;

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const getTagsForCategory = (category: TagCategory) => {
    return allTags.filter(t => t.category === category);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0c0e14] border-x border-[#1a1d27] h-full flex flex-col justify-between overflow-hidden shadow-2xl animate-modal-pop">
        {/* Top Header */}
        <div className="h-[52px] px-4 border-b border-[#1a1d27] flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm font-semibold text-white hover:text-purple-400 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 text-neutral-400" />
            <span>Filters & Search</span>
          </button>

          <button
            onClick={onClearTags}
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>

        {/* Scrollable Filter Categories */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {CATEGORIES.map(cat => {
            const isExpanded = expandedCategories[cat.id];
            const tags = getTagsForCategory(cat.id);

            return (
              <div key={cat.id} className="border-b border-[#171b26] pb-3">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center justify-between py-1.5 text-left text-xs font-bold text-neutral-200 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{cat.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-neutral-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-500" />
                  )}
                </button>

                {/* Category Pills */}
                {isExpanded && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {/* If category has specific sample pills, render them */}
                    {cat.samplePills ? (
                      cat.samplePills.map(pill => {
                        const isSelected = selectedTagSlugs.includes(pill.slug);
                        return (
                          <button
                            key={pill.slug}
                            onClick={() => {
                              if (pill.slug.startsWith('any_')) {
                                // clear category tags
                                const catTags = getTagsForCategory(cat.id).map(t => t.slug);
                                catTags.forEach(s => {
                                  if (selectedTagSlugs.includes(s)) onToggleTag(s);
                                });
                              } else {
                                onToggleTag(pill.slug);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-purple-600 text-white font-semibold'
                                : 'bg-[#151822] text-neutral-300 hover:bg-[#1c2130] hover:text-white border border-[#202534]'
                            }`}
                          >
                            {pill.label}
                          </button>
                        );
                      })
                    ) : (
                      tags.map(tag => {
                        const isSelected = selectedTagSlugs.includes(tag.slug);
                        return (
                          <button
                            key={tag.id}
                            onClick={() => onToggleTag(tag.slug)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-purple-600 text-white font-semibold'
                                : 'bg-[#151822] text-neutral-300 hover:bg-[#1c2130] hover:text-white border border-[#202534]'
                            }`}
                          >
                            {tag.name}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sticky Bottom Apply Button */}
        <div className="p-4 border-t border-[#1a1d27] bg-[#0c0e14] shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer"
          >
            Apply Filters ({matchingCount})
          </button>
        </div>
      </div>
    </div>
  );
};
