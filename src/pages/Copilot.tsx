import React, { useEffect, useState, useRef } from 'react';
import {
  Sparkles,
  ArrowUp,
  Paperclip,
  FolderInput,
  Globe,
  Lock,
  Plus,
  History,
  X,
  Trash2,
  ChevronDown,
  RotateCcw,
  Search,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Share2,
  FileText
} from 'lucide-react';
import { CopilotConversation, CopilotMessage } from '../types';
import { api } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { ClinicalMessageView } from '../components/ui/ClinicalMessageView';
import { ContextSourcesPanel } from '../components/copilot/ContextSourcesPanel';

export const Copilot: React.FC = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Core state
  const [conversations, setConversations] = useState<CopilotConversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string>('');
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isConfidential, setIsConfidential] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [lastUserQuery, setLastUserQuery] = useState('Hi');
  const [reasoningStepIndex, setReasoningStepIndex] = useState(0);

  // Optional drawer/modal toggles
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [searchHistoryQuery, setSearchHistoryQuery] = useState('');

  // Conversation state: false = hero landing state, true = active conversation state
  const [isChatActive, setIsChatActive] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (isChatActive) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversations, isChatActive, isSending]);

  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch {
      toast({ type: 'error', title: 'Failed to load conversations' });
    }
  };

  const activeConversation = activeConvoId
    ? conversations.find(c => c.id === activeConvoId)
    : null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    const trimmedText = text.trim();
    if (!trimmedText || isSending) return;

    setLastUserQuery(trimmedText);
    setInputMessage('');
    setIsSending(true);
    setIsChatActive(true);

    const userMsgPlaceholder: CopilotMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: trimmedText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    let targetConvoId = activeConvoId;
    try {
      if (!targetConvoId) {
        const newConvo = await api.createConversation(
          trimmedText.slice(0, 32) + (trimmedText.length > 32 ? '...' : '')
        );
        targetConvoId = newConvo.id;
        setActiveConvoId(newConvo.id);
        setConversations(prev => [{ ...newConvo, messages: [userMsgPlaceholder] }, ...prev]);
      } else {
        setConversations(prev =>
          prev.map(convo => convo.id === targetConvoId
            ? { ...convo, messages: [...convo.messages, userMsgPlaceholder] }
            : convo)
        );
      }

      await api.sendMessage(targetConvoId, trimmedText);
      const updatedList = await api.getConversations();
      setConversations(updatedList);
      setAttachedFiles([]);
    } catch (error) {
      setConversations(prev =>
        prev.map(convo => convo.id === targetConvoId
          ? { ...convo, messages: convo.messages.filter(message => message.id !== userMsgPlaceholder.id) }
          : convo)
      );
      setInputMessage(trimmedText);
      toast({
        type: 'error',
        title: 'Assistant is not connected',
        message: error instanceof Error ? error.message : 'No assistant response was generated.'
      });
    } finally {
      setIsSending(false);
    }
  };


  const handleAttachClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileAttached = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = '';
    toast({
      type: 'info',
      title: 'File upload is not connected',
      message: 'No file was uploaded or sent to an AI service. File storage and imaging ingestion are not implemented yet.'
    });
  };


  const handleImportPlan = () => {
    setIsContextPanelOpen(true);
    toast({ type: 'info', title: 'Sources panel opened', message: 'Live case files and document indexing are not connected yet.' });
  };

  const handleStartFresh = () => {
    setIsChatActive(false);
    setActiveConvoId('');
    setInputMessage('');
    setAttachedFiles([]);
  };

  const suggestionChips = [
    { label: 'Project architecture', prompt: 'Help me review the software architecture and backend tasks for ADRAB.' },
    { label: 'Explain a concept', prompt: 'Explain a maxillofacial imaging or software engineering concept at a general educational level.' },
    { label: 'Source organisation', prompt: 'Help me organise the project bibliography and source files for surgeon review.' },
    { label: 'Development help', prompt: 'Help me plan and debug a non-clinical software feature in this project.' },
  ];

  return (
    <div className="relative h-full min-h-[calc(100vh-2rem)] min-h-[calc(100dvh-2rem)] flex flex-col justify-between w-full select-none">
      {/* Hidden file input for Attach */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileAttached}
        className="hidden"
      />

      {/* TOP BAR CONTROLS - Positioned cleanly at top */}
      <div className={`w-full h-14 flex items-center justify-between shrink-0 py-2.5 px-4 sm:px-8 pl-16 md:pl-8 ${isChatActive ? 'border-b border-border-hairline bg-surface/30' : ''}`}>
        {/* Left: New Query button */}
        <div className="flex items-center gap-2.5">
          {isChatActive && (
            <button
              type="button"
              onClick={handleStartFresh}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-elevated border border-border-hairline text-xs text-secondary hover:text-primary transition-all hover-lift cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Query</span>
            </button>
          )}
        </div>

        {/* Right: Context & Sources sub-tab sidebar trigger + Threads drawer trigger */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={() => setIsContextPanelOpen(!isContextPanelOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill border text-xs transition-all hover-lift cursor-pointer ${
              isContextPanelOpen
                ? 'bg-[#8EC5E8]/20 border-[#8EC5E8] text-primary shadow-sm'
                : 'bg-elevated border-border-hairline text-secondary hover:text-primary'
            }`}
            title="Toggle Context & Sources sidebar"
            aria-label="Toggle Context & Sources sidebar"
          >
            <FileText className="w-3.5 h-3.5 text-[#8EC5E8]" />
            <span>Context & Sources</span>
          </button>

          <button
            type="button"
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-elevated border border-border-hairline text-xs text-secondary hover:text-primary transition-all hover-lift cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-muted" />
            <span>Threads ({conversations.length})</span>
          </button>
        </div>
      </div>

      {/* 1. INITIAL LANDING SCREEN (SADIE Design System: Eyebrow badge, Lora serif title, rounded card, chips) */}
      {!isChatActive ? (
        <div className="flex-1 flex flex-col items-center justify-center my-auto w-full max-w-4xl mx-auto py-8 px-4">
          {/* Eyebrow Pill Badge */}
          <div className="mb-7 flex justify-center animate-drop-down">
            <div className="inline-flex items-center gap-2.5 px-4.5 py-1.5 rounded-pill bg-elevated border border-border-hairline text-sm text-primary shadow-sm backdrop-blur-md">
              <span className="text-primary text-sm">✦</span>
              <span className="font-medium tracking-wide">Research & Project Copilot</span>
            </div>
          </div>

          {/* Hero Editorial Heading (Lora serif) */}
          <div className="text-center max-w-3xl mx-auto mb-9 animate-drop-down" style={{ animationDelay: '60ms' }}>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-primary leading-[1.25]">
              ADRAB Project Assistant
            </h1>
            <h2 className="font-serif text-lg sm:text-xl font-medium tracking-tight text-secondary mt-1.5 leading-[1.25]">
              Software development and research support
            </h2>
          </div>

            <p className="text-xs text-muted text-center max-w-2xl mt-4 leading-relaxed">
              Non-clinical prototype only. It does not access patient records, analyse scans, score healing, or provide treatment advice.
              Do not enter identifiable patient information. File upload and the live AI provider are not connected yet.
            </p>

          {/* Central Landing Input Card (SADIE Design System) */}
          <div className="w-full max-w-3xl lg:max-w-4xl bg-surface border border-border-hairline rounded-2xl p-5 sm:p-6 shadow-card transition-all duration-200 focus-within:ring-2 focus-within:ring-accent/40 animate-card-in" style={{ animationDelay: '120ms' }}>
            {/* Attached Files Pills (if any) */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-border-hairline">
                {attachedFiles.map((f, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-pill bg-elevated border border-border-hairline text-primary"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-muted" />
                    <span>{f}</span>
                    <button
                      onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}
                      className="hover:text-status-failed text-muted ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Text input area */}
            <textarea
              rows={2}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask about project development, source organisation, or general concepts..."
              className="w-full bg-transparent text-base sm:text-lg text-primary placeholder:text-muted focus:outline-none resize-none leading-relaxed min-h-[64px]"
            />

            {/* Bottom Row Inside Card */}
            <div className="mt-3.5 pt-3 flex items-center justify-between gap-3 border-t border-border-hairline">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleAttachClick}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-pill bg-elevated hover:bg-elevated-hover border border-border-hairline text-sm text-secondary hover:text-primary transition-all cursor-pointer"
                  title="Attach CT, DICOM, or X-ray file"
                >
                  <Paperclip className="w-4 h-4 text-secondary" />
                  <span>Attach</span>
                </button>

                <button
                  type="button"
                  onClick={handleImportPlan}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-pill bg-elevated hover:bg-elevated-hover border border-border-hairline text-sm text-secondary hover:text-primary transition-all cursor-pointer"
                  title="Import CAD/CAM surgical plan"
                >
                  <FolderInput className="w-4 h-4 text-secondary" />
                  <span>Import</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsConfidential(!isConfidential)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-pill text-sm text-secondary hover:text-primary transition-colors cursor-pointer"
                  title="Toggle privacy level"
                >
                  {isConfidential ? (
                    <>
                      <Lock className="w-4 h-4 text-status-completed" />
                      <span className="text-status-completed text-sm font-medium">HIPAA Locked</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4 text-muted" />
                      <span className="text-sm">Public</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() && attachedFiles.length === 0}
                  className="w-10 h-10 rounded-full bg-btn-primary-bg text-btn-primary-text hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 transition-all flex items-center justify-center shadow-md shrink-0 cursor-pointer"
                  aria-label="Send prompt"
                >
                  <ArrowUp className="w-5 h-5 text-btn-primary-text stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>

          {/* Suggestion Chips Row Below Card */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5 max-w-3xl lg:max-w-4xl mx-auto">
            {suggestionChips.map((chip, index) => (
              <button
                key={index}
                type="button"
                style={{ animationDelay: `${180 + index * 35}ms` }}
                onClick={() => handleSendMessage(chip.prompt)}
                className="px-4 py-2 rounded-pill bg-elevated hover:bg-elevated-hover border border-border-hairline text-sm text-secondary hover:text-primary transition-all hover-lift cursor-pointer font-medium animate-card-in"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* 2. ACTIVE CONVERSATION SCREEN:
              The landing heading, badge, and suggestion chips disappear!
              The full conversation stream expands into view, and the input card sits at the bottom. */
        <div className="flex-1 flex flex-col justify-between overflow-hidden py-3 max-w-5xl lg:max-w-6xl mx-auto w-full px-4 sm:px-8 animate-fade-up">
          {/* Scrollable Conversation Stream */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-7 custom-scrollbar pb-6">
            {activeConversation?.messages.map((msg) => (
              <ClinicalMessageView
                key={msg.id}
                message={msg}

              />
            ))}

            {isSending && (
              <div className="py-3 flex items-center gap-2.5 text-xs text-secondary" role="status" aria-live="polite">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                Sending message to the project assistant…
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom-Pinned Input Card (SADIE Design System) */}
          {/* Bottom-Pinned Input Card (SADIE Design System - Stretched & Zoomed) */}
          <div className="pt-3 shrink-0">
            <div className="w-full max-w-4xl lg:max-w-5xl mx-auto bg-surface border border-border-hairline rounded-2xl p-4 sm:p-5 shadow-card transition-all focus-within:ring-2 focus-within:ring-accent/40">
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5 pb-2.5 border-b border-border-hairline">
                  {attachedFiles.map((f, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-pill bg-elevated border border-border-hairline text-primary"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-muted" />
                      <span>{f}</span>
                      <button
                        onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}
                        className="hover:text-status-failed text-muted ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <textarea
                rows={2}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask follow-up question or inspect next parameter..."
                className="w-full bg-transparent text-base sm:text-lg text-primary placeholder:text-muted focus:outline-none resize-none leading-relaxed"
              />

              <div className="mt-3 pt-2.5 flex items-center justify-between gap-2 border-t border-border-hairline">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAttachClick}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill bg-elevated hover:bg-elevated-hover border border-border-hairline text-sm text-secondary hover:text-primary transition-all cursor-pointer"
                    title="Attach CT, DICOM, or X-ray file"
                  >
                    <Paperclip className="w-4 h-4 text-secondary" />
                    <span>Attach</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleImportPlan}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill bg-elevated hover:bg-elevated-hover border border-border-hairline text-sm text-secondary hover:text-primary transition-all cursor-pointer"
                    title="Import CAD/CAM surgical plan"
                  >
                    <FolderInput className="w-4 h-4 text-secondary" />
                    <span>Import</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsConfidential(!isConfidential)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-sm text-secondary hover:text-primary transition-colors cursor-pointer"
                  >
                    {isConfidential ? (
                      <>
                        <Lock className="w-4 h-4 text-status-completed" />
                        <span className="text-status-completed text-sm font-medium">HIPAA Locked</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-4 h-4 text-muted" />
                        <span className="text-sm">Public</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim() && attachedFiles.length === 0}
                    className="w-9 h-9 rounded-full bg-btn-primary-bg text-btn-primary-text hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 transition-all flex items-center justify-center shadow-md shrink-0 cursor-pointer"
                    aria-label="Send prompt"
                  >
                    <ArrowUp className="w-4.5 h-4.5 text-btn-primary-text stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SLIDE-OUT DRAWER FOR THREAD HISTORY & CONVERSATIONS (Smooth Animated Opening) */}
      <div
        className={`fixed inset-0 z-50 overflow-hidden transition-all duration-300 ${
          isHistoryOpen ? 'pointer-events-auto visible' : 'pointer-events-none invisible'
        }`}
      >
        {/* Backdrop Fade */}
        <div
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out ${
            isHistoryOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsHistoryOpen(false)}
        />
        <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 xs:pl-6 sm:pl-10 pointer-events-none">
          <div
            className={`w-full max-w-sm sm:max-w-md bg-surface border-l border-border-hairline p-6 shadow-2xl flex flex-col justify-between pointer-events-auto transition-transform duration-300 ease-out transform pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] ${
              isHistoryOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border-hairline">
                <h3 className="font-serif text-xl font-medium text-primary">
                  Thread History
                </h3>
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  aria-label="Close Thread History"
                  title="Close Thread History"
                  className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-elevated transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search */}
              <div className="relative my-4">
                <Search className="w-4 h-4 text-muted absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search past threads..."
                  value={searchHistoryQuery}
                  onChange={(e) => setSearchHistoryQuery(e.target.value)}
                  className="w-full bg-elevated border border-border-hairline rounded-pill pl-9 pr-4 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Thread Items */}
              <div className="space-y-2 max-h-[68vh] overflow-y-auto custom-scrollbar pr-1">
                {conversations
                  .filter(c => c.title.toLowerCase().includes(searchHistoryQuery.toLowerCase()))
                  .map(conv => (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveConvoId(conv.id);
                        setIsChatActive(true);
                        setIsHistoryOpen(false);
                      }}
                      className={`p-3.5 rounded-xl cursor-pointer transition-all flex items-start justify-between group ${
                        conv.id === activeConvoId ? 'bg-elevated border border-border-hairline shadow-sm' : 'hover:bg-elevated/50 border border-transparent'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-primary truncate">{conv.title}</p>
                        <p className="text-xs text-muted mt-1">{conv.createdAt}</p>
                      </div>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await api.deleteConversation(conv.id);
                          loadConversations();
                          toast({ type: 'info', title: 'Thread Deleted' });
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-muted hover:text-status-failed transition-opacity cursor-pointer rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                handleStartFresh();
                setIsHistoryOpen(false);
              }}
              className="w-full py-2.5 rounded-pill bg-btn-primary-bg text-btn-primary-text font-semibold text-sm hover:opacity-90 active:scale-98 transition-all text-center cursor-pointer shadow-md mt-4"
            >
              + Start Fresh Query
            </button>
          </div>
        </div>
      </div>

      {/* Context & Sources Sub-tab Sidebar Drawer */}
      <ContextSourcesPanel
        isOpen={isContextPanelOpen}
        onClose={() => setIsContextPanelOpen(false)}
        selectedCaseId={selectedCaseId}
        onSelectCase={(caseId) => setSelectedCaseId(caseId)}
        attachedFiles={attachedFiles}
        onAttachFile={(fileName) => setAttachedFiles((prev) => [...prev, fileName])}
        onDetachFile={(fileName) => setAttachedFiles((prev) => prev.filter((f) => f !== fileName))}
      />
    </div>
  );
};
