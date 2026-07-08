"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bot, LogIn, Loader2, AlertCircle, ShieldAlert } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("medirag_token");
    if (token) {
      router.push("/");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    setError(null);

    // Form data encoding is required by FastAPI OAuth2PasswordRequestForm
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData.toString()
      });

      if (!response.ok) {
        // Try JSON first, otherwise read as text to avoid JSON parse errors
        let detail = null;
        try {
          const errorData = await response.json();
          detail = errorData.detail || JSON.stringify(errorData);
        } catch (e) {
          detail = await response.text();
        }
        throw new Error(detail || "Authentication failed. Please verify credentials.");
      }

      // Successful response - parse JSON safely
      const data = await response.json();
      
      // Save token
      localStorage.setItem("medirag_token", data.access_token);
      
      // Fetch user profile to verify role and details
      const profileResponse = await fetch(`${apiBaseUrl}/auth/me`, {
        headers: {
          "Authorization": `Bearer ${data.access_token}`
        }
      });

      if (profileResponse.ok) {
        const userProfile = await profileResponse.json();
        localStorage.setItem("medirag_user", JSON.stringify(userProfile));
      }

      router.push("/");
    } catch (err: any) {
      setError(err.message || "An unexpected connection issue occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // Quick fill tester credentials
  const fillCredentials = (role: "admin" | "doctor") => {
    if (role === "admin") {
      setEmail("admin@medirag.com");
      setPassword("admin123");
    } else {
      setEmail("doctor@medirag.com");
      setPassword("doctor123");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 font-sans select-none">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl p-8 shadow-md space-y-6">
        
        {/* Branding header */}
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <div className="p-3 bg-teal-50 dark:bg-teal-950/20 text-brand rounded-full ring-8 ring-teal-50/50 dark:ring-teal-950/5">
            <Bot className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">
            MediRAG clinical database
          </h1>
          <p className="text-xs text-slate-450 dark:text-slate-500">
            Sign in to access evidence-based clinical insights
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-250 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-300">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="font-semibold">
                  {error.length > 160 && !showErrorDetails ? `${error.slice(0,160)}...` : error}
                </div>
                {error.length > 160 && (
                  <button onClick={() => setShowErrorDetails(!showErrorDetails)} className="mt-2 text-[10px] font-bold text-rose-700 dark:text-rose-300 underline">
                    {showErrorDetails ? 'Hide details' : 'Show details'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Professional Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@medirag.com"
              className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg focus:outline-none focus:border-brand dark:text-slate-200 shadow-inner"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Security Password
              </label>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg focus:outline-none focus:border-brand dark:text-slate-200 shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-glow flex items-center justify-center gap-1.5 py-3 text-xs rounded-lg disabled:opacity-50 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Access Clinical Knowledge
              </>
            )}
          </button>
        </form>

        {/* Separator / Quick Fill tools */}
        <div className="relative flex py-2 items-center text-xs">
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          <span className="flex-shrink mx-4 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">
            Test Quick-Fill Credentials
          </span>
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => fillCredentials("admin")}
            className="py-2.5 px-3 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-650 hover:bg-slate-50 cursor-pointer text-left flex flex-col justify-between dark:border-slate-850 dark:text-slate-350 dark:hover:bg-slate-850 transition-all"
          >
            <span className="text-[9px] font-bold text-red-500 uppercase">Admin Role</span>
            <span>admin@medirag.com</span>
          </button>
          <button
            type="button"
            onClick={() => fillCredentials("doctor")}
            className="py-2.5 px-3 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-655 hover:bg-slate-50 cursor-pointer text-left flex flex-col justify-between dark:border-slate-850 dark:text-slate-350 dark:hover:bg-slate-850 transition-all"
          >
            <span className="text-[9px] font-bold text-blue-500 uppercase">Doctor Role</span>
            <span>doctor@medirag.com</span>
          </button>
        </div>

        <div className="text-center text-xs">
          <span className="text-slate-400">Need a clinical credentials key? </span>
          <Link href="/register" className="font-bold text-brand hover:underline">
            Register Account
          </Link>
        </div>
      </div>
    </div>
  );
}
