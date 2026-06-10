import React, { useState, useEffect } from "react";
import {
  Users, FileText, Video, BarChart2, ClipboardCheck, LogOut,
  ShieldCheck, CalendarCheck, DollarSign, TrendingUp, Users2,
  Menu, X, ChevronLeft,
} from "lucide-react";
import { apiUrl } from "../api.js";

export default function Sidebar({ currentTab, setTab, user, onLogout, isOpen, setIsOpen }) {
  if (!user) return null;

  const menuItems = [
    { id: "screenings", label: "Resume Screening", icon: FileText, roles: ["superadmin", "hr_manager", "interviewer"], section: "Talent" },
    { id: "interviews", label: "Video Interviews", icon: Video, roles: ["superadmin", "hr_manager", "interviewer", "candidate"], section: "Talent" },
    { id: "onboarding", label: "Onboarding Board", icon: ClipboardCheck, roles: ["superadmin", "hr_manager", "interviewer", "candidate"], section: "Talent" },
    { id: "employees", label: "Employee Directory", icon: Users2, roles: ["superadmin", "hr_manager", "interviewer"], section: "HRMS" },
    { id: "attendance", label: "Attendance", icon: CalendarCheck, roles: ["superadmin", "hr_manager", "interviewer", "candidate"], section: "HRMS" },
    { id: "payroll", label: "Payroll", icon: DollarSign, roles: ["superadmin", "hr_manager", "interviewer", "candidate"], section: "HRMS" },
    { id: "performance", label: "Performance", icon: TrendingUp, roles: ["superadmin", "hr_manager", "interviewer", "candidate"], section: "HRMS" },
    { id: "analytics", label: "HR Analytics", icon: BarChart2, roles: ["superadmin", "hr_manager", "interviewer"], section: "Insights" },
    { id: "superadmin", label: "Superadmin Control", icon: ShieldCheck, roles: ["superadmin"], section: "Admin" },
  ];

  const filteredItems = menuItems.filter((item) => item.roles.includes(user.role));

  const roleLabels = {
    superadmin: "Super Admin",
    hr_manager: "HR Manager",
    interviewer: "Interviewer",
    candidate: "Candidate Role",
  };

  const sections = ["Talent", "HRMS", "Insights", "Admin"];
  const grouped = sections.reduce((acc, sec) => {
    const items = filteredItems.filter((i) => i.section === sec);
    if (items.length > 0) acc[sec] = items;
    return acc;
  }, {});

  const handleNavClick = (id) => {
    setTab(id);
    // Auto-close sidebar on mobile after navigation
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        id="hr-sidebar"
        className={`
          fixed top-0 left-0 h-full z-40
          md:relative md:z-auto md:translate-x-0
          w-64 bg-[#0a0a0a] text-zinc-100 flex flex-col border-r border-zinc-800
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo + Close Button */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-lg text-white font-sans flex-shrink-0">W</div>
            <div>
              <h1 className="font-sans font-bold text-lg tracking-tight text-white leading-none">WeHire</h1>
              <span className="text-[10px] text-zinc-500 font-mono tracking-wider">HRMS PLATFORM</span>
            </div>
          </div>
          {/* Close button - visible only on mobile */}
          <button
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all flex-shrink-0"
            onClick={() => setIsOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Profile */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-400 flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden min-w-0">
              <h4 className="font-sans font-semibold text-sm text-zinc-100 truncate leading-snug">{user.name}</h4>
              <p className="text-[11px] text-zinc-400 truncate leading-relaxed">{user.email}</p>
              <div className="mt-1.5 flex items-center gap-1">
                <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-indigo-950/30 border border-indigo-500/20 text-indigo-300 tracking-wider uppercase">
                  {roleLabels[user.role] || user.role}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {Object.entries(grouped).map(([section, items]) => (
            <div key={section}>
              <span className="px-3 text-[10px] font-bold text-zinc-600 tracking-widest uppercase block mb-2 font-mono">{section}</span>
              <div className="space-y-1">
                {items.map((item) => {
                  const IconComp = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`sidebar-link-${item.id}`}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                        isActive
                          ? "bg-indigo-600/10 text-indigo-400 border-indigo-600/20 font-semibold"
                          : "text-zinc-400 border-transparent hover:text-white hover:bg-zinc-900/50"
                      }`}
                    >
                      <IconComp className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-indigo-400" : "text-zinc-400"}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/40">
          <button
            onClick={onLogout}
            id="btn-sidebar-logout"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-950/10 hover:text-rose-300 transition-all"
          >
            <LogOut className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>Log out portal</span>
          </button>
        </div>
      </div>
    </>
  );
}
