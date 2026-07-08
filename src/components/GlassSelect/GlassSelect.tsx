import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import './GlassSelect.css';

export interface GlassSelectOption {
  value: string;
  label: string;
  /** Optional right-aligned hint (e.g. points) */
  sub?: string;
}

interface GlassSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: GlassSelectOption[];
  placeholder?: string;
  /** Show a search box inside the dropdown (recommended for >10 options) */
  searchable?: boolean;
  className?: string;
}

/**
 * Custom select — replaces the OS-rendered native <select> popup with a
 * design-system dropdown. Portal-rendered so it escapes overflow clipping
 * and the glass window's backdrop-filter containing block.
 * Keyboard: ↑/↓ highlight, Enter select, Esc close.
 */
export default function GlassSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchable = false,
  className = '',
}: GlassSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, up: false });

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const openDropdown = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const up = spaceBelow < 320 && rect.top > 320;
      setPos({
        top: up ? rect.top - 8 : rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        up,
      });
    }
    setQuery('');
    setHighlight(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  // Close on outside interaction / Esc / scroll-away
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        !popRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Autofocus search when opening
  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault();
      openDropdown();
    }
  };

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) pick(opt.value);
    }
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={`glass-select-trigger ${className}${open ? ' open' : ''}`}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        onKeyDown={onTriggerKey}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`glass-select-value${selected ? '' : ' placeholder'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <i className={`ri-arrow-${open ? 'up' : 'down'}-s-line glass-select-chevron`}></i>
      </button>

      {open &&
        createPortal(
          <div
            ref={popRef}
            className="glass-select-pop"
            style={{
              top: pos.up ? undefined : pos.top,
              bottom: pos.up ? window.innerHeight - pos.top : undefined,
              left: pos.left,
              minWidth: pos.width,
            }}
            onKeyDown={onListKey}
          >
            {searchable && (
              <div className="glass-select-search">
                <i className="ri-search-line"></i>
                <input
                  ref={searchRef}
                  value={query}
                  placeholder="Search…"
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setHighlight(0);
                  }}
                  onKeyDown={onListKey}
                />
              </div>
            )}
            <ul className="glass-select-list" role="listbox">
              {filtered.length === 0 && (
                <li className="glass-select-empty">No matches</li>
              )}
              {filtered.map((o, i) => (
                <li key={o.value || 'empty'} role="option" aria-selected={o.value === value}>
                  <button
                    type="button"
                    className={`glass-select-option${o.value === value ? ' selected' : ''}${i === highlight ? ' highlighted' : ''}`}
                    onClick={() => pick(o.value)}
                    onMouseEnter={() => setHighlight(i)}
                  >
                    <span className="glass-select-option-label">{o.label}</span>
                    {o.sub && <span className="glass-select-option-sub">{o.sub}</span>}
                    {o.value === value && <i className="ri-check-line"></i>}
                  </button>
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
