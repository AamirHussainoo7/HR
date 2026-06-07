import React, { useState } from "react";
import { Briefcase, ArrowRight, Sparkles, Mail, Lock } from "lucide-react";
import { apiUrl } from "../api.js";

export default function Login({ onLoginSuccess }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("hr_manager");
  const [department, setDepartment] = useState("Engineering");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    const url = isRegistering ? apiUrl("/api/auth/register") : apiUrl("/api/auth/login");
    const body = isRegistering
      ? { name, email, password, role, department }
      : { email, password };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setErrorMessage(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div id="login-container" className="min-h-screen bg-[#0a0a0a] flex flex-col md:flex-row text-zinc-100">
      <div className="md:w-1/2 bg-[#0a0a0a] border-r border-zinc-900 flex flex-col justify-between p-8 md:p-12 text-zinc-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-lg text-white font-sans">W</div>
          <h1 className="font-sans font-bold text-xl text-white tracking-tight">WeHire</h1>
        </div>

        <div className="my-10 md:my-0 max-w-md">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600/10 border border-indigo-600/20 text-indigo-400 text-xs font-mono font-semibold tracking-wider uppercase mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" /> Human-First Talent Portal
          </div>
          <h2 className="font-sans font-extrabold text-3xl md:text-4xl text-white tracking-tight mb-4 leading-heading">
            Powering screening, interviewing, &amp; onboarding.
          </h2>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
            Eliminate operational bias and screen candidate resumes in seconds. Engage candidates through conversational structured video interviews and automate onboarding journeys from starting drafts to completed milestones.
          </p>
        </div>


      </div>

      <div className="md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-[#0a0a0a]">
        <div className="w-full max-w-sm flex flex-col">
          <div className="mb-6">
            <h2 className="font-sans font-extrabold text-2xl text-zinc-100 tracking-tight">
              {isRegistering ? "Get Started with Synergy" : "Welcome back to Synergy"}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              {isRegistering ? "Already have an account?" : "New to Synergy recruitment suite?"}{" "}
              <button
                type="button"
                id="btn-toggle-register"
                onClick={() => { setIsRegistering(!isRegistering); setErrorMessage(""); }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 transition-all"
              >
                {isRegistering ? "Log in here" : "Register a new profile"}
              </button>
            </p>
          </div>

          {errorMessage && (
            <div id="login-error-alert" className="p-3 mb-4 rounded-lg bg-rose-950/25 border border-rose-900/40 text-xs font-medium text-rose-400">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 font-mono">Full Name</label>
                <input
                  type="text" required id="reg-input-name" value={name}
                  onChange={(e) => setName(e.target.value)} placeholder="Enter full name"
                  className="w-full pl-3 py-2 bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder-zinc-600"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 font-mono">Corporate Email Address</label>
              <input
                type="email" required id="auth-input-email" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com"
                className="w-full pl-3 py-2 bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder-zinc-600"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 font-mono">Password</label>
              <input
                type="password" required id="auth-input-password" value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="Enter password"
                className="w-full pl-3 py-2 bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder-zinc-600"
              />
            </div>

            {isRegistering && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 font-mono">Hiring Role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} id="reg-select-role"
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all">
                    <option className="bg-[#0a0a0a]" value="hr_manager">HR Manager</option>
                    <option className="bg-[#0a0a0a]" value="interviewer">Interviewer</option>
                    <option className="bg-[#0a0a0a]" value="candidate">Candidate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 font-mono">Department</label>
                  <input type="text" value={department} id="reg-input-dept"
                    onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Sales, Tech"
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder-zinc-600"
                  />
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} id="btn-auth-submit"
              className="w-full flex items-center justify-center gap-2 pt-2.5 pb-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition-all shadow-md shadow-indigo-600/15 disabled:opacity-50">
              <span>{loading ? "Processing credentials..." : isRegistering ? "Complete Register" : "Submit Access Request"}</span>
              {!loading && <ArrowRight className="w-4 h-4 text-white" />}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
