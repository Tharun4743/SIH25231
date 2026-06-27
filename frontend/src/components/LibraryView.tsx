import { useState, useEffect } from "react";
import { DocumentInfo, ImageSearchResult } from "../types";
import { searchImages } from "../services/api";
import { 
  FileText, 
  Image as ImageIcon, 
  Search, 
  Trash2, 
  SlidersHorizontal, 
  ImageDown,
  ChevronRight,
  Eye,
  Calendar,
  Layers,
  ArrowUpDown,
  Filter,
  FileBox
} from "lucide-react";

interface LibraryViewProps {
  documents: DocumentInfo[];
  onDeleteDocument: (id: string) => void;
  onTriggerUpload: () => void;
  onError: (msg: string) => void;
}

export default function LibraryView({
  documents,
  onDeleteDocument,
  onTriggerUpload,
  onError,
}: LibraryViewProps) {
  const [docSearch, setDocSearch] = useState("");
  const [docFilter, setDocFilter] = useState("ALL");
  const [docSort, setDocSort] = useState<"name" | "size" | "pages">("name");
  
  const [imageQuery, setImageQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ImageSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Trigger empty search to fetch seeded images on view load
  useEffect(() => {
    handleImageSearch();
  }, []);

  const handleImageSearch = async () => {
    setIsSearching(true);
    try {
      const results = await searchImages(imageQuery);
      setSearchResults(results);
    } catch (err: any) {
      console.error(err);
      onError("Failed to search visual indices. Please check server availability.");
    } finally {
      setIsSearching(false);
    }
  };

  // Filter, search, and sort documents
  const processedDocs = documents
    .filter((doc) => {
      const matchesSearch = doc.name.toLowerCase().includes(docSearch.toLowerCase());
      
      const ext = doc.name.split(".").pop()?.toUpperCase() || "";
      let matchesFilter = true;
      if (docFilter === "PDF") matchesFilter = ext === "PDF";
      else if (docFilter === "TXT") matchesFilter = ext === "TXT";
      else if (docFilter === "AUDIO") matchesFilter = ext === "WAV" || ext === "MP3";
      else if (docFilter === "IMAGE") matchesFilter = ext === "PNG" || ext === "JPG" || ext === "JPEG";

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (docSort === "name") {
        return a.name.localeCompare(b.name);
      } else if (docSort === "size") {
        return b.size - a.size;
      } else if (docSort === "pages") {
        return (b.pageCount || 0) - (a.pageCount || 0);
      }
      return 0;
    });

  return (
    <div className="flex-1 overflow-y-auto bg-app-bg p-6 md:p-8 select-none">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        
        {/* View Breadcrumb Header */}
        <div className="flex flex-col gap-1 border-b border-border-default pb-5 md:flex-row md:items-center md:justify-between md:gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-text-muted font-semibold uppercase tracking-wider">
              <span>Workspace</span>
              <span>/</span>
              <span className="text-primary-light">Library</span>
            </div>
            <h2 className="font-display text-2xl font-black text-text-primary tracking-tight">
              Aura Repository & Indexes
            </h2>
            <p className="font-sans text-xs text-text-secondary mt-1">
              Organize document vectors, text chunks, and test neural diagram matching pipelines.
            </p>
          </div>
          
          <button
            type="button"
            onClick={onTriggerUpload}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 shadow-lg shadow-primary/25 shrink-0 select-none active:scale-98"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Upload Diagram / PDF</span>
          </button>
        </div>

        {/* Section 1: Documents controls & List */}
        <div>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
            <div>
              <h3 className="font-sans text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-2">
                <FileBox className="w-4 h-4 text-accent" /> Active Vector Sources ({processedDocs.length})
              </h3>
            </div>

            {/* In-view Search & Filter Bar */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative select-text">
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-header-bg border border-border-default rounded-lg text-[11px] font-semibold text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all w-44"
                />
              </div>

              <select
                value={docFilter}
                onChange={(e) => setDocFilter(e.target.value)}
                className="bg-header-bg border border-border-default rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-text-secondary focus:outline-none focus:border-primary transition-all"
              >
                <option value="ALL">All Formats</option>
                <option value="PDF">PDFs</option>
                <option value="TXT">TXT / Code</option>
                <option value="IMAGE">Diagrams</option>
                <option value="AUDIO">Audio</option>
              </select>

              <select
                value={docSort}
                onChange={(e) => setDocSort(e.target.value as any)}
                className="bg-header-bg border border-border-default rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-text-secondary focus:outline-none focus:border-primary transition-all"
              >
                <option value="name">Sort by Name</option>
                <option value="size">Sort by Size</option>
                <option value="pages">Sort by Pages</option>
              </select>
            </div>
          </div>

          {/* Documents Grid / Table Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {processedDocs.length === 0 ? (
              <div className="col-span-2 border border-dashed border-border-default p-8 rounded-xl text-center select-none bg-card-bg/20">
                <FileText className="w-8 h-8 text-text-disabled mx-auto mb-2" />
                <p className="font-sans text-xs font-bold text-text-secondary">
                  No materials indexed.
                </p>
                <p className="font-sans text-[11px] text-text-muted mt-0.5">
                  Index a document or architectural diagram to initialize searchable context.
                </p>
                <button
                  onClick={onTriggerUpload}
                  className="mt-4 bg-header-bg hover:bg-header-bg/80 text-text-primary px-4 py-2 rounded-lg text-xs font-bold border border-border-default hover:border-border-hover transition-all duration-200"
                >
                  Upload New Document
                </button>
              </div>
            ) : (
              processedDocs.map((doc) => {
                const isPdf = doc.name.split(".").pop()?.toUpperCase() === "PDF";
                return (
                  <div
                    key={doc.id}
                    className="bg-card-bg border border-border-default p-4.5 rounded-xl flex items-center justify-between hover:border-border-hover hover:shadow-lg hover:shadow-app-bg/50 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center text-primary-light shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 select-text">
                        <h4 className="font-sans text-xs font-bold text-text-primary truncate" title={doc.name}>
                          {doc.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[10px] text-text-muted font-semibold">
                          <span className="flex items-center gap-0.5 text-text-secondary">
                            <Layers className="w-3 h-3 text-text-disabled" /> {doc.pageCount || 1} Pages
                          </span>
                          <span>•</span>
                          <span>{(doc.size / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-3 h-3 text-text-disabled" /> Indexed
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => onDeleteDocument(doc.id)}
                      className="text-text-muted hover:text-status-error p-2 hover:bg-app-bg rounded-lg transition-colors shrink-0"
                      title="Deindex document chunks"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Section 2: Visual Images Semantic Search */}
        <div className="border-t border-border-default pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="font-sans text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-status-success" /> Semantic Visual Explorer (CLIP)
              </h3>
              <p className="font-sans text-[11px] text-text-secondary mt-0.5">
                Execute cross-modal natural text search query vectors across structural block diagram layouts.
              </p>
            </div>

            {/* Visual Search Box */}
            <div className="flex gap-2 select-text">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g., database schematic diagram..."
                  value={imageQuery}
                  onChange={(e) => setImageQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleImageSearch()}
                  className="text-xs pl-8 pr-3 py-2 bg-header-bg border border-border-default rounded-lg text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all w-52 md:w-60"
                />
              </div>
              <button
                type="button"
                onClick={handleImageSearch}
                disabled={isSearching}
                className="bg-primary hover:bg-primary-hover disabled:opacity-40 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 shrink-0 select-none"
              >
                Query CLIP
              </button>
            </div>
          </div>

          {/* Visual Search Matches Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {searchResults.length === 0 ? (
              <div className="col-span-2 border border-dashed border-border-default p-8 rounded-xl text-center select-none bg-card-bg/20">
                <ImageDown className="w-8 h-8 text-text-disabled mx-auto mb-2" />
                <p className="font-sans text-xs font-bold text-text-secondary">
                  No visual indexes match.
                </p>
                <p className="font-sans text-[11px] text-text-muted mt-0.5">
                  Ensure schematic drawings (.png, .jpg) are indexed to initiate semantic visual queries.
                </p>
              </div>
            ) : (
              searchResults.map((img) => (
                <div
                  key={img.id}
                  className="bg-card-bg border border-border-default p-4.5 rounded-xl flex flex-col gap-3 hover:border-border-hover hover:shadow-xl transition-all duration-200 shadow-md select-text"
                >
                  <div className="flex justify-between items-start gap-2 select-none">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-sans text-xs font-bold text-text-primary truncate" title={img.name}>
                        {img.name}
                      </h4>
                      <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider mt-0.5">Visual Matrix Chunk</p>
                    </div>
                    <span className="text-[10px] bg-status-success-bg/20 text-status-success border border-status-success-border/30 px-2 py-0.5 rounded font-bold uppercase shrink-0">
                      {img.score}% match
                    </span>
                  </div>

                  {/* image layout container */}
                  <div className="bg-app-bg rounded-lg h-36 flex items-center justify-center overflow-hidden border border-border-default/50 relative select-none group">
                    {img.url ? (
                      <img
                        src={img.url}
                        alt={img.name}
                        referrerPolicy="no-referrer"
                        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-text-muted">
                        <ImageIcon className="w-8 h-8 mb-1.5" />
                        <span className="text-[9px] uppercase font-black tracking-widest text-text-muted">Vector Preview</span>
                      </div>
                    )}
                  </div>

                  {/* text excerpt generated */}
                  <div className="bg-app-bg/50 border border-border-default/30 p-3 rounded-lg">
                    <p className="font-serif text-xs text-text-secondary italic leading-relaxed">
                      "{img.description || "Synthesizing vector boundaries..."}"
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
