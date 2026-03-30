import { useState, useEffect, useRef, useMemo } from "react";
import { getAllNavItems } from "../../data/navigation";
import { faq } from "../../data/faq";
import { guidelines } from "../../data/guidelines";
import { professionalism } from "../../data/catalog/professionalism";
import { tech } from "../../data/catalog/tech";
import { knowledge } from "../../data/catalog/knowledge";
import { collaboration } from "../../data/catalog/collaboration";
import "./CommandPalette.css";

export interface SearchItem {
  key: string;
  label: string;
  icon: string;
  type: "page" | "faq" | "guideline" | "catalog";
  pageId: string;
  subId?: number;
  catalogItemId?: string;
  searchText: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: SearchItem) => void;
}

function buildSearchIndex(): SearchItem[] {
  const items: SearchItem[] = [];

  for (const nav of getAllNavItems()) {
    items.push({
      key: `page-${nav.id}`,
      label: nav.label,
      icon: nav.icon,
      type: "page",
      pageId: nav.id,
      searchText: nav.label.toLowerCase(),
    });
  }

  // Catalog first
  const catalogItems = [...professionalism, ...tech, ...knowledge, ...collaboration];
  for (const item of catalogItems) {
    items.push({
      key: `catalog-${item.id}`,
      label: item.name,
      icon: "ri-award-line",
      type: "catalog",
      pageId: item.category,
      catalogItemId: item.id,
      searchText: `${item.name} ${item.subcategory ?? ""} ${item.points}`.toLowerCase(),
    });
  }

  for (const g of guidelines) {
    items.push({
      key: `guide-${g.id}`,
      label: g.title,
      icon: g.icon,
      type: "guideline",
      pageId: "guidelines",
      subId: g.id,
      searchText: `${g.title} ${g.points.join(" ")}`.toLowerCase(),
    });
  }

  for (const q of faq) {
    items.push({
      key: `faq-${q.id}`,
      label: q.question,
      icon: "ri-questionnaire-line",
      type: "faq",
      pageId: "faq",
      subId: q.id,
      searchText: `${q.question} ${q.answer}`.toLowerCase(),
    });
  }

  return items;
}

const TYPE_LABELS: Record<SearchItem["type"], string> = {
  page: "Pages",
  faq: "FAQ",
  guideline: "Guidelines",
  catalog: "Catalog",
};

export default function CommandPalette({
  isOpen,
  onClose,
  onSelect,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allItems = useMemo(() => buildSearchIndex(), []);

  const filtered = useMemo(() => {
    if (!query) return allItems.filter((i) => i.type === "page");
    const lower = query.toLowerCase();
    return allItems.filter((item) => item.searchText.includes(lower));
  }, [query, allItems]);

  // Build flat list with category headers for rendering
  const grouped = useMemo(() => {
    const result: { type: "header" | "item"; label?: string; item?: SearchItem; flatIndex: number }[] = [];
    let currentType: string | null = null;
    let flatIndex = 0;

    for (const item of filtered) {
      if (item.type !== currentType) {
        currentType = item.type;
        result.push({ type: "header", label: TYPE_LABELS[item.type], flatIndex: -1 });
      }
      result.push({ type: "item", item, flatIndex });
      flatIndex++;
    }
    return result;
  }, [filtered]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll(".command-palette-item");
      const selected = items[selectedIndex] as HTMLElement;
      selected?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleSelect = (item: SearchItem) => {
    onSelect(item);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => (i < filtered.length - 1 ? i + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => (i > 0 ? i - 1 : filtered.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[selectedIndex]) {
          handleSelect(filtered[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div
        className="command-palette"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="command-palette-input-wrapper">
          <i className="ri-search-line command-palette-search-icon"></i>
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Search pages, FAQ, guidelines..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="command-palette-kbd">ESC</kbd>
        </div>
        <div className="command-palette-results" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="command-palette-empty">No results found</div>
          ) : (
            grouped.map((entry) => {
              if (entry.type === "header") {
                return (
                  <div key={`h-${entry.label}`} className="command-palette-category">
                    {entry.label}
                  </div>
                );
              }
              const item = entry.item!;
              return (
                <button
                  key={item.key}
                  className={`command-palette-item${entry.flatIndex === selectedIndex ? " selected" : ""}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(entry.flatIndex)}
                >
                  <i className={`${item.icon} command-palette-item-icon`}></i>
                  <span className="command-palette-item-label">
                    {highlightMatch(item.label, query)}
                  </span>
                  {item.type !== "page" && (
                    <span className="command-palette-item-type">
                      {TYPE_LABELS[item.type]}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="command-palette-highlight">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}
