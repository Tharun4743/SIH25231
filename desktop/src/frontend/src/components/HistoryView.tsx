import { useState, useEffect } from "react";
import { DocumentInfo } from "../types";
import { 
  BarChart, 
  BookOpen, 
  Clock, 
  ShieldCheck, 
  HeartPulse, 
  HardDrive,
  Search,
  Filter,
  ArrowUpDown,
  FileText,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Database
} from "lucide-react";

interface HistoryViewProps {
  documents: DocumentInfo[];
}

interface AuditLog {
  id: string;
  timestamp: string;
  event: string;
  description: string;
  status: "Success" | "Warning" | "Error" | "Info";
  operator: string;
}

export default function HistoryView({ documents }: HistoryViewProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState({
    documentsCount: 0,
    chunksCount: 0,
    auditLogsCount: 0,
    storageUsed: 0
  });
  const [health, setHealth] = useState<{
    ollama: boolean;
    ollamaStatus: string;
    vectorStore: string;
    status: string;
  }>({ ollama: false, ollamaStatus: "Checking...", vectorStore: "Empty", status: "Checking..." });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const loadLogsAndStats = async () => {
      try {
        const [logsRes, statsRes, healthRes] = await Promise.all([
          fetch("/api/logs"),
          fetch("/api/stats"),
          fetch("/api/health")
        ]);
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setLogs(logsData);
        }
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          setHealth(healthData);
        }
      } catch (err) {
        console.error("Failed to fetch logs/stats/health:", err);
      }
    };
    loadLogsAndStats();
  }, [documents]);

  // Toggle sort direction
  const handleSort = () => {
    setSortOrder(prev => prev === "desc" ? "asc" : "desc");
  };

  // Filter and search logs
  const filteredLogs = logs
    .filter(log => {
      const matchesSearch = 
        log.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.operator.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "ALL" || log.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });

  // Paginated elements
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (status: AuditLog["status"]) => {
    switch (status) {
      case "Success":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full bg-status-success-bg text-status-success border border-status-success-border/30 uppercase tracking-wide">
            <span className="w-1 h-1 rounded-full bg-status-success" />
            Success
          </span>
        );
      case "Warning":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full bg-status-warning-bg text-status-warning border border-status-warning-border/30 uppercase tracking-wide">
            <span className="w-1 h-1 rounded-full bg-status-warning" />
            Warning
          </span>
        );
      case "Error":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full bg-status-error-bg text-status-error border border-status-error-border/30 uppercase tracking-wide">
            <span className="w-1 h-1 rounded-full bg-status-error animate-pulse" />
            Error
          </span>
        );
      case "Info":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full bg-status-info-bg text-status-info border border-status-info-border/30 uppercase tracking-wide">
            <span className="w-1 h-1 rounded-full bg-status-info" />
            Info
          </span>
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-app-bg p-6 md:p-8 select-none">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        
        {/* Header Breadcrumbs */}
        <div className="flex flex-col gap-1 border-b border-border-default pb-5">
          <div className="flex items-center gap-2 text-xs text-text-muted font-semibold uppercase tracking-wider">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-primary-light">Audit Logs</span>
          </div>
          <h2 className="font-display text-2xl font-black text-text-primary tracking-tight">
            Security Event & Auditing Logs
          </h2>
          <p className="font-sans text-xs text-text-secondary">
            Monitor real-time ingestion, secure vector searches, system states, and local storage compaction pipelines.
          </p>
        </div>

        {/* Dashboard Cards Grid (4 Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Indexed Density */}
          <div className="bg-card-bg border border-border-default p-5 rounded-xl flex flex-col justify-between hover:border-border-hover hover:scale-102 transition-all duration-200 shadow-sm">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-accent" /> Index Density
            </span>
            <div className="flex items-baseline gap-1.5 my-3">
              <span className="font-display text-2xl font-black text-text-primary">
                {stats.documentsCount}
              </span>
              <span className="text-xs text-text-muted font-medium">Sources</span>
            </div>
            <p className="text-[10px] text-status-success font-semibold flex items-center gap-1">
              ● {stats.chunksCount} Vector Chunks Active
            </p>
          </div>

          {/* Card 2: Data Footprint */}
          <div className="bg-card-bg border border-border-default p-5 rounded-xl flex flex-col justify-between hover:border-border-hover hover:scale-102 transition-all duration-200 shadow-sm">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-accent" /> Data Footprint
            </span>
            <div className="flex items-baseline gap-1.5 my-3">
              <span className="font-display text-2xl font-black text-text-primary">
                {(stats.storageUsed / 1024).toFixed(1)}
              </span>
              <span className="text-xs text-text-muted font-medium">KB</span>
            </div>
            <p className="text-[10px] text-text-secondary font-semibold flex items-center gap-1">
              SQLite3 persistent active
            </p>
          </div>

          {/* Card 3: Sovereign Isolation */}
          <div className="bg-card-bg border border-border-default p-5 rounded-xl flex flex-col justify-between hover:border-border-hover hover:scale-102 transition-all duration-200 shadow-sm">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-status-success animate-pulse" /> Isolation
            </span>
            <div className="flex items-baseline gap-1.5 my-3">
              <span className="font-display text-2xl font-black text-status-success">
                100%
              </span>
              <span className="text-xs text-text-muted font-medium">Sovereign</span>
            </div>
            <p className="text-[10px] text-status-success font-semibold flex items-center gap-1">
              Zero External Callbacks
            </p>
          </div>

          {/* Card 4: Kernel Health — Dynamic */}
          <div className="bg-card-bg border border-border-default p-5 rounded-xl flex flex-col justify-between hover:border-border-hover hover:scale-102 transition-all duration-200 shadow-sm">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-accent" /> Kernel Health
            </span>
            <div className="flex items-baseline gap-1.5 my-3">
              <span className={`font-display text-2xl font-black ${
                health.ollama ? "text-status-success" : "text-status-error"
              }`}>
                {health.ollama ? "Healthy" : "Degraded"}
              </span>
            </div>
            <p className={`text-[10px] font-semibold flex items-center gap-1 ${
              health.ollama ? "text-status-success" : "text-status-error"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                health.ollama ? "bg-status-success animate-pulse" : "bg-status-error"
              }`} />
              Ollama {health.ollamaStatus} · Vector {health.vectorStore}
            </p>
          </div>
        </div>

        {/* Audit Search, Status Filter & Table Header */}
        <div className="mt-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-card-bg p-4 border border-border-default rounded-xl">
          <div className="relative w-full md:w-72 select-text">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-app-bg border border-border-default rounded-lg text-xs text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 text-text-secondary text-xs font-semibold">
              <Filter className="w-3.5 h-3.5 text-text-muted" />
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-app-bg border border-border-default rounded-lg px-3 py-1.5 text-xs font-semibold text-text-secondary focus:outline-none focus:border-primary transition-all"
            >
              <option value="ALL">All Events</option>
              <option value="Success">Success</option>
              <option value="Warning">Warning</option>
              <option value="Error">Error</option>
              <option value="Info">Info</option>
            </select>
          </div>
        </div>

        {/* Enterprise Log Table */}
        <div className="bg-card-bg border border-border-default rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-app-bg text-text-muted text-[10px] font-bold uppercase tracking-wider border-b border-border-default/80 select-none">
                  <th className="py-4 px-5">
                    <button
                      type="button"
                      onClick={handleSort}
                      className="flex items-center gap-1 hover:text-text-primary transition-colors"
                    >
                      TIMESTAMP
                      <ArrowUpDown className="w-3 h-3 text-text-muted" />
                    </button>
                  </th>
                  <th className="py-4 px-5">EVENT</th>
                  <th className="py-4 px-5">DESCRIPTION</th>
                  <th className="py-4 px-5">STATUS</th>
                  <th className="py-4 px-5">OPERATOR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default/40 font-mono text-xs text-text-secondary">
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-text-muted select-none">
                      <Database className="w-8 h-8 text-text-disabled mx-auto mb-2" />
                      <p className="font-semibold text-xs text-text-secondary">No matching logs found</p>
                      <p className="text-[10px] text-text-muted mt-0.5">Try clearing your filters or changing search strings.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => (
                    <tr 
                      key={log.id} 
                      className="hover:bg-header-bg/40 transition-colors cursor-default select-text"
                    >
                      <td className="py-3.5 px-5 text-text-muted whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-text-disabled" />
                          {log.timestamp}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-bold text-primary-light">
                        {log.event}
                      </td>
                      <td className="py-3.5 px-5 text-text-secondary max-w-[280px] truncate" title={log.description}>
                        {log.description}
                      </td>
                      <td className="py-3.5 px-5">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="py-3.5 px-5 text-text-muted whitespace-nowrap">
                        {log.operator}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination bar */}
          <div className="bg-app-bg border-t border-border-default px-5 py-4 flex items-center justify-between select-none text-xs text-text-muted font-semibold">
            <span>
              Showing <span className="text-text-secondary">{filteredLogs.length > 0 ? startIndex + 1 : 0}</span> to{" "}
              <span className="text-text-secondary">
                {Math.min(startIndex + itemsPerPage, filteredLogs.length)}
              </span>{" "}
              of <span className="text-text-secondary">{filteredLogs.length}</span> entries
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 bg-card-bg border border-border-default hover:border-border-hover text-text-secondary hover:text-text-primary rounded-lg transition-all duration-150 disabled:opacity-20 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-text-primary font-bold px-1">
                {currentPage} <span className="text-text-muted">/</span> {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 bg-card-bg border border-border-default hover:border-border-hover text-text-secondary hover:text-text-primary rounded-lg transition-all duration-150 disabled:opacity-20 disabled:pointer-events-none"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
