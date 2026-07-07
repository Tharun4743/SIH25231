import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import LibraryView from "./components/LibraryView";
import HistoryView from "./components/HistoryView";
import SettingsView from "./components/SettingsView";
import FileUploader from "./components/FileUploader";
import AudioRecorder from "./components/AudioRecorder";
import { DocumentInfo, ChatMessage, SourceCitation } from "./types";
import { fetchDocuments, deleteDocument, fetchSessions, fetchSessionChats, deleteSession } from "./services/api";
import { useWebSocket } from "./hooks/useWebSocket";
import { 
  Paperclip, 
  Send, 
  Search, 
  User, 
  X, 
  AlertCircle,
  Info,
  Menu,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Sun,
  Moon
} from "lucide-react";

interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
}

export default function App() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [selectedTab, setSelectedTab] = useState<"chat" | "library" | "history" | "settings">(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "chat" || hash === "library" || hash === "history" || hash === "settings") {
      return hash;
    }
    return "chat";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [modelName, setModelName] = useState("llama3");
  
  // Chat & WebSocket State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => `session-${Date.now()}`);
  
  // Toasts state (multi-toast stack)
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Dark/light mode state
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("aura-theme");
    return saved !== "light"; // default to dark
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // W-09 FIX: Debounced refresh refs — prevents rapid successive API calls
  // after sequential chat completions.
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedRefresh = () => {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = setTimeout(() => {
      loadNotifications();
      loadSessions();
    }, 1000);
  };

  // Fetch index library on load
  // W-10 FIX: Removed duplicate useEffect for loadSettings.
  // Previously loadSettings() was called in two separate useEffect(()=>,[]) blocks.
  useEffect(() => {
    loadLibrary();
    loadSessions();
    loadNotifications();
    loadSettings();
    addToast("info", "Aura Sandbox Initialized", "Secure on-premises RAG gateway opened on standard port layers.");

    // Sync tab when hash changes (e.g. browser back/forward buttons)
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "chat" || hash === "library" || hash === "history" || hash === "settings") {
        setSelectedTab(hash);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, []);

  // Update hash when tab state changes
  useEffect(() => {
    window.location.hash = selectedTab;
  }, [selectedTab]);

  // Apply theme class to html element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
    }
    localStorage.setItem("aura-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.model_name) setModelName(data.model_name);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const loadLibrary = async () => {
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (err: any) {
      console.error(err);
      addToast("error", "Database Sync Failure", "Failed to fetch active indexed document layers from Aura core.");
    }
  };

  const loadSessions = async () => {
    try {
      const data = await fetchSessions();
      setSessions(data);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        const logs = await res.json();
        setNotifications(logs.slice(0, 3));
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  const addToast = (type: Toast["type"], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts((prev) => {
      if (prev.some((t) => t.title === title && t.message === message)) {
        return prev;
      }
      return [...prev, { id, type, title, message }];
    });
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // WebSocket hook integration
  const { sendMessage, isConnected } = useWebSocket({
    onToken: (token: string) => {
      setIsStreaming(true);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "assistant" && !last.sources) {
          // Append token to the active streaming assistant message
          return [
            ...prev.slice(0, prev.length - 1),
            { ...last, text: last.text + token },
          ];
        } else {
          // Initialize a fresh assistant message bubble
          return [
            ...prev,
            {
              id: `msg-assistant-${Date.now()}`,
              role: "assistant",
              text: token,
              timestamp: new Date().toLocaleTimeString(),
            },
          ];
        }
      });
    },
    onDone: (sources: SourceCitation[]) => {
      setIsStreaming(false);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "assistant") {
          return [
            ...prev.slice(0, prev.length - 1),
            { ...last, sources },
          ];
        }
        return prev;
      });
      addToast("success", "Retrieval Synthesized", "Response compiled with grounded semantic citation nodes.");
      // W-09 FIX: Debounced refresh — avoids 2 redundant API calls after every
      // single chat completion; batches rapid successive completions into one refresh.
      debouncedRefresh();
    },
    onError: (errorMsg: string) => {
      setIsStreaming(false);
      addToast("error", "Synthesis Interrupted", errorMsg);
    }
  });
 
  // Action: Deindex Document
  const handleDeleteDocument = async (id: string) => {
    try {
      const targetDoc = documents.find(d => d.id === id);
      const name = targetDoc ? targetDoc.name : "Source";
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      addToast("success", "Source Deindexed", `"${name}" chunks successfully removed from vector repositories.`);
      loadNotifications();
    } catch (err: any) {
      console.error(err);
      addToast("error", "Deindexation Aborted", "Could not remove requested document chunk indexes.");
    }
  };
 
  // Action: File indexing complete — smart redirection
  const handleUploadSuccess = (filename: string, type: string) => {
    loadLibrary();
    setIsUploadOpen(false);
    
    if (type === "image") {
      setSelectedTab("library");
      addToast("success", "Visual Asset Active", `"${filename}" was indexed. Try searching for it in the CLIP Visual Explorer below.`);
    } else {
      setSelectedTab("chat");
      // Auto-insert system status notification message
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          role: "assistant",
          text: `Successfully parsed and indexed "${filename}" into local vector cache. Sliding window chunk indexes are now active & searchable!`,
          timestamp: new Date().toLocaleTimeString(),
        }
      ]);
      addToast("success", "Document Fully Indexed", `"${filename}" was chunked & mapped onto vector registers successfully.`);
    }
    loadNotifications();
  };
   // Action: Transcribe callback — auto-send voice query to chat
  const handleAudioTranscribed = (transcript: string) => {
    const trimmed = transcript.trim();
    if (!trimmed) return;
    setInputVal(trimmed);
    addToast("success", "Voice Query Captured", "Sending voice query to Aura now...");
    // Give React one tick to apply the state, then fire send
    setTimeout(() => {
      if (!isStreaming) {
        const userMsg: ChatMessage = {
          id: `msg-user-${Date.now()}`,
          role: "user",
          text: trimmed,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, userMsg]);
        setIsStreaming(true);
        setInputVal("");
        sendMessage(trimmed, activeSessionId);
      }
    }, 80);
  };
 
  // Action: Send Query message
  const handleSend = () => {
    if (!inputVal.trim()) return;
    if (isStreaming) {
      addToast("warning", "Aura Core Busy", "Aura is currently processing a retrieval. Please wait...");
      return;
    }
 
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: "user",
      text: inputVal.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };
 
    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
 
    // Direct to WebSocket query emitter
    sendMessage(userMsg.text, activeSessionId);
  };
 
  // Action: Start a new conversation (Generate a new session ID and clear UI)
  const handleNewChat = () => {
    const newSessionId = `session-${Date.now()}`;
    setActiveSessionId(newSessionId);
    setMessages([]);
    setSelectedTab("chat");
    addToast("success", "New Chat Initialized", "Clean workspace created. Ready for fresh queries.");
  };

  const handleSelectSession = async (sessionId: string) => {
    try {
      setActiveSessionId(sessionId);
      const data = await fetchSessionChats(sessionId);
      setMessages(data);
      addToast("success", "Conversation Loaded", "Resumed past chat session thread.");
    } catch (err) {
      console.error("Failed to load session chats:", err);
      addToast("error", "Failed to Load", "Could not load selected chat session.");
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      addToast("success", "Session Deleted", "Conversation thread removed from local registry.");
      loadSessions();
      if (activeSessionId === sessionId) {
        handleNewChat();
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
      addToast("error", "Failed to Delete", "Could not delete chat session.");
    }
  };

  // Dynamic textarea height resizing
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputVal(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  // Enter to submit handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Breadcrumb calculator
  const getBreadcrumb = () => {
    switch (selectedTab) {
      case "chat":
        return "Chat Workspace";
      case "library":
        return "Document Library";
      case "history":
        return "Audit & Logs";
      case "settings":
        return "System Settings";
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    setIsNotificationOpen(false);
    addToast("info", "Inboxes Cleared", "System notifications marked as read.");
  };

  const handleNotificationClick = (n: any) => {
    setIsNotificationOpen(false);
    const eventName = (n.event || "").toLowerCase();
    if (eventName.includes("index") || eventName.includes("upload") || eventName.includes("deindex") || eventName.includes("file") || eventName.includes("image")) {
      setSelectedTab("library");
    } else if (eventName.includes("setting")) {
      setSelectedTab("settings");
    } else {
      setSelectedTab("history");
    }
  };

  return (
    <div className="flex w-full h-screen overflow-hidden bg-app-bg font-sans text-text-primary select-none">
      
      {/* Mobile Drawer Backdrop */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-app-bg/70 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* Left Navigation Sidebar */}
      <Sidebar
        documents={documents}
        selectedTab={selectedTab}
        onSelectTab={(tab) => setSelectedTab(tab)}
        onDeleteDocument={handleDeleteDocument}
        onTriggerUpload={() => setIsUploadOpen(true)}
        onNewChat={handleNewChat}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isConnected={isConnected}
        activeSessionId={activeSessionId}
        sessions={sessions}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
      />

      {/* Right Content Stream panel */}
      <main className="flex-1 flex flex-col h-screen relative bg-app-bg min-w-0">
        
        {/* Top Sticky Header Row (70px height limit) */}
        <header className="h-[70px] border-b border-border-default bg-header-bg/90 backdrop-blur-md flex justify-between items-center px-6 shrink-0 select-none z-10 sticky top-0">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger menu */}
            <button 
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-text-secondary hover:text-text-primary p-1 hover:bg-card-bg rounded-lg shrink-0"
              title="Toggle sidebar navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
 
            {/* Breadcrumb path */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-bold tracking-widest">
                <span>Aura — AI Unified Retrieval Assistant</span>
                <span>/</span>
                <span className="text-primary-light">{getBreadcrumb()}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-bold text-text-primary tracking-tight uppercase">
                  {modelName} Model
                </span>
                <span className={`px-1.5 py-0.5 border text-[9px] font-black rounded uppercase tracking-wider ${
                  isConnected 
                    ? "bg-status-success-bg/25 text-status-success border-status-success-border/30 animate-pulse" 
                    : "bg-status-error-bg/25 text-status-error border-status-error-border/30"
                }`}>
                  {isConnected ? "Active" : "Offline"}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3.5">
            {/* Header Search Input */}
            <div className="relative hidden md:block w-56 select-text">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search index database..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onClick={() => setSelectedTab("library")}
                className="w-full pl-8 pr-12 py-1.5 bg-card-bg/60 border border-border-default rounded-lg text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer text-text-secondary hover:bg-card-bg transition-all"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-text-muted bg-app-bg px-1.5 py-0.5 rounded border border-border-default">
                ⌘K
              </span>
            </div>
 
            {/* Notification bell block */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="w-9 h-9 rounded-xl border border-border-default flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-card-bg transition-all relative"
                title="System notifications"
              >
                <Bell className="w-4 h-4" />
                            {/* Notification badge dot */}
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(245,166,35,0.7)]" />
                )}
              </button>
 
              {/* Stacked Dropdown for notifications */}
              {isNotificationOpen && (
                <div className="absolute right-0 top-full mt-4 w-72 md:w-80 bg-card-bg border border-border-default rounded-xl shadow-2xl p-4 z-50 flex flex-col gap-3 text-left animate-fade-in">
                  <div className="flex justify-between items-center pb-2 border-b border-border-default/60 select-none">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">System Broadcasts</span>
                    <button 
                      onClick={clearNotifications}
                      className="text-[9px] text-primary-light font-bold hover:text-accent hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  {notifications.length > 0 ? (
                    <div className="space-y-1.5 font-sans text-xs max-h-56 overflow-y-auto pr-1">
                      {notifications.map((n: any) => {
                        const isErr = n.status === "Error";
                        const isWarn = n.status === "Warning";
                        return (
                          <div 
                            key={n.id} 
                            onClick={() => handleNotificationClick(n)}
                            className="flex gap-2.5 items-start border-b border-border-default/20 pb-2.5 last:border-0 last:pb-0 cursor-pointer hover:bg-panel-bg/30 p-2 -mx-1.5 rounded-lg transition-all"
                            title="Click to redirect to this event view"
                          >
                            {isErr ? (
                              <AlertCircle className="w-4 h-4 text-status-error shrink-0 mt-0.5" />
                            ) : isWarn ? (
                              <AlertTriangle className="w-4 h-4 text-status-warning shrink-0 mt-0.5" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-text-primary truncate">{n.event}</p>
                              <p className="text-[10px] text-text-secondary leading-normal mt-0.5">{n.description}</p>
                              <p className="text-[8px] text-text-muted mt-1 font-mono">{n.timestamp}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted italic py-4 text-center">No unread notifications</p>
                  )}
                </div>
              )}
            </div>
 
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={() => setIsDark(d => !d)}
              className="w-9 h-9 rounded-xl border border-border-default flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-card-bg transition-all"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Profile badge */}
            <div 
              onClick={() => setSelectedTab("settings")}
              className="w-9 h-9 rounded-xl border border-border-default flex items-center justify-center bg-card-bg text-text-secondary hover:text-text-primary hover:bg-panel-bg transition-all cursor-pointer font-bold text-xs" 
              title="Workspace Administrator"
            >
              <User className="w-4 h-4 text-text-muted" />
            </div>
          </div>
        </header>

        {/* Dynamic Center Panel Rendering based on active tab */}
        <div className="flex-1 min-h-0 flex flex-col relative">
          {selectedTab === "chat" && (
            <ChatWindow messages={messages} isStreaming={isStreaming} />
          )}

          {selectedTab === "library" && (
            <LibraryView
              documents={documents}
              onDeleteDocument={handleDeleteDocument}
              onTriggerUpload={() => setIsUploadOpen(true)}
              onError={(msg) => addToast("error", "Library Warning", msg)}
            />
          )}

          {selectedTab === "history" && (
            <HistoryView documents={documents} />
          )}

          {selectedTab === "settings" && (
            <SettingsView />
          )}
        </div>

        {/* Global Floating Stackable Toasts */}
        <div className="fixed top-6 right-6 max-w-sm w-full z-50 flex flex-col gap-2 pointer-events-none select-text">
          {toasts.map((toast) => {
            const isErr = toast.type === "error";
            const isWarn = toast.type === "warning";
            const isSucc = toast.type === "success";
            
            let icon = <Info className="w-4 h-4 text-primary-light" />;
            let borderClass = "border-status-info-border/40 bg-card-bg/95 backdrop-blur-md shadow-2xl";
            if (isErr) {
              icon = <AlertCircle className="w-4 h-4 text-status-error" />;
              borderClass = "border-status-error-border/40 bg-card-bg/95 backdrop-blur-md shadow-2xl";
            } else if (isWarn) {
              icon = <AlertTriangle className="w-4 h-4 text-status-warning" />;
              borderClass = "border-status-warning-border/40 bg-card-bg/95 backdrop-blur-md shadow-2xl";
            } else if (isSucc) {
              icon = <CheckCircle2 className="w-4 h-4 text-status-success animate-bounce" />;
              borderClass = "border-status-success-border/40 bg-card-bg/95 backdrop-blur-md shadow-2xl";
            }

            return (
              <div 
                key={toast.id}
                className={`p-4 border rounded-xl flex items-start gap-3 pointer-events-auto transition-all duration-300 animate-fade-in ${borderClass}`}
              >
                <div className="shrink-0 mt-0.5">{icon}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-text-primary select-text">{toast.title}</h4>
                  <p className="text-[10px] text-text-secondary mt-1 select-text leading-normal">{toast.message}</p>
                </div>
                <button 
                  onClick={() => removeToast(toast.id)}
                  className="text-text-muted hover:text-text-secondary shrink-0 select-none p-0.5 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Bottom floating query prompt bar (Only shown on Chat Tab) */}
        {selectedTab === "chat" && (
          <footer className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-app-bg/85 backdrop-blur-md border-t border-border-default/80 shrink-0 select-none z-10">
            <div className="flex gap-2.5 items-end max-w-3xl mx-auto">
              {/* Attachment Clip button */}
              <button 
                type="button"
                onClick={() => setIsUploadOpen(true)}
                className="w-10 h-10 border border-border-default rounded-xl flex items-center justify-center hover:bg-card-bg group transition-all shrink-0 active:scale-95"
                title="Attach schematic diagram or PDF document"
              >
                <Paperclip className="w-4.5 h-4.5 text-text-muted group-hover:text-primary-light transition-colors" />
              </button>
              
              {/* Central Text Input container */}
              <div className="flex-1 bg-card-bg border border-border-default rounded-2xl p-2.5 px-4 flex flex-col justify-between transition-all duration-200 focus-within:border-primary">
                <div className="flex items-center gap-2 mb-1.5">
                   <span className="px-1.5 py-0.5 bg-app-bg text-text-muted text-[9px] font-bold rounded border border-border-default">llama3-8b</span>
                   <span className="px-1.5 py-0.5 bg-app-bg text-text-muted text-[9px] font-bold rounded border border-border-default">on-premises</span>
                   <span className="ml-auto flex items-center gap-1.5 text-[9px] text-text-muted font-bold uppercase">
                     <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-status-success animate-pulse shadow-[0_0_8px_#10b981]" : "bg-status-error"}`} />
                     {isConnected ? "Aura Engine Active" : "Aura offline"}
                   </span>
                 </div>
                <textarea
                  ref={textareaRef}
                  value={inputVal}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  className="bg-transparent border-none focus:ring-0 text-xs md:text-sm resize-none w-full py-1 text-text-primary focus:outline-none placeholder:text-text-placeholder select-text max-h-32"
                  placeholder={documents.length === 0 ? "Upload source documents to initiate local grounded RAG..." : "Ask Aura or query active repository..."}
                />
              </div>

              {/* Integrated Audio Voice input widget */}
              <div className="shrink-0">
                <AudioRecorder 
                  onTranscriptionComplete={handleAudioTranscribed} 
                  onError={(msg) => addToast("error", "Transcription Interrupted", msg)}
                />
              </div>

              {/* Send Button */}
              <button
                type="button"
                onClick={handleSend}
                disabled={isStreaming || !inputVal.trim()}
                className={`w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/20 transition-all shrink-0 active:scale-95 ${
                  isStreaming || !inputVal.trim() ? "opacity-25 pointer-events-none" : ""
                }`}
                title="Send query"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
            <p className="text-center text-[9px] text-text-disabled mt-3 uppercase tracking-widest font-black select-none">
              LOCAL ISOLATION SECURITY GUARD ACTIVE
            </p>
          </footer>
        )}

      </main>

      {/* Document Ingestion Overlay Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-app-bg/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none animate-fade-in">
          <div className="bg-card-bg rounded-2xl w-full max-w-lg shadow-2xl border border-border-default flex flex-col p-6 relative select-text">
            {/* Close button */}
            <button
              onClick={() => setIsUploadOpen(false)}
              className="absolute top-4.5 right-4.5 text-text-muted hover:text-text-primary p-1.5 hover:bg-app-bg rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-display text-base font-black text-text-primary tracking-tight mb-1">
              Ingest Grounded Schematic / Source Data
            </h3>
            <p className="text-xs text-text-muted mb-5 select-none">
              Uploaded assets are parsed, chunked, and vector-embedded inside the local secure sandbox environment.
            </p>

            {/* Custom drag and drop file box */}
            <FileUploader
              onUploadSuccess={handleUploadSuccess}
              onAudioTranscribed={handleAudioTranscribed}
              onError={(msg) => addToast("error", "Ingestion Warning", msg)}
            />

            {/* Notes footer */}
            <div className="mt-4 bg-app-bg rounded-xl p-4 flex gap-3 border border-border-default select-none">
              <Info className="w-4 h-4 text-primary-light shrink-0 mt-0.5" />
              <p className="text-[11px] text-text-secondary leading-normal">
                Files uploaded here are processed strictly using local CPU memory pipelines, enabling high-precision RAG contextual mappings.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
