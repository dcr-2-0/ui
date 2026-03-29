import { useState, useRef } from 'react';
import type { ProofEntry, ProofType } from '../../data/types';
import './ProofPanel.css';

interface ProofPanelProps {
  itemId: string;
  itemName: string;
  proofs: ProofEntry[];
  isReadOnly: boolean;
  isUploading: boolean;
  onAddUrl: (url: string) => Promise<void>;
  onAddNote: (note: string) => Promise<void>;
  onAddFile: (file: File) => Promise<void>;
  onDelete: (proofId: string) => Promise<void>;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = 'image/*,application/pdf,text/plain';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function proofIcon(proof: ProofEntry): string {
  if (proof.type === 'url') return 'ri-links-line';
  if (proof.type === 'note') return 'ri-file-text-line';
  if (proof.fileMimeType?.startsWith('image/')) return 'ri-image-line';
  if (proof.fileMimeType === 'application/pdf') return 'ri-file-pdf-line';
  return 'ri-attachment-2-line';
}

interface ProofEntryRowProps {
  proof: ProofEntry;
  onDelete: (id: string) => Promise<void>;
  isReadOnly: boolean;
}

function ProofEntryRow({ proof, onDelete, isReadOnly }: ProofEntryRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(true);
    try {
      await onDelete(proof.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <li className="proof-entry-row">
      <i className={`proof-entry-icon ${proofIcon(proof)}`} />
      <div className="proof-entry-content">
        {proof.type === 'url' && proof.url && (
          <a
            href={proof.url}
            target="_blank"
            rel="noopener noreferrer"
            className="proof-entry-link"
            title={proof.url}
          >
            {proof.url}
          </a>
        )}
        {proof.type === 'note' && proof.note && (
          <div
            className={`proof-entry-note ${expanded ? 'expanded' : ''}`}
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? 'Click to collapse' : 'Click to expand'}
          >
            {proof.note}
          </div>
        )}
        {proof.type === 'file' && (
          <div className="proof-entry-file">
            {proof.fileUrl ? (
              <a
                href={proof.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="proof-entry-link"
              >
                {proof.fileName}
              </a>
            ) : (
              <span>{proof.fileName}</span>
            )}
            {proof.fileSizeBytes != null && (
              <span className="proof-entry-size">{formatBytes(proof.fileSizeBytes)}</span>
            )}
          </div>
        )}
      </div>
      {!isReadOnly && (
        <button
          className="proof-entry-delete"
          onClick={handleDelete}
          disabled={deleting}
          title="Remove attachment"
          aria-label="Remove attachment"
        >
          <i className={deleting ? 'ri-loader-4-line proof-spin' : 'ri-delete-bin-line'} />
        </button>
      )}
    </li>
  );
}

export function ProofPanel({
  itemName,
  proofs,
  isReadOnly,
  isUploading,
  onAddUrl,
  onAddNote,
  onAddFile,
  onDelete,
}: ProofPanelProps) {
  const [activeTab, setActiveTab] = useState<ProofType>('url');
  const [urlInput, setUrlInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddUrl = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      setInputError('Please enter a valid URL (must start with https:// or http://)');
      return;
    }
    setInputError(null);
    setIsAdding(true);
    try {
      await onAddUrl(trimmed);
      setUrlInput('');
    } catch {
      setInputError('Failed to save URL. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddNote = async () => {
    const trimmed = noteInput.trim();
    if (!trimmed) return;
    setInputError(null);
    setIsAdding(true);
    try {
      await onAddNote(trimmed);
      setNoteInput('');
    } catch {
      setInputError('Failed to save note. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setInputError('File too large. Maximum size is 5 MB.');
      return;
    }
    setInputError(null);
    try {
      await onAddFile(file);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to upload file.';
      setInputError(msg);
    }
  };

  return (
    <div className="proof-panel" onClick={(e) => e.stopPropagation()}>
      <div className="proof-panel-header">
        <span className="proof-panel-title">
          <i className="ri-attachment-2-line" />
          Attachments
        </span>
        <span className="proof-panel-item-name">{itemName}</span>
        {isReadOnly && (
          <span className="proof-panel-readonly-badge">
            <i className="ri-lock-line" /> Locked
          </span>
        )}
      </div>

      {proofs.length > 0 ? (
        <ul className="proof-list">
          {proofs.map((proof) => (
            <ProofEntryRow
              key={proof.id}
              proof={proof}
              onDelete={onDelete}
              isReadOnly={isReadOnly}
            />
          ))}
        </ul>
      ) : (
        <p className="proof-empty">
          {isReadOnly ? 'No attachments.' : 'No attachments yet. Add a link, write a note, or upload a file.'}
        </p>
      )}

      {!isReadOnly && (
        <div className="proof-add-section">
          <div className="proof-tabs" role="tablist">
            <button
              role="tab"
              className={activeTab === 'url' ? 'active' : ''}
              onClick={() => { setActiveTab('url'); setInputError(null); }}
            >
              <i className="ri-links-line" />
              Add Link
            </button>
            <button
              role="tab"
              className={activeTab === 'note' ? 'active' : ''}
              onClick={() => { setActiveTab('note'); setInputError(null); }}
            >
              <i className="ri-file-text-line" />
              Write Note
            </button>
            <button
              role="tab"
              className={activeTab === 'file' ? 'active' : ''}
              onClick={() => { setActiveTab('file'); setInputError(null); }}
            >
              <i className="ri-upload-cloud-line" />
              Upload File
            </button>
          </div>

          <div className="proof-form">
            {activeTab === 'url' && (
              <div className="proof-form-row">
                <input
                  type="url"
                  className="proof-input"
                  placeholder="https://credly.com/badges/..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                  disabled={isAdding}
                />
                <button
                  className="proof-add-btn"
                  onClick={handleAddUrl}
                  disabled={isAdding || !urlInput.trim()}
                >
                  {isAdding
                    ? <><i className="ri-loader-4-line proof-spin" /> Saving…</>
                    : <><i className="ri-check-line" /> Add Link</>}
                </button>
              </div>
            )}

            {activeTab === 'note' && (
              <div className="proof-form-col">
                <textarea
                  className="proof-textarea"
                  placeholder="Describe your completion, e.g. 'Finished Q1 billable hours, see timesheet...'"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  disabled={isAdding}
                />
                <div className="proof-form-row proof-form-row-end">
                  <span className="proof-char-count">{noteInput.length}/1000</span>
                  <button
                    className="proof-add-btn"
                    onClick={handleAddNote}
                    disabled={isAdding || !noteInput.trim()}
                  >
                    {isAdding
                      ? <><i className="ri-loader-4-line proof-spin" /> Saving…</>
                      : <><i className="ri-check-line" /> Save Note</>}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'file' && (
              <div className="proof-file-area">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  aria-hidden="true"
                />
                <button
                  className="proof-file-pick-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <i className={isUploading ? 'ri-loader-4-line proof-spin' : 'ri-upload-cloud-2-line'} />
                  {isUploading ? 'Uploading…' : 'Choose File to Upload'}
                </button>
                <p className="proof-file-hint">Images, PDFs, or text files · max 5 MB</p>
              </div>
            )}

            {inputError && (
              <p className="proof-input-error">
                <i className="ri-error-warning-line" /> {inputError}
              </p>
            )}
          </div>
        </div>
      )}

      {isReadOnly && (
        <p className="proof-locked-note">
          <i className="ri-lock-line" /> Attachments are locked while your plan is pending review.
        </p>
      )}
    </div>
  );
}
