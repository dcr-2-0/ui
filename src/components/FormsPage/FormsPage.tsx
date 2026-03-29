import { useState } from "react";
import { forms } from "../../data/forms";
import type { FormItem } from "../../data/forms";
import "./FormsPage.css";

export default function FormsPage() {
  const [selectedForm, setSelectedForm] = useState<FormItem | null>(null);

  if (selectedForm) {
    return (
      <div className="forms-individual">
        <button className="back-btn" onClick={() => setSelectedForm(null)}>
          <i className="ri-arrow-left-line"></i> Back to Forms
        </button>

        <div className="form-hero">
          <span className="form-hero-icon">{selectedForm.icon}</span>
          <h2 className="form-hero-title">{selectedForm.title}</h2>
          <p className="form-hero-desc">{selectedForm.description}</p>
        </div>

        <div className="form-embed-wrapper">
          <iframe
            src={selectedForm.googleFormUrl}
            className="form-embed"
            title={selectedForm.title}
          >
            Loading Google Form...
          </iframe>
        </div>
      </div>
    );
  }

  return (
    <div className="forms-grid-page">
      <div className="forms-grid">
        {forms.map((form) => {
          const comingSoon = form.status === "coming_soon";
          return (
            <button
              key={form.id}
              className={`form-card${comingSoon ? " coming-soon" : ""}`}
              onClick={() => !comingSoon && setSelectedForm(form)}
              disabled={comingSoon}
            >
              {comingSoon && (
                <span className="coming-soon-badge">Coming Soon</span>
              )}
              <span className="form-card-icon">{form.icon}</span>
              <h3 className="form-card-title">{form.title}</h3>
              <p className="form-card-desc">{form.description}</p>
              {comingSoon ? (
                <div className="form-card-placeholder">
                  This form will be available soon
                </div>
              ) : (
                <span className="form-card-action">
                  Open Form <i className="ri-arrow-right-line"></i>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
