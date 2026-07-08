"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Bot, 
  MessageSquare, 
  FileText, 
  Activity, 
  Sliders, 
  LogOut, 
  Trash2, 
  Menu, 
  X,
  User,
  Shield,
  Bookmark,
  Sparkles,
  ShieldCheck
} from "lucide-react";

import ChatView from "@/components/chat";
import DocumentsView from "@/components/documents";
import AnalyticsView from "@/components/analytics";
import SettingsView from "@/components/settings";
import CitationViewer from "@/components/citation-viewer";

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Citation {
  document_id: number;
  document_title: string;
  page_number: number;
  text: string;
  score: number;
}

interface HistoryItem {
  id: number;
  question: string;
  response: string;
  timestamp: string;
  feedbacks: any[];
}

export default function WorkspacePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Simulated state for RBAC checks without logging out
  const [simulatedRole, setSimulatedRole] = useState<string>("doctor");
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
  
  // View navigation state (tab query synced)
  const [activeTab, setActiveTab] = useState<string>("chat");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  // Sidebar history list
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchHistoryTerm, setSearchHistoryTerm] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true);
    
    // Retrieve token & profile
    const storedToken = localStorage.getItem("medirag_token");
    const storedUser = localStorage.getItem("medirag_user");

    if (!storedToken) {
      router.push("/login");
    } else {
      setToken(storedToken);
      if (storedUser) {
        const parsed = JSON.parse(storedUser) as UserProfile;
        setUser(parsed);
        setSimulatedRole(parsed.role); // default simulated role to original account role
      }
    }

    // Set theme
    const storedTheme = localStorage.getItem("medirag_theme") as "light" | "dark" | "system";
    if (storedTheme) {
      setTheme(storedTheme);
      applyTheme(storedTheme);
    } else {
      applyTheme("light");
    }
  }, [router]);

  const applyTheme = (themeValue: "light" | "dark" | "system") => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    if (themeValue === "dark") {
      root.classList.add("dark");
    } else if (themeValue === "light") {
      root.classList.add("light");
    } else {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(systemDark ? "dark" : "light");
    }
  };

  useEffect(() => {
    if (token) {
      fetchHistory();
    }
  }, [token]);

  const fetchHistory = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${apiBaseUrl}/chat/history`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to load search history:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("medirag_token");
    localStorage.removeItem("medirag_user");
    router.push("/login");
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setActiveConversationId(String(item.id));
    setActiveTab("chat");
    setSelectedCitation(null);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedCitation(null); // clear open citations when switching screens
  };

  const applySimulatedRole = (newRole: string) => {
    setSimulatedRole(newRole);
  };

  const updateThemeChoice = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("medirag_theme", newTheme);
  };

  if (!mounted || !token) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-2">
          <Bot className="w-8 h-8 text-brand animate-pulse-soft" />
          <span className="text-xs font-semibold text-slate-450 dark:text-slate-500">
            Establishing clinical connection...
          </span>
        </div>
      </div>
    );
  }

  // Filter history logs
  const filteredHistory = history.filter(item => 
    item.question.toLowerCase().includes(searchHistoryTerm.toLowerCase())
  );

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="bg-orbs" aria-hidden="true">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>
      <div className="bg-grid" aria-hidden="true" />

      {/* Collapsible left sidebar */}
      <div 
        className={`${
          isSidebarOpen ? "w-64" : "w-0"
        } transition-all duration-300 border-r border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-850 flex flex-col h-full shrink-0 overflow-hidden relative z-30`}
      >
        {/* Brand Banner */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-850 shrink-0">
          <div className="flex items-center gap-2">
            <div className="rounded-2xl bg-brand p-2 shadow-lg shadow-teal-500/20">
              <Bot className="w-5 h-5 text-brand-text" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight">
                MediRAG MVP
              </h1>
              <p className="text-[10px] text-slate-400">Evidence-first care copilot</p>
            </div>
          </div>
          <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.2em] text-teal-700 dark:border-teal-900 dark:bg-teal-950/20 dark:text-teal-300">
            Live
          </span>
        </div>

        {/* Navigation Sidebar Tabs */}
        <div className="px-2 py-3 space-y-1 shrink-0 border-b border-slate-100 dark:border-slate-850">
          <button
            onClick={() => handleTabChange("chat")}
            className={`nav-item w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
              activeTab === "chat"
                ? "active bg-brand text-brand-text shadow-lg shadow-teal-500/20"
                : "text-slate-550 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-850 dark:hover:text-slate-200"
            }`}
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat Assistant
            </span>
          </button>

          <button
            onClick={() => handleTabChange("documents")}
            className={`nav-item w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
              activeTab === "documents"
                ? "active bg-brand text-brand-text shadow-lg shadow-teal-500/20"
                : "text-slate-550 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-850 dark:hover:text-slate-200"
            }`}
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Medical Guidelines
            </span>
          </button>

          <button
            onClick={() => handleTabChange("analytics")}
            className={`nav-item w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
              activeTab === "analytics"
                ? "active bg-brand text-brand-text shadow-lg shadow-teal-500/20"
                : "text-slate-550 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-850 dark:hover:text-slate-200"
            }`}
          >
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Quality Analytics
            </span>
          </button>

          <button
            onClick={() => handleTabChange("settings")}
            className={`nav-item w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
              activeTab === "settings"
                ? "active bg-brand text-brand-text shadow-lg shadow-teal-500/20"
                : "text-slate-550 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-850 dark:hover:text-slate-200"
            }`}
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              Settings & Sandbox
            </span>
          </button>
        </div>

        {/* Search query log list */}
        <div className="flex-1 overflow-y-auto px-2 py-3 flex flex-col min-h-0">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-3 mb-2">
            Conversation History
          </span>
          
          <input
            type="text"
            value={searchHistoryTerm}
            onChange={(e) => setSearchHistoryTerm(e.target.value)}
            placeholder="Search queries history..."
            className="mx-2 mb-3 text-[10px] p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded focus:outline-none dark:text-slate-200"
          />

          <div className="space-y-1 overflow-y-auto flex-1 no-scrollbar">
            {filteredHistory.length === 0 ? (
              <span className="text-[10px] text-slate-400 text-center block py-4">
                No past medical queries found
              </span>
            ) : (
              filteredHistory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectHistoryItem(item)}
                  className={`w-full text-left px-3 py-2 rounded-md text-[11px] block truncate transition-all cursor-pointer ${
                    activeConversationId === String(item.id) && activeTab === "chat"
                      ? "bg-teal-50/50 border border-teal-200 text-teal-800 dark:bg-teal-950/20 dark:border-teal-900 dark:text-teal-300 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-850 border border-transparent"
                  }`}
                  title={item.question}
                >
                  <span className="block truncate">{item.question}</span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Bottom User Info card */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 dark:bg-slate-900/50 dark:border-slate-850 shrink-0 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand text-brand-text flex items-center justify-center font-bold text-sm shadow-xs uppercase">
              {user ? user.name.slice(0, 2) : "MD"}
            </div>
            <div className="space-y-0.5 max-w-[140px]">
              <span className="text-xs font-bold text-slate-800 dark:text-white block truncate" title={user?.name}>
                {user?.name}
              </span>
              <span 
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block uppercase text-center ${
                  simulatedRole === "admin" 
                    ? "bg-red-50 text-red-750 dark:bg-red-950/30 dark:text-red-400 border border-red-200/50 dark:border-red-900" 
                    : simulatedRole === "doctor" 
                      ? "bg-blue-50 text-blue-750 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900"
                      : simulatedRole === "nurse"
                        ? "bg-green-50 text-green-750 dark:bg-green-950/30 dark:text-green-400 border border-green-200/50 dark:border-green-900"
                        : "bg-purple-50 text-purple-755 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-200/50 dark:border-purple-900"
                }`}
              >
                Simulated {simulatedRole}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 dark:bg-slate-950 dark:border-slate-850 dark:hover:bg-slate-850 dark:text-slate-350 cursor-pointer shadow-xs transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main viewport panels */}
      <div className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
        {/* Toggle sidebar button absolute floating */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute left-4 top-4 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg text-slate-500 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-850 z-40 cursor-pointer flex items-center justify-center transition-all md:hidden"
        >
          {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        {/* Tab view routes switcher */}
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
          {activeTab === "chat" && (
            <ChatView
              apiBaseUrl={apiBaseUrl}
              token={token}
              activeConversationId={activeConversationId}
              setActiveConversationId={setActiveConversationId}
              onSelectCitation={(c) => setSelectedCitation(c)}
              userRole={simulatedRole}
              refreshHistory={fetchHistory}
              history={history}
              loadSelectedHistory={handleSelectHistoryItem}
            />
          )}

          {activeTab === "documents" && (
            <DocumentsView
              apiBaseUrl={apiBaseUrl}
              token={token}
              userRole={simulatedRole}
            />
          )}

          {activeTab === "analytics" && (
            <AnalyticsView
              apiBaseUrl={apiBaseUrl}
              token={token}
            />
          )}

          {activeTab === "settings" && (
            <SettingsView
              user={user}
              simulatedRole={simulatedRole}
              setSimulatedRole={applySimulatedRole}
              theme={theme}
              setTheme={updateThemeChoice}
              apiBaseUrl={apiBaseUrl}
            />
          )}
        </div>

        {/* Citation Detail panel */}
        {selectedCitation && (
          <CitationViewer
            citation={selectedCitation}
            onClose={() => setSelectedCitation(null)}
          />
        )}
      </div>
    </div>
  );
}
