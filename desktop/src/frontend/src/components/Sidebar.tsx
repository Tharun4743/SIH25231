import { DocumentInfo } from "../types";
import { 
  MessageSquare, 
  FolderClosed, 
  History, 
  Settings as SettingsIcon, 
  Trash2, 
  Upload, 
  Database,
  CheckCircle2,
  HardDrive,
  X
} from "lucide-react";

interface SidebarProps {
  documents: DocumentInfo[];
  selectedTab: "chat" | "library" | "history" | "settings";
  onSelectTab: (tab: "chat" | "library" | "history" | "settings") => void;
  onDeleteDocument: (id: string) => void;
  onTriggerUpload: () => void;
  onNewChat: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  isConnected?: boolean;
  activeSessionId?: string;
  sessions?: any[];
  onSelectSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
}

export default function Sidebar({
  documents,
  selectedTab,
  onSelectTab,
  onDeleteDocument,
  onTriggerUpload,
  onNewChat,
  isOpen = true,
  onClose,
  isConnected = true,
  activeSessionId = "",
  sessions = [],
  onSelectSession,
  onDeleteSession,
}: SidebarProps) {
  // Calculate dynamic storage used
  const totalBytes = documents.reduce((acc, doc) => acc + doc.size, 0);
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0.00 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };
  const storageUsedStr = formatBytes(totalBytes);

  const getDocBadge = (name: string, type?: string) => {
    const ext = name.split(".").pop()?.toUpperCase() || "DOC";
    if (ext === "PDF") {
      return { label: "PDF", bg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" };
    }
    if (ext === "WAV" || ext === "MP3" || (type && type.startsWith("audio/"))) {
      return { label: "WAV", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
    }
    if (ext === "PNG" || ext === "JPG" || ext === "JPEG" || (type && type.startsWith("image/"))) {
      return { label: "IMG", bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" };
    }
    return { label: ext.slice(0, 3), bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
  };

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-40 w-72 bg-sidebar-bg border-r border-border-default flex flex-col text-text-secondary transform transition-transform duration-300 md:translate-x-0 md:static ${
        isOpen ? "translate-x-0" : "-translate-x-0"
      }`}
    >
      {/* Brand Header */}
      <div className="h-[70px] px-6 border-b border-border-default flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center relative shrink-0">
            <svg className="w-9 h-9" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="auraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <circle cx="16" cy="16" r="14" fill="url(#auraGrad)" className="opacity-20 animate-pulse" />
              <circle cx="16" cy="16" r="10" stroke="url(#auraGrad)" strokeWidth="1.5" strokeDasharray="3 2" className="animate-[spin_20s_linear_infinite]" />
              <path d="M16 8C11.58 8 8 11.58 8 16C8 19.5 10.5 22.5 14 23.5V19.5C12.5 18.8 11.5 17.5 11.5 16C11.5 13.5 13.5 11.5 16 11.5C18.5 11.5 20.5 13.5 20.5 16C20.5 17.5 19.5 18.8 18 19.5V23.5C21.5 22.5 24 19.5 24 16C24 11.58 20.42 8 16 8Z" fill="url(#auraGrad)" />
              <circle cx="16" cy="16" r="2.5" fill="#FFFFFF" className="shadow-md" />
            </svg>
          </div>
          <div>
            <h1 className="text-xs font-black text-text-primary tracking-wider font-display leading-tight">
              Aura - AI unified retrival assistant
            </h1>
            <p className="text-[10px] text-text-muted font-medium tracking-wide">
              Enterprise Workspace
            </p>
          </div>
        </div>
        
        {/* Mobile close trigger */}
        {onClose && (
          <button 
            type="button"
            onClick={onClose}
            className="md:hidden text-text-muted hover:text-text-primary p-1 hover:bg-card-bg rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Navigation Links */}
      <div className="p-4 select-none shrink-0">
        <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest px-3 mb-2">
          Navigation
        </h3>
        <button
          type="button"
          onClick={() => {
            onNewChat();
            onClose?.();
          }}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-border-default hover:border-primary/60 text-xs font-bold text-text-secondary hover:text-text-primary py-2 rounded-xl transition-all duration-200 mb-3 cursor-pointer bg-card-bg/25 active:scale-98"
        >
          <span className="text-primary-light text-base font-bold">+</span>
          <span>New Chat</span>
        </button>
        <nav className="space-y-1">
          <button
            onClick={() => {
              onSelectTab("chat");
              onClose?.();
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 group ${
              selectedTab === "chat"
                ? "text-white bg-primary shadow-md shadow-primary/15"
                : "text-text-secondary hover:bg-header-bg hover:text-text-primary"
            }`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className={`w-4 h-4 transition-transform group-hover:scale-110 duration-200 ${selectedTab === "chat" ? "text-white" : "text-text-muted"}`} />
              <span>Chat Workspace</span>
            </div>
            {selectedTab === "chat" && (
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            )}
          </button>

          <button
            onClick={() => {
              onSelectTab("library");
              onClose?.();
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 group ${
              selectedTab === "library"
                ? "text-white bg-primary shadow-md shadow-primary/15"
                : "text-text-secondary hover:bg-header-bg hover:text-text-primary"
            }`}
          >
            <div className="flex items-center gap-3">
              <FolderClosed className={`w-4 h-4 transition-transform group-hover:scale-110 duration-200 ${selectedTab === "library" ? "text-white" : "text-text-muted"}`} />
              <span>Document Library</span>
            </div>
            {selectedTab === "library" && (
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            )}
          </button>

          <button
            onClick={() => {
              onSelectTab("history");
              onClose?.();
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 group ${
              selectedTab === "history"
                ? "text-white bg-primary shadow-md shadow-primary/15"
                : "text-text-secondary hover:bg-header-bg hover:text-text-primary"
            }`}
          >
            <div className="flex items-center gap-3">
              <History className={`w-4 h-4 transition-transform group-hover:scale-110 duration-200 ${selectedTab === "history" ? "text-white" : "text-text-muted"}`} />
              <span>Audit & Logs</span>
            </div>
            {selectedTab === "history" && (
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            )}
          </button>

          <button
            onClick={() => {
              onSelectTab("settings");
              onClose?.();
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 group ${
              selectedTab === "settings"
                ? "text-white bg-primary shadow-md shadow-primary/15"
                : "text-text-secondary hover:bg-header-bg hover:text-text-primary"
            }`}
          >
            <div className="flex items-center gap-3">
              <SettingsIcon className={`w-4 h-4 transition-transform group-hover:scale-110 duration-200 ${selectedTab === "settings" ? "text-white" : "text-text-muted"}`} />
              <span>System Settings</span>
            </div>
            {selectedTab === "settings" && (
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            )}
          </button>
        </nav>
      </div>

      {/* Recent Chats Section */}
      <div className="px-4 py-2 select-none border-b border-border-default/40 pb-3">
        <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest px-3 mb-2 flex justify-between items-center">
          <span>Recent Chats ({sessions.length})</span>
        </h3>
        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
          {sessions.length === 0 ? (
            <p className="text-[10px] text-text-muted italic px-3 py-1">No past chats.</p>
          ) : (
            sessions.map((s: any) => {
              const isActive = activeSessionId === s.sessionId;
              return (
                <div
                  key={s.sessionId}
                  onClick={() => {
                    onSelectSession?.(s.sessionId);
                    onSelectTab("chat");
                    onClose?.();
                  }}
                  className={`group w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "text-white bg-primary/80 shadow-sm"
                      : "text-text-secondary hover:bg-header-bg/60 hover:text-text-primary"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : "text-text-muted"}`} />
                    <span className="truncate flex-1 select-none pr-1 text-left" title={s.title}>
                      {s.title || "Untitled Chat"}
                    </span>
                  </div>
                  
                  {/* Delete Session Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession?.(s.sessionId);
                    }}
                    className={`p-1 rounded hover:bg-black/15 transition-all text-text-muted hover:text-status-error opacity-0 group-hover:opacity-100 ${
                      isActive ? "text-white/80 hover:text-white" : ""
                    }`}
                    title="Delete conversation thread"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Indexed Files Scrolling Section */}
      <div className="flex-1 overflow-y-auto px-4 py-2 min-h-[120px]">
        <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest px-3 mb-2">
          Indexed Files ({documents.length})
        </h3>
        <div className="space-y-1.5">
          {documents.length === 0 ? (
            <div className="px-3 py-4 border border-dashed border-border-default rounded-xl text-center">
              <p className="text-[11px] text-text-muted italic">
                No indexed materials.
              </p>
            </div>
          ) : (
            documents.slice(0, 15).map((doc) => {
              const badge = getDocBadge(doc.name, doc.type);
              return (
                <div
                  key={doc.id}
                  className="group flex items-center justify-between p-2 rounded-lg bg-header-bg/40 hover:bg-header-bg border border-transparent hover:border-border-default transition-all duration-150"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`w-6 h-6 border ${badge.bg} flex items-center justify-center rounded-md text-[9px] font-bold shrink-0`}>
                      {badge.label}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-text-primary truncate font-semibold select-text" title={doc.name}>
                        {doc.name}
                      </p>
                      <p className="text-[9px] text-text-muted">
                        {doc.pageCount ? `${doc.pageCount}p` : "Asset"} • {(doc.size / 1024).toFixed(0)}KB
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteDocument(doc.id)}
                    className="text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1 shrink-0"
                    title="Deindex source document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
          {documents.length > 15 && (
            <p className="text-[10px] text-center text-text-muted italic pt-1">
              + {documents.length - 15} more in Document Library
            </p>
          )}
        </div>
      </div>

      {/* Upload button fixed in the lower section */}
      <div className="p-4 shrink-0 border-t border-border-default/50 bg-sidebar-bg/90 select-none">
        <button
          type="button"
          onClick={onTriggerUpload}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl text-xs font-bold transition-all duration-200 shadow-lg shadow-primary/25 active:scale-98"
        >
          <Upload className="w-4 h-4" />
          <span>Upload & Index</span>
        </button>
      </div>

      {/* Footer Sovereign/Capacities Metrics */}
      <div className="p-4 bg-app-bg border-t border-border-default shrink-0 select-none">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Database className="w-3 h-3 text-primary-light" /> System Port
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${
              isConnected 
                ? "bg-status-success animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                : "bg-status-error"
            }`}></span>
            <span className={`text-[9px] font-extrabold uppercase ${
              isConnected ? "text-status-success" : "text-status-error"
            }`}>{isConnected ? "ONLINE" : "OFFLINE"}</span>
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px] text-text-secondary mb-1">
          <span className="flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-text-muted" /> Local Space
          </span>
          <span className="font-semibold text-text-primary">{storageUsedStr}</span>
        </div>

        <div className="w-full bg-sidebar-bg h-1 rounded-full overflow-hidden">
          <div 
            className="bg-primary h-full transition-all duration-500 rounded-full" 
            style={{ width: `${Math.min(100, Math.max(8, (documents.length * 10)))}%` }}
          />
        </div>
      </div>
    </aside>
  );
}
