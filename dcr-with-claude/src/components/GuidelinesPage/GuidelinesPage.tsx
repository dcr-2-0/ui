import { useState, useEffect, useRef } from "react";
import { guidelines } from "../../data/guidelines";
import "./GuidelinesPage.css";

interface GuidelinesPageProps {
  focusId?: number | null;
  onFocusConsumed?: () => void;
}

export default function GuidelinesPage({ focusId, onFocusConsumed }: GuidelinesPageProps) {
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    if (focusId != null) {
      setOpenIds((prev) => new Set([...prev, focusId]));
      onFocusConsumed?.();
      requestAnimationFrame(() => {
        cardRefs.current[focusId]?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [focusId]);

  const toggle = (id: number) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () =>
    setOpenIds(new Set(guidelines.map((g) => g.id)));
  const collapseAll = () => setOpenIds(new Set());

  return (
    <div className="guidelines-page">
      <div className="guidelines-controls">
        <button className="guidelines-toggle-btn" onClick={expandAll}>
          Expand all
        </button>
        <button className="guidelines-toggle-btn" onClick={collapseAll}>
          Collapse all
        </button>
      </div>

      <div className="guidelines-list">
        {guidelines.map((section, idx) => {
          const isOpen = openIds.has(section.id);
          return (
            <div
              key={section.id}
              ref={(el) => { cardRefs.current[section.id] = el; }}
              className={`guideline-card${isOpen ? " open" : ""}`}
            >
              <button
                className="guideline-header"
                onClick={() => toggle(section.id)}
                aria-expanded={isOpen}
              >
                <span className="guideline-number">{idx + 1}</span>
                <i className={`guideline-icon ${section.icon}`}></i>
                <h3 className="guideline-title">{section.title}</h3>
                <i
                  className={`guideline-chevron ri-arrow-down-s-line${isOpen ? " rotated" : ""}`}
                ></i>
              </button>
              <div className={`guideline-body${isOpen ? " open" : ""}`}>
                <div className="guideline-body-inner">
                  <ul className="guideline-points">
                    {section.points.map((point, i) => (
                      <li key={i} className="guideline-point">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
