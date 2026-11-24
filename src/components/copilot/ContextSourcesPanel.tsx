import React from 'react';
import { FileText, X, BookOpen, ExternalLink, ShieldAlert } from 'lucide-react';

export interface DossierFile {
  id: string;
  name: string;
  category: string;
  size: string;
  previewContent: string;
}

export interface EvidenceItem {
  id: string;
  title: string;
  status: string;
  description: string;
  tag: string;
}

interface ContextSourcesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCaseId: string;
  onSelectCase: (caseId: string) => void;
  attachedFiles: string[];
  onAttachFile: (fileName: string) => void;
  onDetachFile: (fileName: string) => void;
  isExtended?: boolean;
  onToggleExtended?: () => void;
}

export const ContextSourcesPanel: React.FC<ContextSourcesPanelProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <>
      <aside
        aria-label="Context and sources sidebar"
        className="fixed top-0 right-0 h-full w-full sm:w-[380px] bg-surface border-l border-border-hairline shadow-2xl z-40 flex flex-col"
      >
        <div className="h-14 px-4 flex items-center justify-between border-b border-border-hairline shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent" />
            <h2 className="font-serif text-sm font-semibold text-primary tracking-wide">Context & Sources</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-elevated transition-colors cursor-pointer"
            aria-label="Close Context & Sources"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-primary">Live data is not connected</p>
              <p className="text-xs text-secondary leading-relaxed">
                No patient records, imaging, operative notes, pathology reports, or uploaded source files are connected to this panel.
                Nothing here should be interpreted as a real patient record or verified clinical evidence.
              </p>
            </div>
          </div>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Project source library</h3>
            <p className="text-sm text-secondary leading-relaxed">
              The project repository has a source index and evidence summaries. Original book and article PDFs are not currently present in the repository's Books folder.
            </p>
            <a
              href="https://github.com/sadiyasyed28/sadie1/tree/main/references/Books"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
            >
              <BookOpen className="w-4 h-4" />
              Open surgeon source folder
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </section>

          <section className="border-t border-border-hairline pt-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Not enabled yet</h3>
            <ul className="text-sm text-secondary leading-relaxed list-disc pl-5 space-y-1.5">
              <li>Authenticated case record storage</li>
              <li>Secure document and imaging upload</li>
              <li>Source indexing and retrieval</li>
              <li>AI access to uploaded documents</li>
            </ul>
          </section>
        </div>
      </aside>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close context panel"
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 cursor-default"
      />
    </>
  );
};
