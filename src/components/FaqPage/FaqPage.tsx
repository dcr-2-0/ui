import { useState, useEffect, useRef, useMemo } from "react";
import { faq } from "../../data/faq";
import "./FaqPage.css";

interface FaqPageProps {
  focusId?: number | null;
  onFocusConsumed?: () => void;
}

export default function FaqPage({ focusId, onFocusConsumed }: FaqPageProps) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    if (focusId != null) {
      setSearch("");
      setOpenId(focusId);
      onFocusConsumed?.();
      requestAnimationFrame(() => {
        cardRefs.current[focusId]?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [focusId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return faq;
    const q = search.toLowerCase();
    return faq.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q),
    );
  }, [search]);

  const toggle = (id: number) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="faq-page">
      <p className="faq-subtitle">
        Find answers to common questions about the DCR program, requirements,
        and processes.
      </p>

      <div className="faq-search-wrapper">
        <i className="ri-search-line faq-search-icon"></i>
        <input
          className="faq-search"
          type="text"
          placeholder="Search questions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="faq-search-clear" onClick={() => setSearch("")}>
            <i className="ri-close-line"></i>
          </button>
        )}
      </div>

      <div className="faq-list">
        {filtered.length === 0 && (
          <p className="faq-empty">
            No questions match your search. Try different keywords.
          </p>
        )}
        {filtered.map((item) => {
          const isOpen = openId === item.id;
          return (
            <div
              key={item.id}
              ref={(el) => { cardRefs.current[item.id] = el; }}
              className={`faq-card${isOpen ? " open" : ""}`}
            >
              <button
                className="faq-question"
                onClick={() => toggle(item.id)}
                aria-expanded={isOpen}
              >
                <span className="faq-badge">Q</span>
                <h3 className="faq-question-text">{item.question}</h3>
                <span className={`faq-toggle-icon${isOpen ? " open" : ""}`}>
                  {isOpen ? "\u2212" : "+"}
                </span>
              </button>
              <div className={`faq-answer-wrapper${isOpen ? " open" : ""}`}>
                <div className="faq-answer-inner">
                  <div className="faq-answer">
                    <span className="faq-badge answer">A</span>
                    <p className="faq-answer-text">{item.answer}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
