import { useState, useEffect } from "react";
import { 
  Server, 
  Cpu, 
  Sliders, 
  ShieldCheck, 
  Database,
  Save, 
  Check, 
  HelpCircle,
  Network
} from "lucide-react";

export default function SettingsView() {
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [chromaUrl, setChromaUrl] = useState("http://localhost:8001");
  const [chunkSize, setChunkSize] = useState(500);
  const [chunkOverlap, setChunkOverlap] = useState(100);
  const [topK, setTopK] = useState(3);
  const [modelName, setModelName] = useState("llama3");
  const [temperature, setTemperature] = useState(0.1);
  const [enableFallback, setEnableFallback] = useState(true);
  const [autoStartOllama, setAutoStartOllama] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.ollama_url) setOllamaUrl(data.ollama_url);
          if (data.chroma_url) setChromaUrl(data.chroma_url);
          if (data.chunk_size) setChunkSize(parseInt(data.chunk_size));
          if (data.overlap) setChunkOverlap(parseInt(data.overlap));
          if (data.top_k) setTopK(parseInt(data.top_k));
          if (data.model_name) setModelName(data.model_name);
          if (data.temperature) setTemperature(parseFloat(data.temperature));
          if (data.enable_fallback !== undefined) setEnableFallback(data.enable_fallback === "true");
          if (data.auto_start_ollama !== undefined) setAutoStartOllama(data.auto_start_ollama === "true");
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ollama_url: ollamaUrl,
          chroma_url: chromaUrl,
          chunk_size: chunkSize,
          overlap: chunkOverlap,
          top_k: topK,
          model_name: modelName,
          temperature: temperature,
          enable_fallback: enableFallback ? "true" : "false",
          auto_start_ollama: autoStartOllama ? "true" : "false",
        }),
      });
      if (res.ok) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2500);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-app-bg p-6 md:p-8 select-none">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        
        {/* Page Title & Breadcrumb Header */}
        <div className="flex flex-col gap-1 border-b border-border-default pb-5">
          <div className="flex items-center gap-2 text-xs text-text-muted font-semibold uppercase tracking-wider">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-primary-light">Settings</span>
          </div>
          <h2 className="font-display text-2xl font-black text-text-primary tracking-tight">
            Aura System Configuration
          </h2>
          <p className="font-sans text-xs text-text-secondary">
            Control chunking thresholds, in-memory model targets, and local database services.
          </p>
        </div>

        {/* Configuration Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Server Configuration */}
          <div className="bg-card-bg border border-border-default rounded-xl p-5 hover:border-border-hover transition-all duration-250 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-center text-primary-light">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-sans text-sm font-bold text-text-primary uppercase tracking-wider">
                    Server Configuration
                  </h3>
                  <p className="text-[11px] text-text-muted">Core server bindings for retrieval systems</p>
                </div>
              </div>
              
              <div className="space-y-4 mt-4 select-text">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">
                    Ollama Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    placeholder="e.g. http://127.0.0.1:11434"
                    className="w-full text-xs px-3.5 py-2.5 bg-app-bg border border-border-default rounded-lg text-text-primary placeholder:text-text-placeholder focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-200"
                  />
                  <p className="text-[10px] text-text-muted mt-1">Host layer port where local LLMs run</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">
                    ChromaDB Vector Host
                  </label>
                  <input
                    type="text"
                    value={chromaUrl}
                    onChange={(e) => setChromaUrl(e.target.value)}
                    placeholder="e.g. http://localhost:8001"
                    className="w-full text-xs px-3.5 py-2.5 bg-app-bg border border-border-default rounded-lg text-text-primary placeholder:text-text-placeholder focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-200"
                  />
                  <p className="text-[10px] text-text-muted mt-1">Sovereign client database target</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Model Configuration */}
          <div className="bg-card-bg border border-border-default rounded-xl p-5 hover:border-border-hover transition-all duration-250 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-center text-primary-light">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-sans text-sm font-bold text-text-primary uppercase tracking-wider">
                    Model Configuration
                  </h3>
                  <p className="text-[11px] text-text-muted">Offline synthesis and generator values</p>
                </div>
              </div>

              <div className="space-y-4 mt-4 select-text">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">
                    Target LLM Model Name
                  </label>
                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="e.g. llama3, mistral"
                    className="w-full text-xs px-3.5 py-2.5 bg-app-bg border border-border-default rounded-lg text-text-primary placeholder:text-text-placeholder focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-200"
                  />
                  <p className="text-[10px] text-text-muted mt-1">Target active model tags inside local storage</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">
                    Model Temperature
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <span className="font-mono text-xs font-bold text-primary-light w-8 text-right">
                      {temperature}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-muted mt-1">Lower values are highly structured & factual</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Chunk Configuration */}
          <div className="bg-card-bg border border-border-default rounded-xl p-5 hover:border-border-hover transition-all duration-250 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-center text-primary-light">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-sans text-sm font-bold text-text-primary uppercase tracking-wider">
                    Chunk Configuration
                  </h3>
                  <p className="text-[11px] text-text-muted">Document window parsing metrics</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 select-text">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">
                    Chunk Size (Words)
                  </label>
                  <input
                    type="number"
                    value={chunkSize}
                    onChange={(e) => setChunkSize(parseInt(e.target.value) || 0)}
                    placeholder="500"
                    className="w-full text-xs px-3.5 py-2.5 bg-app-bg border border-border-default rounded-lg text-text-primary placeholder:text-text-placeholder focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-200"
                  />
                  <p className="text-[10px] text-text-muted mt-1">Token length for text splits</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">
                    Overlap Size (Words)
                  </label>
                  <input
                    type="number"
                    value={chunkOverlap}
                    onChange={(e) => setChunkOverlap(parseInt(e.target.value) || 0)}
                    placeholder="100"
                    className="w-full text-xs px-3.5 py-2.5 bg-app-bg border border-border-default rounded-lg text-text-primary placeholder:text-text-placeholder focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-200"
                  />
                  <p className="text-[10px] text-text-muted mt-1">Sliding context preservation</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Embedding & Query Bounds */}
          <div className="bg-card-bg border border-border-default rounded-xl p-5 hover:border-border-hover transition-all duration-250 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-center text-primary-light">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-sans text-sm font-bold text-text-primary uppercase tracking-wider">
                    Embedding Configuration
                  </h3>
                  <p className="text-[11px] text-text-muted">Retrieval density and citation top-K</p>
                </div>
              </div>

              <div className="space-y-4 mt-4 select-text">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">
                    Top-K Document Citations
                  </label>
                  <input
                    type="number"
                    value={topK}
                    onChange={(e) => setTopK(parseInt(e.target.value) || 0)}
                    placeholder="3"
                    className="w-full text-xs px-3.5 py-2.5 bg-app-bg border border-border-default rounded-lg text-text-primary placeholder:text-text-placeholder focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-200"
                  />
                  <p className="text-[10px] text-text-muted mt-1">Count of closest matched text chunks returned to LLM</p>
                </div>

                <div className="pt-2 border-t border-border-default/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest">
                        General LLM Fallback
                      </label>
                      <p className="text-[10px] text-text-muted mt-0.5">Use general knowledge if context is missing</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={enableFallback}
                        onChange={(e) => setEnableFallback(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-border-default/80 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border-default after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>

                <div className="pt-2 border-t border-border-default/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest">
                        Auto-Start Ollama Service
                      </label>
                      <p className="text-[10px] text-text-muted mt-0.5">Automatically launch Ollama on application startup</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoStartOllama}
                        onChange={(e) => setAutoStartOllama(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-border-default/80 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border-default after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Card 5: Sovereignty Security & Compliance */}
          <div className="col-span-1 md:col-span-2 bg-card-bg border border-border-default rounded-xl p-5 hover:border-border-hover transition-all duration-250 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-status-success-bg/20 border border-status-success/30 flex items-center justify-center text-status-success">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-sans text-sm font-bold text-text-primary uppercase tracking-wider">
                    Sovereignty & Compliance Controls
                  </h3>
                  <p className="text-[11px] text-text-muted">Local privacy sandbox specifications</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <div className="p-4 bg-app-bg/60 rounded-xl border border-border-default/40">
                  <span className="block text-[10px] font-bold text-status-success uppercase tracking-widest mb-1">
                    API Isolation State
                  </span>
                  <p className="text-xs font-bold text-text-primary mt-1.5">STRICTLY IN-MEMORY</p>
                  <p className="text-[10px] text-text-muted mt-1">Zero transmission to third-party endpoints</p>
                </div>

                <div className="p-4 bg-app-bg/60 rounded-xl border border-border-default/40">
                  <span className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">
                    Vocal Processor
                  </span>
                  <p className="text-xs font-bold text-text-primary mt-1.5">LOCAL SPECTROGRAM</p>
                  <p className="text-[10px] text-text-muted mt-1">Audio decibels processed by sandboxed browser audio hooks</p>
                </div>

                <div className="p-4 bg-app-bg/60 rounded-xl border border-border-default/40">
                  <span className="block text-[10px] font-bold text-primary-light uppercase tracking-widest mb-1">
                    Secure Ingress Port
                  </span>
                  <p className="text-xs font-bold text-text-primary mt-1.5">PORT 8080 SERVICE</p>
                  <p className="text-[10px] text-text-muted mt-1">Unified Spring Boot backend</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Form Action Controls with Ripple */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 shadow-lg shadow-primary/25 active:scale-98"
          >
            {isSaved ? (
              <Check className="w-4 h-4 text-white animate-pulse" />
            ) : (
              <Save className="w-4 h-4 text-white" />
            )}
            <span>{isSaved ? "Settings Saved Successfully!" : "Save Active Configurations"}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
