"use client";

import React, { useState, useEffect } from "react";
import { 
  Upload, 
  Trash2, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  RefreshCcw,
  Search,
  Lock,
  Plus
} from "lucide-react";

interface Document {
  id: number;
  title: string;
  source_filename: string;
  upload_date: string;
  version: number;
  status: string; // processing, indexed, failed
}

interface DocumentsViewProps {
  apiBaseUrl: string;
  token: string;
  userRole: string; // admin, doctor, nurse, pharmacist, student
}

export default function DocumentsView({ apiBaseUrl, token, userRole }: DocumentsViewProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  
  // Upload states
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);

  const isAdmin = userRole === "admin";

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Poll for document status updates if any are in "processing"
  useEffect(() => {
    const hasProcessing = documents.some(doc => doc.status === "processing");
    if (hasProcessing) {
      const interval = setInterval(() => {
        fetchDocuments();
      }, 5000); // refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [documents]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`${apiBaseUrl}/documents/`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error("Failed to fetch documents catalog.");
      }
      const data = await response.json();
      setDocuments(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load documents catalog.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      // Auto-populate title if empty
      if (!title) {
        const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
        setTitle(baseName.replace(/[_-]/g, " "));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim() || isUploading) return;

    // Strict validation
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "txt") {
      setErrorMsg("Unsupported file format. Only PDF and TXT documents are allowed.");
      return;
    }

    setIsUploading(true);
    setUploadProgress("Uploading file...");
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);

    try {
      const response = await fetch(`${apiBaseUrl}/documents/upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to upload document.");
      }

      setFile(null);
      setTitle("");
      setShowUploadModal(false);
      fetchDocuments(); // Refresh list immediately
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during file upload.");
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  const handleDelete = async (docId: number) => {
    if (!window.confirm("Are you sure you want to delete this clinical reference? All associated vector embeddings will be removed.")) return;

    try {
      const response = await fetch(`${apiBaseUrl}/documents/${docId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to delete document.");
      }

      fetchDocuments(); // refresh list
    } catch (err: any) {
      setErrorMsg(err.message || "Error deleting document.");
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.source_filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand" />
            Medical Knowledge Repository
          </h2>
          <p className="text-xs text-slate-400">
            Upload, inspect, and delete active medical guidelines and hospital protocols.
          </p>
        </div>
        
        {isAdmin ? (
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-brand text-brand-text hover:bg-brand-hover shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ingest Document
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-300">
            <Lock className="w-4 h-4" />
            Document ingestion requires Admin permission
          </div>
        )}
      </div>

      {/* Error / Feedback banners */}
      {errorMsg && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-300 flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
          <span className="text-xs font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Catalog Search */}
      <div className="flex items-center gap-2 max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-2 shadow-xs">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search document catalog..."
          className="flex-1 text-xs bg-transparent border-none focus:outline-none dark:text-slate-200"
        />
      </div>

      {/* Document Tables list */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Filename</th>
                <th className="px-6 py-4">Ingestion Date</th>
                <th className="px-6 py-4">Version</th>
                <th className="px-6 py-4">Indexing Status</th>
                {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-350">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-450 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileText className="w-8 h-8 text-slate-300 animate-pulse-soft" />
                      <span>No matching clinical guidelines indexed in the repository.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">
                      {doc.title}
                    </td>
                    <td className="px-6 py-4 truncate max-w-[180px]" title={doc.source_filename}>
                      {doc.source_filename}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(doc.upload_date).toLocaleDateString()} {new Date(doc.upload_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                      v{doc.version}
                    </td>
                    <td className="px-6 py-4">
                      {doc.status === "indexed" && (
                        <span className="px-2.5 py-1 inline-flex items-center gap-1 text-[10px] font-bold rounded-full bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-900">
                          <CheckCircle2 className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                          Ready for search
                        </span>
                      )}
                      {doc.status === "processing" && (
                        <span className="px-2.5 py-1 inline-flex items-center gap-1 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900 animate-pulse-soft">
                          <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400 animate-spin" />
                          Chunking & Embedding
                        </span>
                      )}
                      {doc.status === "failed" && (
                        <span className="px-2.5 py-1 inline-flex items-center gap-1 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900">
                          <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                          Failed
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer dark:hover:bg-rose-950/20"
                          title="Delete reference & purge embeddings"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document upload modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg w-full max-w-md p-6 overflow-hidden transform transition-all">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">
              Ingest Medical Document
            </h3>
            <p className="text-[11px] text-slate-450 dark:text-slate-500 mb-4">
              Add new PDF guidelines or TXT protocol files to the RAG knowledge pool.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 block uppercase">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. WHO Hypertension Protocol 2026"
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded focus:outline-none focus:border-brand dark:text-slate-255"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 block uppercase">
                  Choose Document File (PDF / TXT)
                </label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-6 hover:bg-slate-50/50 dark:hover:bg-slate-850/10 transition-colors flex flex-col items-center justify-center text-center cursor-pointer relative">
                  <input
                    type="file"
                    required
                    accept=".pdf,.txt"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="w-8 h-8 text-slate-350 mb-2 animate-bounce" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    {file ? file.name : "Select PDF or TXT File"}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Max size: 10MB
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setFile(null);
                    setTitle("");
                  }}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded transition-colors cursor-pointer dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!file || !title.trim() || isUploading}
                  className="px-4 py-1.5 text-xs font-bold bg-brand text-brand-text hover:bg-brand-hover rounded shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  {isUploading ? (
                    <span className="flex items-center gap-1.5">
                      <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                      {uploadProgress}
                    </span>
                  ) : (
                    "Upload & Process"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
