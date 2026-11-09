import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption<T = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  description?: string;
  badge?: string;
  disabled?: boolean;
}

export interface CustomSelectProps<T = string> {
  value: T;
  onChange: (value: T) => void;
  options: (SelectOption<T> | (T extends string ? string : never))[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  id?: string;
  name?: string;
  ariaLabel?: string;
}

export function CustomSelect<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  disabled = false,
  className = '',
  menuClassName = '',
  size = 'md',
  icon,
  id,
  name,
  ariaLabel
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    openUpward: boolean;
  }>({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 260,
    openUpward: false
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionsListRef = useRef<HTMLDivElement>(null);

  // Normalize options
  const normalizedOptions: SelectOption<T>[] = options.map(opt => {
    if (typeof opt === 'string') {
      return { value: opt as unknown as T, label: opt };
    }
    return opt as SelectOption<T>;
  });

  const selectedIndex = normalizedOptions.findIndex(opt => opt.value === value);
  const selectedOption = selectedIndex >= 0 ? normalizedOptions[selectedIndex] : undefined;

  // Update positioning when opening or on resize/scroll
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    // If trigger has been scrolled out of visible viewport, close cleanly
    if (rect.bottom < 0 || rect.top > windowHeight) {
      setIsOpen(false);
      return;
    }

    const spaceBelow = windowHeight - rect.bottom;
    const spaceAbove = rect.top;

    const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(140, Math.min(280, openUpward ? spaceAbove - 20 : spaceBelow - 20));

    // Match trigger width, but ensure comfortable minimum width for options with descriptions
    const width = Math.max(rect.width, 180);

    // Dynamic horizontal position to prevent off-screen overflow
    let left = rect.left;
    if (left + width > windowWidth - 12) {
      left = Math.max(12, rect.right - width);
    }
    left = Math.max(12, left);

    const top = openUpward ? rect.top - 6 : rect.bottom + 6;

    setMenuPosition({
      top,
      left,
      width,
      maxHeight,
      openUpward
    });
  }, [normalizedOptions.length]);

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [isOpen, selectedIndex, updatePosition]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionsListRef.current) {
      const items = optionsListRef.current.querySelectorAll('[role="option"]');
      const targetItem = items[highlightedIndex] as HTMLElement;
      if (targetItem) {
        targetItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => {
          let next = prev + 1;
          while (next < normalizedOptions.length && normalizedOptions[next].disabled) {
            next++;
          }
          return next < normalizedOptions.length ? next : prev;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => {
          let next = prev - 1;
          while (next >= 0 && normalizedOptions[next].disabled) {
            next--;
          }
          return next >= 0 ? next : prev;
        });
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (highlightedIndex >= 0 && highlightedIndex < normalizedOptions.length) {
          const opt = normalizedOptions[highlightedIndex];
          if (!opt.disabled) {
            e.preventDefault();
            onChange(opt.value);
            setIsOpen(false);
            triggerRef.current?.focus();
          }
        }
      } else if (e.key === 'Tab') {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('pointerdown', handlePointerDownOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, highlightedIndex, normalizedOptions, onChange, updatePosition]);

  // Size variations
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-[11px] rounded-lg min-h-[32px]',
    md: 'px-3 py-2 text-xs rounded-xl min-h-[38px]',
    lg: 'px-3.5 py-2.5 text-sm rounded-xl min-h-[44px]'
  }[size];

  const handleSelect = (opt: SelectOption<T>) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="relative inline-block w-full">
      {/* Hidden input for form support if name is provided */}
      {name && <input type="hidden" name={name} value={String(value)} />}

      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || (typeof selectedOption?.label === 'string' ? selectedOption.label : undefined)}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        className={`w-full bg-[#12151e] border border-[#222736] text-neutral-200 transition-all select-none
          flex items-center justify-between gap-2 cursor-pointer
          hover:border-purple-500/50 hover:bg-[#161a26]
          focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/80
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[#222736] disabled:hover:bg-[#12151e]
          ${isOpen ? 'border-purple-500/80 ring-1 ring-purple-500/50 bg-[#161a26]' : ''}
          ${sizeClasses}
          ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
          {icon && <span className="shrink-0 text-purple-400">{icon}</span>}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate font-medium">
            {selectedOption ? selectedOption.label : <span className="text-neutral-500">{placeholder}</span>}
          </span>
          {selectedOption?.badge && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-purple-400' : ''
          }`}
        />
      </button>

      {/* Floating Menu via Portal */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            tabIndex={-1}
            style={{
              position: 'fixed',
              top: menuPosition.openUpward ? undefined : `${menuPosition.top}px`,
              bottom: menuPosition.openUpward ? `${window.innerHeight - menuPosition.top}px` : undefined,
              left: `${menuPosition.left}px`,
              width: `${menuPosition.width}px`,
              maxHeight: `${menuPosition.maxHeight}px`,
              zIndex: 999999
            }}
            className={`bg-[#0f121a]/98 backdrop-blur-2xl border border-[#262c3e] rounded-xl shadow-2xl shadow-black/95 p-1.5
              flex flex-col animate-[scaleIn_0.14s_ease-out] select-none ${menuClassName}`}
          >
            <div
              ref={optionsListRef}
              className="overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar"
              style={{ maxHeight: `${menuPosition.maxHeight - 12}px` }}
            >
              {normalizedOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left px-2.5 py-2 text-xs rounded-lg transition-all flex items-center justify-between gap-2.5 cursor-pointer select-none group
                      ${
                        isSelected
                          ? 'bg-purple-600/25 text-purple-200 font-semibold border-l-2 border-purple-500 pl-2'
                          : isHighlighted
                          ? 'bg-white/[0.08] text-white'
                          : 'text-neutral-300 hover:text-white hover:bg-white/[0.07]'
                      }
                      ${opt.disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{opt.label}</span>
                        {opt.description && (
                          <span className="text-[10px] text-neutral-400 group-hover:text-neutral-300 font-normal truncate mt-0.5">
                            {opt.description}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.badge && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
