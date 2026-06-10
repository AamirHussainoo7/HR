import React, { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./components/Sidebar.jsx";
import Login from "./components/Login.jsx";
import ResumeScreening from "./components/ResumeScreening.jsx";
import VideoInterview from "./components/VideoInterview.jsx";
import Analytics from "./components/Analytics.jsx";
import OnboardingView from "./components/Onboarding.jsx";
import SuperadminPanel from "./components/SuperadminPanel.jsx";
import EmployeeDirectory from "./components/EmployeeDirectory.jsx";
import AttendanceModule from "./components/Attendance.jsx";
import PayrollModule from "./components/Payroll.jsx";
import PerformanceTracking from "./components/PerformanceTracking.jsx";
import { apiUrl } from "./api.js";

export default function App() {
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(localStorage.getItem("synergy_auth_token"));
  const [currentTab, setCurrentTab] = useState("screenings");
  const [dbStatus, setDbStatus] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const [resumes, setResumes] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [onboardings, setOnboardings] = useState([]);
  const [employees, setEmployees] = useState([]);

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
          if (userData.role === "candidate") {
            setCurrentTab("attendance");
          } else {
            setCurrentTab("employees");
          }
        })
        .catch(() => {
          handleLogout();
        });
    }
  }, [authToken]);

  const fetchAllData = async () => {
    if (!authToken || !user) return;
    const headers = { "Authorization": `Bearer ${authToken}` };
    try {
      if (user.role !== "candidate") {
        const resumesRes = await fetch(apiUrl("/api/resumes"), { headers });
        if (resumesRes.ok) setResumes(await resumesRes.json());

        const templatesRes = await fetch(apiUrl("/api/onboarding/templates"), { headers });
        if (templatesRes.ok) setTemplates(await templatesRes.json());

        const onboardingsRes = await fetch(apiUrl("/api/onboarding"), { headers });
        if (onboardingsRes.ok) setOnboardings(await onboardingsRes.json());

        const empRes = await fetch(apiUrl("/api/employees"), { headers });
        if (empRes.ok) setEmployees(await empRes.json());
      } else {
        const onboardCandidateRes = await fetch(apiUrl("/api/onboarding/candidate"), { headers });
        if (onboardCandidateRes.ok) {
          const singleOb = await onboardCandidateRes.json();
          setOnboardings([singleOb]);
        }
      }

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

  const handleLoginSuccess = (token, userData) => {
    localStorage.setItem("synergy_auth_token", token);
    setAuthToken(token);
    setUser(userData);
    if (userData.role === "candidate") {
      setCurrentTab("attendance");
    } else {
      setCurrentTab("employees");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("synergy_auth_token");
    setAuthToken(null);
    setUser(null);
  };

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
      case "employees":
        return (
          <EmployeeDirectory
            employees={employees}
            userRole={user.role}
            authToken={authToken}
            onRefresh={fetchAllData}
          />
        );
      case "attendance":
        return (
          <AttendanceModule
            authToken={authToken}
            userRole={user.role}
            userId={user.id}
            userName={user.name}
          />
        );
      case "payroll":
        return (
          <PayrollModule
            authToken={authToken}
            userRole={user.role}
          />
        );
      case "performance":
        return (
          <PerformanceTracking
            authToken={authToken}
            userRole={user.role}
            userName={user.name}
          />
        );
      default:
        return <div className="text-xs text-slate-500">Loading...</div>;
    }
  };

  if (!authToken || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-zinc-100 overflow-hidden font-sans">
      <Sidebar
        currentTab={currentTab}
        setTab={setCurrentTab}
        user={user}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0a] min-w-0">
        <header className="bg-[#0a0a0a]/50 border-b border-zinc-800 h-16 flex items-center justify-between px-4 md:px-8 z-10 flex-shrink-0 backdrop-blur-md">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {/* Hamburger toggle - mobile only */}
            <button
              id="btn-toggle-sidebar"
              className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all flex-shrink-0"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-sans font-black text-zinc-100 tracking-tight truncate">
              Welcome to Portal
            </span>
            <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-indigo-500/40 flex-shrink-0" />
            <span className="hidden sm:block text-xs text-zinc-400 font-sans truncate">
              Active Member: <span className="font-semibold text-zinc-200">{user.name}</span>
            </span>
            {user.department && (
              <>
                <div className="hidden md:block w-1 h-1 rounded-full bg-zinc-800 flex-shrink-0" />
                <span className="hidden md:block text-xs text-zinc-500 font-sans truncate">{user.department}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 md:px-2.5 py-1 rounded bg-zinc-900/80 border border-zinc-800 text-zinc-400 font-mono hidden sm:block">
              Workspace Access: {user.role.replace("_", " ")}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-zinc-900/80 border border-zinc-800 text-zinc-400 font-mono sm:hidden">
              {user.role.replace("_", " ")}
            </span>
          </div>
        </header>

        {dbStatus && !dbStatus.connected && (
          <div className="bg-amber-950/20 border-b border-amber-500/10 px-4 md:px-8 py-3 flex items-start md:items-center justify-between gap-3 text-xs text-amber-300 backdrop-blur-sm">
            <div className="flex items-start md:items-center gap-3">
              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 animate-pulse mt-1 md:mt-0" />
              <span>
                <strong>Adaptive Offline Mode:</strong> WeHire loaded successfully, but the connection to your MongoDB Atlas cluster is currently restricted by IP Whitelisting rules. Add{" "}
                <code className="bg-amber-950 px-1 py-0.5 rounded text-white font-mono text-[11px]">0.0.0.0/0</code> to your Atlas IP Whitelist to connect persistently.
              </span>
            </div>
            <a
              href="https://www.mongodb.com/docs/atlas/security-whitelist/"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold text-amber-400 hover:underline px-3 py-1 rounded bg-amber-500/10 border border-amber-500/20 select-none whitespace-nowrap flex-shrink-0"
            >
              Whitelist IP →
            </a>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl w-full mx-auto" id="workspace-main-panel">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
}
