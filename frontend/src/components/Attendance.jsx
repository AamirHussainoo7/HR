import React, { useState, useEffect } from "react";
import {
  CalendarCheck, Clock, LogIn, LogOut, CheckCircle, XCircle,
  AlertCircle, Plus, X, ChevronLeft, ChevronRight, Filter,
  Coffee, Laptop, Plane, Activity
} from "lucide-react";
import { apiUrl } from "../api.js";

const STATUS_BADGE = {
  present: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  remote: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  half_day: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  absent: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

const LEAVE_STATUS_BADGE = {
  pending: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  approved: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  rejected: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const LEAVE_TYPES = [
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "emergency", label: "Emergency Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "paternity", label: "Paternity Leave" },
];

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }

export default function AttendanceModule({ authToken, userRole, userId, userName }) {
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todayRecord, setTodayRecord] = useState(null);
  const [clockLoading, setClockLoading] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leaveType: "annual", startDate: "", endDate: "", reason: "" });
  const [leaveError, setLeaveError] = useState("");
  const [leaveSuccess, setLeaveSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("calendar");
  const [clockedInId, setClockedInId] = useState(null);

  const isHR = ["superadmin", "hr_manager"].includes(userRole);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const endpoint = isHR ? apiUrl("/api/attendance") : apiUrl("/api/attendance/my");
      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.ok) {
        const data = await res.json();
        setAttendance(data);
        const today = now.toISOString().split("T")[0];
        const todayAtt = data.find(a => a.date === today && a.employeeName === userName);
        setTodayRecord(todayAtt || null);
        if (todayAtt && !todayAtt.clockOut) setClockedInId(todayAtt.id);
      }
    } catch {}
    finally { setLoading(false); }
  };

  const fetchLeaves = async () => {
    try {
      const res = await fetch(apiUrl("/api/attendance/leaves"), { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.ok) setLeaves(await res.json());
    } catch {}
  };

  useEffect(() => { fetchAttendance(); fetchLeaves(); }, []);

  const handleClockIn = async () => {
    setClockLoading(true);
    try {
      const res = await fetch(apiUrl("/api/attendance/clockin"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ employeeName: userName }),
      });
      const data = await res.json();
      if (res.ok) { setClockedInId(data.attendance.id); await fetchAttendance(); }
    } catch {}
    finally { setClockLoading(false); }
  };

  const handleClockOut = async () => {
    if (!clockedInId) return;
    setClockLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/attendance/${clockedInId}/clockout`), {
        method: "PATCH", headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) { setClockedInId(null); await fetchAttendance(); }
    } catch {}
    finally { setClockLoading(false); }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault(); setLeaveError("");
    try {
      const res = await fetch(apiUrl("/api/attendance/leave"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ ...leaveForm, employeeName: userName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLeaveSuccess("Leave request submitted!");
      setShowLeaveModal(false);
      setLeaveForm({ leaveType: "annual", startDate: "", endDate: "", reason: "" });
      fetchLeaves();
      setTimeout(() => setLeaveSuccess(""), 3000);
    } catch (err) { setLeaveError(err.message); }
  };

  const handleLeaveAction = async (id, status) => {
    try {
      const res = await fetch(apiUrl(`/api/attendance/leaves/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchLeaves();
    } catch {}
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const monthAttendance = attendance.filter(a => a.date?.startsWith(monthPrefix));

  const getDayAttendance = (day) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return monthAttendance.find(a => a.date === dateStr);
  };

  const dayColor = {
    present: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    remote: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    half_day: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    absent: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  };

  const presentDays = monthAttendance.filter(a => a.status === "present").length;
  const remoteDays = monthAttendance.filter(a => a.status === "remote").length;
  const absentDays = monthAttendance.filter(a => a.status === "absent").length;
  const totalHours = monthAttendance.reduce((s, a) => s + (a.hoursWorked || 0), 0);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-emerald-400" /> Attendance Management
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Track work hours, attendance records, and leave requests</p>
        </div>
        <button id="btn-request-leave" onClick={() => setShowLeaveModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 text-sm font-semibold hover:bg-emerald-600/30 transition-all">
          <Plus className="w-4 h-4" /> Request Leave
        </button>
      </div>

      {leaveSuccess && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle className="w-4 h-4" /> {leaveSuccess}
        </div>
      )}

      <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-zinc-500 text-sm font-medium">Today&apos;s Status</p>
          <p className="text-xl font-bold text-zinc-100 mt-1">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          {todayRecord ? (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                In: {todayRecord.clockIn ? new Date(todayRecord.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
              </span>
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                Out: {todayRecord.clockOut ? new Date(todayRecord.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
              </span>
              {todayRecord.hoursWorked ? <span className="text-xs text-zinc-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-400" />{todayRecord.hoursWorked}h</span> : null}
            </div>
          ) : <p className="text-sm text-zinc-500 mt-2">You haven&apos;t clocked in yet today.</p>}
        </div>
        <div className="flex items-center gap-3">
          {!clockedInId ? (
            <button id="btn-clock-in" onClick={handleClockIn} disabled={clockLoading || !!todayRecord}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20">
              <LogIn className="w-4 h-4" />{todayRecord ? "Clocked In" : "Clock In"}
            </button>
          ) : (
            <button id="btn-clock-out" onClick={handleClockOut} disabled={clockLoading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition-all disabled:opacity-50 shadow-lg shadow-rose-500/20">
              <LogOut className="w-4 h-4" /> Clock Out
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Present Days", value: presentDays, color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle },
          { label: "Remote Days", value: remoteDays, color: "text-blue-400", bg: "bg-blue-500/10", icon: Laptop },
          { label: "Absent Days", value: absentDays, color: "text-rose-400", bg: "bg-rose-500/10", icon: XCircle },
          { label: "Total Hours", value: `${Math.round(totalHours * 10) / 10}h`, color: "text-amber-400", bg: "bg-amber-500/10", icon: Clock },
        ].map(stat => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center ${stat.color} mb-2`}><stat.icon className="w-4 h-4" /></div>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-1 w-fit">
        {["calendar", "records", "leaves"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${activeTab === tab ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
            {tab === "leaves" ? "Leave Requests" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "calendar" && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <h3 className="font-bold text-zinc-100">{MONTHS[viewMonth]} {viewYear}</h3>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(day => <div key={day} className="text-center text-xs font-semibold text-zinc-600 py-2">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayDate = new Date(viewYear, viewMonth, day);
              const isToday = dayDate.toDateString() === now.toDateString();
              const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
              const dayAtt = getDayAttendance(day);
              return (
                <div key={day} className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium border transition-all ${isToday ? "ring-2 ring-indigo-500 ring-offset-1 ring-offset-[#0a0a0a]" : ""} ${dayAtt ? dayColor[dayAtt.status] : isWeekend ? "text-zinc-700 border-transparent" : "text-zinc-500 border-zinc-900 hover:border-zinc-700"}`}>
                  <span className={isToday ? "font-bold" : ""}>{day}</span>
                  {dayAtt && <span className="text-[8px] mt-0.5 capitalize">{dayAtt.status.replace("_", " ")}</span>}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-zinc-800">
            {[{ label: "Present", color: "bg-emerald-500/40" }, { label: "Remote", color: "bg-blue-500/40" }, { label: "Half Day", color: "bg-amber-500/40" }, { label: "Absent", color: "bg-rose-500/40" }].map(l => (
              <div key={l.label} className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded ${l.color}`} /><span className="text-xs text-zinc-500">{l.label}</span></div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "records" && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800"><h3 className="font-semibold text-zinc-100 text-sm">Recent Attendance Records</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  {isHR && <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Employee</th>}
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Clock In</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Clock Out</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Hours</th>
                </tr>
              </thead>
              <tbody>
                {attendance.slice(0, 30).map((record, i) => (
                  <tr key={record.id} className={`border-b border-zinc-900 hover:bg-zinc-900/30 transition-colors ${i % 2 === 0 ? "" : "bg-zinc-900/10"}`}>
                    {isHR && <td className="px-5 py-3 text-sm text-zinc-300">{record.employeeName}</td>}
                    <td className="px-5 py-3 text-sm text-zinc-300">{record.date}</td>
                    <td className="px-5 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${STATUS_BADGE[record.status]}`}>{record.status.replace("_", " ").toUpperCase()}</span></td>
                    <td className="px-5 py-3 text-sm text-zinc-400 font-mono">{record.clockIn ? new Date(record.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                    <td className="px-5 py-3 text-sm text-zinc-400 font-mono">{record.clockOut ? new Date(record.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                    <td className="px-5 py-3 text-sm text-zinc-400">{record.hoursWorked ? `${record.hoursWorked}h` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {attendance.length === 0 && (
              <div className="text-center py-12 text-zinc-500"><Activity className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No attendance records found</p></div>
            )}
          </div>
        </div>
      )}

      {activeTab === "leaves" && (
        <div className="space-y-3">
          {leaves.map(leave => (
            <div key={leave.id} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center"><Plane className="w-5 h-5 text-indigo-400" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-100">{leave.employeeName}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${LEAVE_STATUS_BADGE[leave.status]}`}>{leave.status.toUpperCase()}</span>
                    </div>
                    <p className="text-sm text-zinc-400 mt-0.5">{LEAVE_TYPES.find(l => l.value === leave.leaveType)?.label} · {leave.startDate} → {leave.endDate}</p>
                    {leave.reason && <p className="text-xs text-zinc-500 mt-1">{leave.reason}</p>}
                    {leave.approvedBy && <p className="text-xs text-zinc-600 mt-1">Approved by: {leave.approvedBy}</p>}
                  </div>
                </div>
                {isHR && leave.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleLeaveAction(leave.id, "approved")} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors">
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => handleLeaveAction(leave.id, "rejected")} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 transition-colors">
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {leaves.length === 0 && <div className="text-center py-12 text-zinc-500"><Plane className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No leave requests found</p></div>}
        </div>
      )}

      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowLeaveModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-[#0f0f0f] border border-zinc-800 rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-zinc-100">Request Leave</h3>
              <button onClick={() => setShowLeaveModal(false)} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleLeaveSubmit} className="p-6 space-y-4">
              {leaveError && <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm"><AlertCircle className="w-4 h-4" /> {leaveError}</div>}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Leave Type *</label>
                <select value={leaveForm.leaveType} onChange={e => setLeaveForm(f => ({ ...f, leaveType: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50">
                  {LEAVE_TYPES.map(lt => <option key={lt.value} value={lt.value}>{lt.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Start Date *</label>
                  <input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">End Date *</label>
                  <input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Reason</label>
                <textarea value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))}
                  rows={3} placeholder="Brief description of your leave reason..."
                  className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 resize-none" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowLeaveModal(false)} className="flex-1 py-2.5 rounded-lg border border-zinc-800 text-zinc-400 text-sm font-medium hover:bg-zinc-900 transition-colors">Cancel</button>
                <button type="submit" id="btn-submit-leave" className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
