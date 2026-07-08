# Certification Catalog Data Audit

**Audited:** July 5, 2026 · against live official sources (AWS, Microsoft Learn, Google Cloud, CNCF/Linux Foundation, HashiCorp, Pearson VUE, FinOps Foundation, Octopus/Codefresh, CompTIA, Scrum.org)
**Scope:** all 50 items in `src/data/catalog/tech.ts`
**Note on Israeli pricing:** AWS, Google, Linux Foundation, HashiCorp, FinOps, Scrum.org and CompTIA charge flat global USD (Israeli VAT ~18% may be added at checkout). **Microsoft is the exception — Israel has its own (much lower) price tier.**

---

## 🔴 Critical — certs that no longer exist or are about to retire

| Cert | Finding | Action |
|---|---|---|
| **AWS Machine Learning – Specialty (MLS-C01)** | **RETIRED March 31, 2026.** No longer bookable. AWS points to AIF-C01 / MLA-C01 / AIP-C01 instead | Remove from catalog (existing holders keep validity) |
| **Microsoft Azure Data Scientist (DP-100)** | **RETIRED June 1, 2026.** Page says "This certification and the renewal assessment are retired." Successor: new MLOps Engineer Associate (AI-300) path | Remove or replace |
| **Azure Developer Associate (AZ-204)** | **Retires July 31, 2026** — 26 days away | Flag in catalog / plan removal |
| **AWS Advanced Networking – Specialty (ANS-C01)** | **Retires August 25, 2026** — last day to take it | Flag / plan removal |
| **Azure Security Engineer (AZ-500)** | **Retires August 31, 2026** | Flag / plan removal |

## 🔴 Critical — wrong prices

| Cert | Catalog | Correct | Source |
|---|---|---|---|
| **All 7 Azure exams (Israel!)** | $165 | **Israel: $83** (role-based), **$50** (AZ-900). US prices are $165/$99 | Microsoft official country price list (aka.ms/certificationExamPrice) |
| **CKA** | $395 | **$445** (includes 1 free retake) | cncf.io/training/certification/cka |
| **CKS** | $395 | **$445** | cncf.io/training/certification/cks |
| **Claude Certified Architect – Foundations** | $99 | **$125** (moved to Pearson VUE ~June 30, 2026) | Official Anthropic exam guide via Pearson VUE |
| **GitOps Fundamentals / at Scale / Enterprise (Codefresh)** | $0 each | **$49.95 each / $115 bundle** — no longer free; rebranded **Octopus Deploy** GitOps certs (learning.octopus.com) | learning.octopus.com |
| **FinOps Certified Practitioner** | $300 | **$325 exam-only / $500 with self-paced course** | learn.finops.org |
| **FinOps Certified Engineer** | $699 | **$325 exam-only / $500 course+exam bundle** | learn.finops.org |
| **FinOps Certified Professional** | $1,999 | **$500** (restructured Jan 2026: self-paced path; instructor-led format gone). Bundles $1,100–$2,495 | learn.finops.org bundle page |
| CompTIA Network+ | $358 | **$369** US list (no separate Israel price; USD applies) | 2026 pricing sources (official store JS-gated) |
| Terraform / Vault Associate | $70 | **$70.50** + local taxes | developer.hashicorp.com |
| GitLab CI/CD Associate | *(missing)* | **~$99** (medium confidence — official page JS-only) | third-party 2026 sources |

## 🟠 Wrong exam codes / versions

| Cert | Catalog | Correct |
|---|---|---|
| AWS CloudOps Engineer – Associate | COE-C01 | **SOA-C03** (SysOps successor, live Sept 30, 2025). Also: **no exam labs** — 65 MC/MR questions only |
| AWS Security – Specialty | SCS-C02 | **SCS-C03** (since Dec 2, 2025; same specs otherwise) |
| Vault Associate | VA-002 | **Vault Associate (003)** (tests Vault 1.16) |
| Terraform Associate | TA-004 | Official naming is **"Terraform Associate (004)"** — no "TA-" prefix (minor) |
| GitHub (all 5) | GHF/GHC/GHAS/GHAC/GHAD | **GH-900 / GH-300 / GH-500 / GH-200 / GH-100** — GitHub certs moved to **Microsoft Learn / Pearson VUE** June 25, 2025. Old learn.github.com/certification URLs are stale |
| Claude CCA-F | CCA-F | Pearson lists it as **CCAR-F** (unsettled; Anthropic guide prints no code). Registration URL in catalog is dead → now via Anthropic Partner Academy / Pearson VUE |

## 🟠 GitHub certifications — whole block outdated (PSI-era data)

All five entries need the same corrections (source: Microsoft Learn exam pages):

- **Duration:** 120 min → **100 minutes**
- **Questions:** 75 → not published (Microsoft: typically 40–60)
- **Passing score:** 70% → not published (Microsoft scaled scoring, 700/1000)
- **Proctored:** catalog says No → **Yes** (online or Pearson VUE test center)
- **Retake:** "Immediate" → **24 h after 1st fail, 14 days between subsequent, max 5/year, paid each time**
- Price $99 US ✓ (region-dependent at checkout); validity 2 years ✓ for certs earned after July 1, 2025. Foundations is **free for verified students** (Student Developer Pack)

