import React, { useState, useEffect } from "react";
import {
  ClipboardCheck, Sparkles, CheckCircle, Plus, Send, FolderLock, Loader2,
  UserPlus, Trash2, Calendar, Layers, LayoutGrid, BellRing
} from "lucide-react";
import { apiUrl } from "../api.js";

export default function OnboardingView({ onboardings, templates, userRole, authToken, onRefresh }) {
  const [selectedOnboarding, setSelectedOnboarding] = useState(null);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDept, setTemplateDept] = useState("Engineering");
  const [templateTasks, setTemplateTasks] = useState([
    { title: "Review technical systems codebase & read handbook", relativeDays: 1, assignedTo: "New Hire" },
    { title: "Introduce newcomer to the divisional Slack channels", relativeDays: 1, assignedTo: "Manager" }
  ]);
  const [employeeName, setEmployeeName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeeRole, setEmployeeRole] = useState("Senior Frontend Engineer");
  const [employeeDeptInput, setEmployeeDeptInput] = useState("Engineering");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [startingDate, setStartingDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [cronAlertLogs, setCronAlertLogs] = useState(null);
  const [triggeringCron, setTriggeringCron] = useState(false);

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) setSelectedTemplateId(templates[0].id);
  }, [templates]);

  const handleAddTemplateTaskField = () => {
    setTemplateTasks([...templateTasks, { title: "", relativeDays: 1, assignedTo: "New Hire" }]);
  };

  const handleUpdateTemplateTaskField = (idx, key, value) => {
    const updated = [...templateTasks];
    updated[idx] = { ...updated[idx], [key]: value };
    setTemplateTasks(updated);
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (!templateTitle || templateTasks.some(t => !t.title)) return;
    setLoading(true);
    try {
      const response = await fetch(apiUrl("/api/onboarding/templates"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
        body: JSON.stringify({ title: templateTitle, department: templateDept, tasks: templateTasks })
      });
      if (response.ok) {
        setTemplateTitle("");
        setTemplateTasks([
          { title: "Review technical systems codebase & read handbook", relativeDays: 1, assignedTo: "New Hire" },
          { title: "Introduce newcomer to the divisional Slack channels", relativeDays: 1, assignedTo: "Manager" }
        ]);
        alert("Checklist Onboarding Template created successfully!");
        onRefresh();
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleLaunchOnboarding = async (e) => {
    e.preventDefault();
    if (!employeeName || !employeeEmail || !selectedTemplateId) return;
    setLoading(true);
    try {
      const response = await fetch(apiUrl("/api/onboarding/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
        body: JSON.stringify({ employeeName, employeeEmail, employeeRole, employeeDepartment: employeeDeptInput, templateId: selectedTemplateId, startDate: startingDate })
      });
      if (response.ok) {
        const data = await response.json();
        setEmployeeName(""); setEmployeeEmail(""); setStartingDate("");
        alert(data.message || "Onboarding started!");
        onRefresh();
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleUpdateTaskStatus = async (onboardingId, taskId, nextStatus) => {
    try {
      const response = await fetch(apiUrl(`/api/onboarding/${onboardingId}/task/${taskId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
        body: JSON.stringify({ status: nextStatus })
      });
      if (response.ok) {
        const data = await response.json();
        onRefresh();
        if (selectedOnboarding && selectedOnboarding.id === onboardingId) setSelectedOnboarding(data.onboarding);
      }
    } catch (err) { console.error(err); }
  };

  const handleTriggerDailyCronMock = async () => {
    setTriggeringCron(true); setCronAlertLogs(null);
    try {
      const response = await fetch(apiUrl("/api/onboarding/cron-trigger"), {
        method: "POST", headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCronAlertLogs(data.recipients || []);
        alert(`9am Daily Reminder Loop Triggered! Found ${data.alertsSent} overdue items.`);
      }
    } catch (e) { console.error(e); }
    finally { setTriggeringCron(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="onboarding-board">
      <div className="lg:col-span-1 space-y-6">
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-4 bg-zinc-900/20 border-b border-zinc-800/80">
            <span className="font-sans font-bold text-zinc-100 text-sm">Active Onboarding</span>
          </div>
          <div className="divide-y divide-zinc-800/40">
            {onboardings.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">No active onboarding pathways found.</div>
            ) : onboardings.map((ob) => {
              const isSelected = selectedOnboarding?.id === ob.id;
              return (
                <div key={ob.id} onClick={() => setSelectedOnboarding(ob)}
                  className={`p-4 cursor-pointer hover:bg-zinc-900/20 transition-all ${isSelected ? "bg-indigo-600/10 border-l-4 border-indigo-500" : ""}`}>
                  <h4 className="font-bold text-zinc-200 text-xs">{ob.employeeName}</h4>
                  <span className="text-[11px] text-indigo-400 font-semibold block mt-0.5">{ob.employeeRole}</span>
                  <div className="mt-2.5 space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-zinc-500">Task completion:</span>
                      <span className="font-extrabold text-zinc-300">{ob.completionPct}%</span>
                    </div>
                    <div className="w-full bg-zinc-950/60 h-1.5 rounded-full overflow-hidden border border-zinc-900">
                      <div style={{ width: `${ob.completionPct}%` }} className="bg-indigo-500 h-full rounded-full transition-all" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass p-4 rounded-xl">
          <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono tracking-wider mb-2.5 block">
            📁 Checklists Templates ({templates.length})
          </span>
          <div className="space-y-2 max-h-[140px] overflow-y-auto">
            {templates.map((temp) => (
              <div key={temp.id} className="p-2 border border-zinc-800 bg-zinc-900/20 rounded text-[11px]">
                <span className="font-bold block text-zinc-200 leading-snug">{temp.title}</span>
                <span className="text-zinc-500 block mt-0.5">{temp.tasks.length} tasks assigned • {temp.department}</span>
              </div>
            ))}
          </div>
        </div>

        {(userRole === "superadmin" || userRole === "hr_manager") && (
          <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 text-indigo-400 font-mono text-[10px] font-bold">
              <BellRing className="w-3.5 h-3.5 text-indigo-400" />
              <span>ALERTS &amp; NOTIFICATION ENGINE</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">Simulation testing for daily 9am automatic emails regarding incomplete overdue onboarding duties.</p>
            <button type="button" disabled={triggeringCron} onClick={handleTriggerDailyCronMock}
              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer">
              {triggeringCron && <Loader2 className="w-2.5 h-2.5 animate-spin text-white" />}
              <span>Simulate daily alerts reminder cron</span>
            </button>
            {cronAlertLogs && cronAlertLogs.length > 0 && (
              <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 space-y-1.5 max-h-[120px] overflow-y-auto font-mono text-[9px]">
                <span className="text-rose-400 font-semibold block uppercase">⚠️ Pending Overdue Alerts Sent:</span>
                {cronAlertLogs.map((lg, i) => (
                  <div key={i} className="border-b border-zinc-800 pb-1 last:border-0 pt-1 text-zinc-400">
                    <span className="text-zinc-200 font-bold block">{lg.employeeName} ({lg.assignedTo})</span>
                    <span>Task limit passed: &ldquo;{lg.taskTitle}&rdquo;</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-3">
        {selectedOnboarding ? (
          <div className="space-y-6">
            <div className="glass p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 block tracking-wider uppercase font-mono">Personal Onboarding Workspace</span>
                <h3 className="font-sans font-black text-zinc-100 text-lg leading-snug">{selectedOnboarding.employeeName}</h3>
                <p className="text-xs text-zinc-400 font-medium">Position: {selectedOnboarding.employeeRole} • Dept: {selectedOnboarding.employeeDepartment}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 flex items-center justify-center bg-indigo-600/10 font-bold text-xs text-indigo-400 font-mono">
                  {selectedOnboarding.completionPct}%
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-zinc-500 font-bold tracking-wider block font-mono">PROGRESS PERCENTAGE</span>
                  <span className="text-xs font-semibold text-zinc-300">Checklist compliance rate</span>
                </div>
              </div>
            </div>

            {selectedOnboarding.welcomeEmailText && (
              <div className="bg-indigo-600/5 border border-indigo-500/10 p-5 rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block font-mono flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /><span>Personalized Welcome Letter (Prepared Workspace Template)</span>
                </span>
                <div className="text-xs text-zinc-300 leading-relaxed italic whitespace-pre-line bg-zinc-950/40 p-4 rounded-lg border border-zinc-800">
                  {selectedOnboarding.welcomeEmailText}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="onboarding-kanban">
              {[
                { status: "todo", label: "📌 TO DO", borderColor: "border-zinc-800", countBg: "bg-zinc-800 border-zinc-700 text-zinc-300" },
                { status: "in_progress", label: "⏳ IN PROGRESS", borderColor: "border-amber-900/30", countBg: "bg-amber-950/20 text-amber-400 border-amber-900/30" },
                { status: "complete", label: "✅ COMPLETED", borderColor: "border-emerald-900/20", countBg: "bg-emerald-950/20 text-emerald-400 border-emerald-900/30" },
              ].map(({ status, label, borderColor, countBg }) => (
                <div key={status} className="bg-zinc-950/30 p-4 rounded-xl border border-zinc-800 min-h-[300px]">
                  <div className="flex justify-between items-center pb-2.5 border-b border-zinc-800 mb-3">
                    <span className="text-xs font-bold text-zinc-300 font-mono block">{label}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${countBg}`}>
                      {selectedOnboarding.tasks.filter(t => t.status === status).length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {selectedOnboarding.tasks.filter(t => t.status === status).map(task => (
                      <div key={task.id} className={`p-3 bg-zinc-900/50 rounded-lg border ${borderColor} shadow-sm space-y-2.5`}>
                        <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-bold uppercase font-mono block w-max">{task.assignedTo}</span>
                        <p className="text-xs font-semibold text-zinc-100 leading-snug">&ldquo;{task.title}&rdquo;</p>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-zinc-500 font-mono">Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                          <div className="flex gap-1.5">
                            {status === "todo" && (
                              <button onClick={() => handleUpdateTaskStatus(selectedOnboarding.id, task.id, "in_progress")}
                                className="px-2 py-1 bg-indigo-600/10 hover:bg-indigo-600/25 text-indigo-400 rounded-lg text-[9px] font-bold cursor-pointer">Start →</button>
                            )}
                            {status === "in_progress" && (<>
                              <button onClick={() => handleUpdateTaskStatus(selectedOnboarding.id, task.id, "todo")}
                                className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[9px] cursor-pointer">Back</button>
                              <button onClick={() => handleUpdateTaskStatus(selectedOnboarding.id, task.id, "complete")}
                                className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[9px] font-bold cursor-pointer">Done</button>
                            </>)}
                            {status === "complete" && (
                              <button onClick={() => handleUpdateTaskStatus(selectedOnboarding.id, task.id, "in_progress")}
                                className="px-1.5 py-0.5 hover:bg-zinc-800 text-zinc-300 rounded text-[9px] transition-colors cursor-pointer">Reopen</button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {(userRole === "superadmin" || userRole === "hr_manager") ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass p-6 rounded-xl space-y-4">
                  <div>
                    <h3 className="font-sans font-bold text-zinc-100 text-sm flex items-center gap-1.5">
                      <UserPlus className="w-5 h-5 text-indigo-400" /><span>Start Onboarding Workflow</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">Assign custom checklist templates and generate welcome drafts</p>
                  </div>
                  <form onSubmit={handleLaunchOnboarding} className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-mono">Newcomer name</label>
                        <input type="text" required value={employeeName} onChange={(e) => setEmployeeName(e.target.value)}
                          placeholder="e.g. David Smith" className="w-full px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-lg text-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-mono">Email address</label>
                        <input type="email" required value={employeeEmail} onChange={(e) => setEmployeeEmail(e.target.value)}
                          placeholder="david@candidate.com" className="w-full px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-lg text-xs" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-mono">Position / Role</label>
                        <input type="text" required value={employeeRole} onChange={(e) => setEmployeeRole(e.target.value)}
                          placeholder="Senior Frontend Developer" className="w-full px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-lg text-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-mono">Department</label>
                        <input type="text" required value={employeeDeptInput} onChange={(e) => setEmployeeDeptInput(e.target.value)}
                          placeholder="Engineering" className="w-full px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-lg text-xs" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-mono">Target Template</label>
                        <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}
                          className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 font-semibold focus:outline-none">
                          {templates.map(tmp => (
                            <option className="bg-[#0a0a0a]" key={tmp.id} value={tmp.id}>{tmp.title}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-mono">Starting Date</label>
                        <input type="date" value={startingDate} onChange={(e) => setStartingDate(e.target.value)}
                          className="w-full px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 text-zinc-300 rounded-lg text-xs" />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button type="submit" disabled={loading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer">
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>Compile &amp; Launch Onboarding</span>
                      </button>
                    </div>
                  </form>
                </div>

                <div className="glass p-6 rounded-xl space-y-4">
                  <div>
                    <h3 className="font-sans font-bold text-zinc-100 text-sm flex items-center gap-1.5">
                      <Layers className="w-5 h-5 text-indigo-400" /><span>Create Onboarding Template</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">Setup reusable milestones checklists for specific divisions</p>
                  </div>
                  <form onSubmit={handleCreateTemplate} className="space-y-4 pt-1">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-mono">Template name</label>
                        <input type="text" required value={templateTitle} onChange={(e) => setTemplateTitle(e.target.value)}
                          placeholder="e.g. Sales Onboarding" className="w-full px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-lg text-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-mono">Target Department</label>
                        <input type="text" required value={templateDept} onChange={(e) => setTemplateDept(e.target.value)}
                          placeholder="Sales division" className="w-full px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-lg text-xs" />
                      </div>
                    </div>
                    <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase font-mono">Tasks list</span>
                        <button type="button" onClick={handleAddTemplateTaskField}
                          className="text-[10px] text-indigo-400 font-bold hover:underline cursor-pointer">+ Add checklist task</button>
                      </div>
                      {templateTasks.map((tk, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input type="text" required placeholder="Task title description" value={tk.title}
                            onChange={(e) => handleUpdateTemplateTaskField(idx, "title", e.target.value)}
                            className="flex-1 px-2.5 py-1 text-xs bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded placeholder-zinc-600" />
                          <input type="number" required placeholder="Days" style={{ width: "45px" }} value={tk.relativeDays}
                            onChange={(e) => handleUpdateTemplateTaskField(idx, "relativeDays", parseInt(e.target.value) || 1)}
                            className="px-1.5 py-1 text-xs bg-zinc-900 border border-zinc-800 text-zinc-100 rounded font-mono" />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end pt-2">
                      <button type="submit" disabled={loading}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg shadow-sm border border-zinc-700 cursor-pointer">
                        Save reusable template
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="glass rounded-xl p-12 text-center text-zinc-500 text-xs py-32 flex flex-col items-center justify-center">
                <ClipboardCheck className="w-10 h-10 text-zinc-600 mb-2" />
                <span>Select an active onboarding candidate workspace from the left list to review checklists!</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
