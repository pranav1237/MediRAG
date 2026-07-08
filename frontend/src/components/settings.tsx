"use client";

import React from "react";
import { 
  Sliders, 
  ShieldCheck, 
  Sun, 
  Moon, 
  Laptop,
  CheckCircle,
  Database,
  Lock,
  UserCheck
} from "lucide-react";

interface SettingsViewProps {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
  simulatedRole: string;
  setSimulatedRole: (role: string) => void;
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  apiBaseUrl: string;
}

export default function SettingsView({
  user,
  simulatedRole,
  setSimulatedRole,
  theme,
  setTheme,
  apiBaseUrl
}: SettingsViewProps) {

  // Roles available for simulation
  const roles = [
    { id: "admin", name: "Super Administrator", desc: "Full permissions: upload & delete reference manuals, inspect logs." },
    { id: "doctor", name: "Medical Doctor", desc: "Retrieve clinical knowledge, search sources, submit thumbs feedback." },
    { id: "nurse", name: "Registered Nurse", desc: "Retrieve protocols, view active guidelines, submit feedback." },
    { id: "student", name: "Medical Student", desc: "Read educational content, search text. Restricted from hospital SOPs." }
  ];

  // Permissions matrix list
  const permissionsList = {
    admin: [
      "Upload guidelines and files",
      "Purge document vector embeddings",
      "Full API data ingestion",
      "Inspect search query history",
      "Submit quality thumbs ratings",
      "Access analytics charts"
    ],
    doctor: [
      "Full clinical guideline search",
      "Access citation index and sources",
      "Search history retention",
      "Submit quality thumbs ratings"
    ],
    nurse: [
      "Search standard medical references",
      "Access citation index and sources",
      "Submit quality thumbs ratings"
    ],
    student: [
      "Access public clinical guides",
      "Submit quality thumbs ratings"
    ]
  };

  const handleRoleChange = (roleId: string) => {
    setSimulatedRole(roleId);
  };

  // Toggle theme utility
  const toggleTheme = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    
    if (newTheme === "dark") {
      root.classList.add("dark");
    } else if (newTheme === "light") {
      root.classList.add("light");
    } else {
      // System check
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (systemDark) {
        root.classList.add("dark");
      } else {
        root.classList.add("light");
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 shrink-0">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-brand" />
          Settings & Configurations
        </h2>
        <p className="text-xs text-slate-400">
          Configure clinical parameters, visual presentation templates, and simulate user roles.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Role Simulator Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl p-5 shadow-xs space-y-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-brand" />
              Role-Based Access Control (RBAC) Simulator
            </h3>
            <p className="text-[10px] text-slate-400">
              Switch roles to verify system access restrictions. No account logout required.
            </p>
          </div>

          <div className="space-y-3">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => handleRoleChange(r.id)}
                className={`w-full p-3.5 text-left border rounded-lg flex items-start gap-3 cursor-pointer transition-all ${
                  simulatedRole === r.id
                    ? "border-brand bg-teal-50/20 dark:bg-teal-950/10 dark:border-brand"
                    : "border-slate-250 hover:border-slate-300 dark:border-slate-850 dark:hover:border-slate-800"
                }`}
              >
                <div className={`p-1.5 rounded-full shrink-0 ${
                  simulatedRole === r.id 
                    ? "bg-brand text-brand-text" 
                    : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-255 block">
                    {r.name}
                  </span>
                  <span className="text-[10px] text-slate-450 dark:text-slate-500 block leading-normal">
                    {r.desc}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Permissions & Themes Panel */}
        <div className="space-y-6">
          {/* Active simulated role privileges */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-brand" />
                Active Simulated Permissions
              </h3>
              <p className="text-[10px] text-slate-400">
                Functional actions authorized for the simulated role.
              </p>
            </div>

            <div className="space-y-2">
              {permissionsList[simulatedRole as keyof typeof permissionsList]?.map((perm, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-slate-650 dark:text-slate-350">
                  <CheckCircle className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>{perm}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Theme card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-brand" />
                Interface Visual Theme
              </h3>
              <p className="text-[10px] text-slate-400">
                Choose light mode, dark mode, or fall back to local system configs.
              </p>
            </div>

            <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg">
              <button
                onClick={() => toggleTheme("light")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded cursor-pointer transition-all ${
                  theme === "light"
                    ? "bg-white text-brand shadow-xs dark:bg-slate-900"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                Light
              </button>
              <button
                onClick={() => toggleTheme("dark")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded cursor-pointer transition-all ${
                  theme === "dark"
                    ? "bg-white text-brand shadow-xs dark:bg-slate-900"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                Dark
              </button>
              <button
                onClick={() => toggleTheme("system")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded cursor-pointer transition-all ${
                  theme === "system"
                    ? "bg-white text-brand shadow-xs dark:bg-slate-900"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                System
              </button>
            </div>
          </div>

          {/* Diagnostic endpoints */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Database className="w-4 h-4 text-brand" />
              Diagnostic API Configuration
            </h3>
            <div className="space-y-1.5 text-[11px] font-mono text-slate-500">
              <div className="flex justify-between">
                <span>API Gateway:</span>
                <span className="text-slate-700 dark:text-slate-350">{apiBaseUrl}</span>
              </div>
              <div className="flex justify-between">
                <span>VDB Connection:</span>
                <span className="text-teal-650 dark:text-teal-400">Local Qdrant Disk Storage</span>
              </div>
              <div className="flex justify-between">
                <span>RAG Orchestrator:</span>
                <span className="text-teal-650 dark:text-teal-400">Grounded strict mode</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