## 🟠 Wrong durations / question counts

| Cert | Catalog | Correct |
|---|---|---|
| AWS SA – Professional (SAP-C02) | 170 min | **180 min** |
| AWS DevOps – Professional (DOP-C02) | 170 min | **180 min** |
| AWS GenAI Developer – Pro (AIP-C01) | 204 min, 85 q | **180 min, 75 q** (204/85 was the beta exam) |
| All 8 GCP exams | 50 questions | **50–60** (Data Engineer: **40–50**) |
| All 7 Azure exams | 40 questions | **40–60 (varies)** — Microsoft doesn't publish per-exam counts |
| Vault Associate | 57 questions | Not published — remove the count |

## 🟠 Proctoring wrong

| Cert | Catalog | Correct |
|---|---|---|
| FinOps Practitioner / Engineer / Professional | Proctored | **Not proctored** — official: "You are not proctored while taking the exam" |
| GitHub (all 5) | Not proctored | **Proctored** (Pearson VUE) |
| GitLab CI/CD Associate | Proctored | **Not proctored** (no official proctoring; async human-graded lab) |

## 🟠 Wrong retake policies

| Cert | Catalog | Correct |
|---|---|---|
| Vault Associate | "2-week wait; 2 attempts/year" | **7 days between attempts, max 4 per year** |
| FinOps (all) | "24-hour wait" | **3 attempts included, within 12 months of purchase** |
| PSM I | "Immediate retake allowed" | **No free retake** — each attempt costs $200 (free 2nd attempt only via official instructor-led class, within 14 days) |
| GitHub (all) | "Immediate retake allowed" | Microsoft policy: 24 h / 14 days / max 5 per year |
| Google (all) | "14-day waiting period" | Incomplete: **14 days → 60 days → 365 days ladder, max 4 attempts per 2 years** |
| Claude CCA-F | "6 months until next try" | **14 days / 30 days / 90 days ladder, max 4 per rolling 12 months** |
| Terraform Professional | "Free retake included" ✓ | Caveat: must request within 3 months of fail; 7-day wait; max 4/yr |
| GitLab | "Unlimited retakes" | Unlimited, but **retake fees may apply** (free retakes not documented) |

## 🟡 Validity corrections

| Cert | Catalog | Correct |
|---|---|---|
| **CKA / CKS** | 3 years | **2 years** (certs earned on/after Apr 1, 2024) |
| Claude CCA-F | *(missing)* | **12 months** |
| PCA (Prometheus) | 2 years ✓ | Confirmed OK |

## 🟡 Passing scores that should say "not disclosed"

- **All 8 GCP exams** — "~70%" is a community guess; Google explicitly doesn't publish scores
- **Terraform / Vault Associate** — HashiCorp: "we do not share… our scoring threshold"
- **GitHub (all)** — not published under Microsoft delivery

## 🟡 Other findings

- **FinOps Professional prerequisites changed:** enroll = FOCP *or* FOCE + 6 months experience; to sit the exam you also need active FOCUS Analyst, AI Value, and Technology Value certs + a "Professional Contribution". Catalog's "FOCP required" is outdated, and "FOCF" isn't an official abbreviation.
- **Codefresh → Octopus Deploy:** provider name, URLs (learning.codefresh.io → learning.octopus.com), and branding all changed; exam internals (70% pass, retakes) now unverifiable behind login.
- **Cast AI APA Hero:** exists, but it's **3 Academy courses** (catalog description implies more); "free / no expiry / unlimited retakes" is plausible but unverifiable publicly.
- **AZ-305 / AZ-400 prerequisites:** ✓ verified correct (note AZ-204 path for AZ-400 dies July 31, 2026).
- **MLA-C01:** question types also include ordering / matching / case studies (minor).
- **Azure retake policy wording in catalog:** ✓ correct.
- **AWS pricing tiers** ($100 / $150 / $300), 14-day retake, 3-year validity: ✓ all confirmed current.
- **PSM I price:** ✓ still $200 (PSM II is the $250 one).
- From **July 2026** Google allows renewing ACE/PCA/PDE via Skills courses instead of re-examining (nice-to-know for the renewal widget).

## ✅ Fully correct entries (no changes needed)

AWS Cloud Practitioner (CLF-C02) · AWS AI Practitioner (AIF-C01) · AWS Developer Associate (DVA-C02) · AWS Solutions Architect Associate (SAA-C03) · AWS Data Engineer Associate (DEA-C01) · Prometheus PCA · Terraform Professional (specs) · GCP prices/durations/validity across all 8 · CompTIA N10-009 specs & retake policy · PSM I specs

---

### Suggested priorities

1. **Remove/replace retired:** MLS-C01, DP-100 (and decide on soon-retiring ANS-C01, AZ-204, AZ-500 — maybe a "retiring soon" note in the modal).
2. **Fix the money:** Azure Israel prices ($83/$50), CKA/CKS $445, FinOps restructure, Codefresh→Octopus $49.95, CCA-F $125.
3. **Fix codes:** SOA-C03, SCS-C03, Vault 003, GitHub GH-xxx + URLs.
4. **Sweep the "not published" fields:** GCP/HashiCorp/GitHub passing scores and question counts → "Not disclosed".
5. **Retake policy sweep** per table above.
