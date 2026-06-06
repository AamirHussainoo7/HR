import React, { useState, useEffect } from "react";
import { User, UserRole } from "../types";
import { 
  ShieldCheck, 
  UserPlus, 
  RefreshCw, 
  UserMinus, 
  CheckCircle, 
  XSquare, 
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { apiUrl } from "../api";

interface SuperadminPanelProps {
  authToken: string;
}

export default function SuperadminPanel({ authToken }: SuperadminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Invite state
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("hr_manager");
  const [inviteDept, setInviteDept] = useState("Human Resources");
  const [isInviting, setIsInviting] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl("/api/auth/users"), {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [authToken]);

  const handleUpdateUser = async (id: string, updates: Partial<User>) => {
    try {
      const response = await fetch(apiUrl(`/api/auth/users/${id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify(updates)
      });
      if (response.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;
    setIsInviting(true);
    setAlertMsg("");

    try {
      const response = await fetch(apiUrl("/api/auth/users/invite"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: inviteName,
          email: inviteEmail,
          role: inviteRole,
          department: inviteDept
        })
      });

      const data = await response.json();
      if (response.ok) {
        setInviteName("");
        setInviteEmail("");
        setAlertMsg(data.message || "Invitation compiled!");
        fetchUsers();
      } else {
        setAlertMsg(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setAlertMsg("Invite failed.");
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="superadmin-panel">
      
      {/* Invite box left */}
      <div className="glass p-6 rounded-xl space-y-4 bg-zinc-900/10">
        <div>
          <h3 className="font-sans font-bold text-zinc-100 text-sm flex items-center gap-1.5 leading-none">
            <UserPlus className="w-5 h-5 text-indigo-400" />
            <span>Invite New System User</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-1 font-sans">Pre-load invited workspace members with access credentials</p>
        </div>

        <form onSubmit={handleInvite} className="space-y-3 pt-2">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-mono">Full Name</label>
            <input 
              type="text" required 
              value={inviteName} onChange={(e) => setInviteName(e.target.value)}
              placeholder="Alice Johnson" className="w-full px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-lg text-xs placeholder-zinc-650"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-mono">Email address</label>
            <input 
              type="email" required 
              value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="alice@company.com" className="w-full px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-lg text-xs placeholder-zinc-650"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-mono">Target Designation</label>
              <select 
                value={inviteRole} onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-805 text-zinc-100 rounded-lg text-xs font-semibold focus:outline-none"
              >
                <option className="bg-[#0a0a0a]" value="superadmin">Super Admin</option>
                <option className="bg-[#0a0a0a]" value="hr_manager">HR Manager</option>
                <option className="bg-[#0a0a0a]" value="interviewer">Interviewer</option>
                <option className="bg-[#0a0a0a]" value="candidate">Candidate</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-mono">Department</label>
              <input 
                type="text" required 
                value={inviteDept} onChange={(e) => setInviteDept(e.target.value)}
                className="w-full px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-lg text-xs"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isInviting}
            className="w-full py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            {isInviting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>{isInviting ? "Compiling..." : "Register Invite Profile"}</span>
          </button>
        </form>

        {alertMsg && (
          <div className={`p-3 rounded-lg text-xs font-mono font-medium border ${
            alertMsg.startsWith("Error") ? "bg-rose-950/20 text-rose-450 border-rose-900/50" : "bg-emerald-950/20 text-emerald-400 border-emerald-900/50"
          }`}>
            {alertMsg}
          </div>
        )}
      </div>

      {/* Users database Table list right */}
      <div className="lg:col-span-2 glass rounded-xl overflow-hidden bg-zinc-900/10">
        <div className="p-4 bg-zinc-900/20 border-b border-zinc-805 flex justify-between items-center">
          <span className="font-sans font-bold text-zinc-100 text-sm">Workspace Identity Directory</span>
          <button 
            onClick={fetchUsers}
            className="p-1 px-2.5 bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/60 transition-colors rounded text-xs text-zinc-300 font-mono flex items-center gap-1 font-bold cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 text-indigo-400" />
            <span>Reload Db</span>
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-xs">Loading identity directory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-zinc-400">
              <thead className="bg-[#0e0e0f] text-[10px] uppercase font-bold text-zinc-500 border-b border-zinc-805 font-mono">
                <tr>
                  <th className="px-4 py-3">User name</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Access Tier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850 bg-zinc-900/5">
                {users.map((usr) => (
                  <tr key={usr.id} className="hover:bg-zinc-900/20 transition-all">
                    <td className="px-4 py-3">
                      <div className="font-bold text-zinc-150">{usr.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{usr.email}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-zinc-400">{usr.department}</td>
                    <td className="px-4 py-3">
                      <select
                        value={usr.role}
                        onChange={(e) => handleUpdateUser(usr.id, { role: e.target.value as UserRole })}
                        className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-zinc-200 text-[11px] rounded font-semibold focus:outline-none"
                      >
                        <option className="bg-[#0a0a0a]" value="superadmin">Superadmin</option>
                        <option className="bg-[#0a0a0a]" value="hr_manager">HR Manager</option>
                        <option className="bg-[#0a0a0a]" value="interviewer">Interviewer</option>
                        <option className="bg-[#0a0a0a]" value="candidate">Candidate</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        usr.isActive 
                          ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/50" 
                          : "bg-rose-950/40 text-rose-400 border border-rose-900/50"
                      }`}>
                        {usr.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {usr.isActive ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateUser(usr.id, { isActive: false })}
                          className="px-2.5 py-1 bg-rose-950/20 border border-rose-900 text-rose-400 hover:bg-rose-900/30 rounded font-bold transition-all text-[11px] cursor-pointer"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateUser(usr.id, { isActive: true })}
                          className="px-2.5 py-1 bg-emerald-950/20 border border-emerald-900 text-emerald-400 hover:bg-emerald-900/30 rounded font-bold transition-all text-[11px] cursor-pointer"
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
