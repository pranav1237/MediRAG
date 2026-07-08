"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bot, UserPlus, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("doctor");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password,
          role: role
        })
      });

      if (!response.ok) {
        let detail = null;
        try {
          const errorData = await response.json();
          detail = errorData.detail || JSON.stringify(errorData);
        } catch (e) {
          detail = await response.text();
        }
        throw new Error(detail || "Registration failed. Email may already be in use.");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 font-sans select-none">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl p-8 shadow-md space-y-6">
        
        {/* Header */}
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <div className="p-3 bg-teal-50 dark:bg-teal-950/20 text-brand rounded-full ring-8 ring-teal-50/50 dark:ring-teal-950/5">
            <Bot className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">
            Register Medical Account
          </h1>
          <p className="text-xs text-slate-450 dark:text-slate-500">
            Create credentials to connect to the medical knowledge network
          </p>
        </div>

        {/* Feedback banners */}
        {error && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-250 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-350">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="font-semibold">{error.length > 160 && !showErrorDetails ? `${error.slice(0,160)}...` : error}</div>
                {error.length > 160 && (
                  <button onClick={() => setShowErrorDetails(!showErrorDetails)} className="mt-2 text-[10px] font-bold text-rose-700 dark:text-rose-300 underline">
                    {showErrorDetails ? 'Hide details' : 'Show details'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-lg bg-teal-50 border border-teal-250 text-teal-800 dark:bg-teal-950/20 dark:border-teal-900 dark:text-teal-300 flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div className="text-xs font-semibold">
              <span className="block">Registration Successful!</span>
              Redirecting you to the login screen...
            </div>
          </div>
        )}

        {/* Register form */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Full Legal Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. John Doe"
              className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg focus:outline-none focus:border-brand dark:text-slate-205"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Professional Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="johndoe@medirag.com"
              className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg focus:outline-none focus:border-brand dark:text-slate-205"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Select Professional Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg focus:outline-none focus:border-brand dark:text-slate-200"
            >
              <option value="doctor">Medical Doctor (MD)</option>
              <option value="nurse">Registered Nurse (RN)</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="student">Medical Student</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Choose Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg focus:outline-none focus:border-brand dark:text-slate-205"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || success}
            className="w-full btn-glow flex items-center justify-center gap-1.5 py-3 text-xs rounded-lg disabled:opacity-50 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Create Credentials
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs pt-2">
          <span className="text-slate-400">Already registered? </span>
          <Link href="/login" className="font-bold text-brand hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
