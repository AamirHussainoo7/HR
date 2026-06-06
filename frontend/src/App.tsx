import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Login from "./components/Login";
import ResumeScreening from "./components/ResumeScreening";
import VideoInterview from "./components/VideoInterview";
import Analytics from "./components/Analytics";
import OnboardingView from "./components/Onboarding";
import SuperadminPanel from "./components/SuperadminPanel";
import { UserRole, User, Resume, Interview, OnboardingTemplate, Onboarding } from "./types";
import { apiUrl } from "./api";

export default function App() {
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: UserRole; department: string } | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem("synergy_auth_token"));
  const [currentTab, setCurrentTab] = useState<string>("screenings");
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; error: string | null } | null>(null);

  useEffect(() => {
    const checkDb = () => {
      fetch(apiUrl("/api/db/status"))
        .then((res) => res.json())
        .then((data) => setDbStatus(data))
        .catch((err) => console.error("Failed to check database connection status:", err));
    };
    checkDb();
    const interval = setInterval(checkDb, 15000);
    return () => clearInterval(interval);
  }, []);

  // Core operational datasets
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);

  // Authenticate session on load
  useEffect(() => {
    if (authToken) {
      fetch(apiUrl("/api/auth/current"), {
        headers: { "Authorization": `Bearer ${authToken}` }
      })
        .then((res) => {
          if (!res.ok) throw new Error("Invalid token session");
          return res.json();
        })
        .then((userData) => {
          setUser(userData);
          // Set sensible initial tab based on role on login
          if (userData.role === "candidate") {
            setCurrentTab("interviews");
          } else {
            setCurrentTab("screenings");
          }
        })
        .catch(() => {
          handleLogout();
        });
    }
  }, [authToken]);

  // Fetch operational dataset triggers
  const fetchAllData = async () => {
    if (!authToken || !user) return;
    
    // Auth header config
    const headers = { "Authorization": `Bearer ${authToken}` };

    try {
      // 1. Resumes (only for staff roles)
      if (user.role !== "candidate") {
        const resumesRes = await fetch(apiUrl("/api/resumes"), { headers });
        if (resumesRes.ok) setResumes(await resumesRes.json());

        const templatesRes = await fetch(apiUrl("/api/onboarding/templates"), { headers });
        if (templatesRes.ok) setTemplates(await templatesRes.json());

        const onboardingsRes = await fetch(apiUrl("/api/onboarding"), { headers });
        if (onboardingsRes.ok) setOnboardings(await onboardingsRes.json());
      } else {
        // Candidate role only pulls their personalized onboarding checklist
        const onboardCandidateRes = await fetch(apiUrl("/api/onboarding/candidate"), { headers });
        if (onboardCandidateRes.ok) {
          const singleOb = await onboardCandidateRes.json();
          setOnboardings([singleOb]);
        }
      }

      // 2. Interviews (available for all, returns filtered candidate items internally on the server)
      const interviewsRes = await fetch(apiUrl("/api/interviews"), { headers });
      if (interviewsRes.ok) setInterviews(await interviewsRes.json());

    } catch (err) {
      console.error("Operational data synchronization failed:", err);
    }
  };

  useEffect(() => {
    if (authToken && user) {
      fetchAllData();
    }
  }, [authToken, user]);

  const handleLoginSuccess = (token: string, userData: { id: string; name: string; email: string; role: UserRole; department: string }) => {
    localStorage.setItem("synergy_auth_token", token);
    setAuthToken(token);
    setUser(userData);
    
    if (userData.role === "candidate") {
      setCurrentTab("interviews");
    } else {
      setCurrentTab("screenings");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("synergy_auth_token");
    setAuthToken(null);
    setUser(null);
  };

  // Render tab modules dynamically
  const renderTabContent = () => {
    if (!user || !authToken) return null;

    switch (currentTab) {
      case "screenings":
        return <ResumeScreening resumes={resumes} authToken={authToken} onRefresh={fetchAllData} />;
      case "interviews":
        return <VideoInterview interviews={interviews} userRole={user.role} authToken={authToken} onRefresh={fetchAllData} />;
      case "onboarding":
        return (
          <OnboardingView 
            onboardings={onboardings} 
            templates={templates} 
            userRole={user.role} 
            authToken={authToken} 
            onRefresh={fetchAllData} 
          />
        );
      case "analytics":
        return <Analytics authToken={authToken} />;
      case "superadmin":
        return <SuperadminPanel authToken={authToken} />;
      default:
        return (
          <div className="text-xs text-slate-500">
            Operational area compiling...
          </div>
        );
    }
  };

  if (!authToken || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-zinc-100 overflow-hidden font-sans">
      
      {/* Role-aware sidebar */}
      <Sidebar 
        currentTab={currentTab} 
        setTab={setCurrentTab} 
        user={user} 
        onLogout={handleLogout} 
      />

      {/* Main operational workspace */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0a]">
        
        {/* Global Action Header */}
        <header className="bg-[#0a0a0a]/50 border-b border-zinc-800 h-16 flex items-center justify-between px-8 z-10 flex-shrink-0 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="text-sm font-sans font-black text-zinc-100 tracking-tight">
              Welcome to Portal
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40" />
            <span className="text-xs text-zinc-400 font-sans">
              Active Member: <span className="font-semibold text-zinc-200">{user.name}</span>
            </span>
            {user.department && (
              <>
                <div className="w-1 h-1 rounded-full bg-zinc-800" />
                <span className="text-xs text-zinc-500 font-sans">{user.department}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded bg-zinc-900/80 border border-zinc-800 text-zinc-400 font-mono">
              Workspace Access: {user.role.replace("_", " ")}
            </span>
          </div>
        </header>

        {/* Dynamic Database Status Banner */}
        {dbStatus && !dbStatus.connected && (
          <div className="bg-amber-950/20 border-b border-amber-500/10 px-8 py-3 flex items-center justify-between text-xs text-amber-300 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>
                <strong>Adaptive Offline Mode:</strong> WeHire loaded successfully, but the connection to your MongoDB Atlas cluster is currently restricted by IP Whitelisting rules. To connect persistently to your Atlas Cluster, please log into your MongoDB Atlas Console and add <code className="bg-amber-950 px-1 py-0.5 rounded text-white font-mono text-[11px]">0.0.0.0/0</code> (Allow Access from Anywhere) to your Project's IP Whitelist.
              </span>
            </div>
            <a 
              href="https://www.mongodb.com/docs/atlas/security-whitelist/" 
              target="_blank" 
              rel="noreferrer" 
              className="text-[11px] font-bold text-amber-400 hover:underline px-3 py-1 rounded bg-amber-500/10 border border-amber-500/20 select-none whitespace-nowrap"
            >
              How to Whitelist IP →
            </a>
          </div>
        )}

        {/* Dynamic active portal contents */}
        <main className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto" id="workspace-main-panel">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
}
