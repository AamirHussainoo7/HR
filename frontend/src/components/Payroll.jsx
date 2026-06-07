import React, { useState, useEffect } from "react";
import {
  IndianRupee, FileText, CheckCircle, Clock, TrendingUp,
  Download, ChevronDown, ChevronUp, Building2, Users,
  AlertCircle, Banknote, Receipt, Wallet, BarChart3
} from "lucide-react";
import { apiUrl } from "../api.js";

const STATUS_BADGE = {
  draft:     "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  processed: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  paid:      "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function formatINR(amount) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(amount);
}

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center ${color} mb-3`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
    </div>
  );
}

function PayslipModal({ record, onClose }) {
  if (!record) return null;
  const monthName = MONTHS[record.month - 1] || "";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-[#0f0f0f] border border-zinc-800 rounded-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-950/60 to-violet-950/40 border-b border-zinc-800 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-1">Payslip</p>
              <h3 className="text-xl font-bold text-zinc-100">{record.employeeName}</h3>
              <p className="text-sm text-zinc-400 mt-0.5">{record.position} · {record.department}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">{monthName} {record.year}</p>
              <span className={`mt-1 inline-block text-[10px] px-2 py-0.5 rounded-full border font-bold ${STATUS_BADGE[record.status]}`}>
                {record.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Earnings */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Earnings</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Base Salary</span>
                <span className="text-zinc-200 font-mono">{formatINR(record.baseSalary)}</span>
              </div>
              {record.bonuses > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Bonus</span>
                  <span className="text-emerald-400 font-mono">+ {formatINR(record.bonuses)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold border-t border-zinc-800 pt-2 mt-2">
                <span className="text-zinc-300">Gross Pay</span>
                <span className="text-zinc-100 font-mono">{formatINR((record.baseSalary || 0) + (record.bonuses || 0))}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          {record.deductions && record.deductions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Deductions</p>
              <div className="space-y-2">
                {record.deductions.map((d, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-zinc-400">{d.label}</span>
                    <span className="text-rose-400 font-mono">− {formatINR(d.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-semibold border-t border-zinc-800 pt-2 mt-2">
                  <span className="text-zinc-300">Total Deductions</span>
                  <span className="text-rose-400 font-mono">− {formatINR(record.totalDeductions)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Net Pay */}
          <div className="bg-gradient-to-r from-emerald-950/40 to-emerald-900/20 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-400/70 uppercase font-semibold tracking-wider">Net Pay</p>
              <p className="text-2xl font-bold text-emerald-400 mt-0.5">{formatINR(record.netPay)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <IndianRupee className="w-6 h-6 text-emerald-400" />
            </div>
          </div>

          {record.paidAt && (
            <p className="text-xs text-zinc-600 text-center">
              Paid on {new Date(record.paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PayrollModule({ authToken, userRole }) {
  const now = new Date();
  const [payroll, setPayroll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [actionLoading, setActionLoading] = useState("");
  const [activeTab, setActiveTab] = useState("payroll");
  const [expandedDept, setExpandedDept] = useState(null);

  const isHR = ["superadmin", "hr_manager"].includes(userRole);

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const endpoint = isHR
        ? apiUrl(`/api/payroll?month=${viewMonth}&year=${viewYear}`)
        : apiUrl("/api/payroll/my");
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) setPayroll(await res.json());
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPayroll(); }, [viewMonth, viewYear]);

  const handleMonthChange = (delta) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1)  { m = 12; y--; }
    setViewMonth(m);
    setViewYear(y);
  };

  // Summary stats
  const totalNetPay    = payroll.reduce((s, r) => s + (r.netPay || 0), 0);
  const totalGross     = payroll.reduce((s, r) => s + (r.baseSalary || 0) + (r.bonuses || 0), 0);
  const totalDeductions = payroll.reduce((s, r) => s + (r.totalDeductions || 0), 0);
  const paidCount      = payroll.filter(r => r.status === "paid").length;

  // Department breakdown
  const deptMap = {};
  payroll.forEach(r => {
    if (!deptMap[r.department]) deptMap[r.department] = { count: 0, total: 0 };
    deptMap[r.department].count++;
    deptMap[r.department].total += r.netPay || 0;
  });
  const deptList = Object.entries(deptMap).map(([dept, data]) => ({ dept, ...data }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            <IndianRupee className="w-6 h-6 text-emerald-400" /> Payroll Management
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Manage salaries, payslips, and payroll processing in ₹ INR</p>
        </div>

        {/* Month navigator */}
        <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2">
          <button onClick={() => handleMonthChange(-1)} className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
            <ChevronDown className="w-4 h-4 rotate-90" />
          </button>
          <span className="text-sm font-semibold text-zinc-200 min-w-[130px] text-center">
            {MONTHS[viewMonth - 1]} {viewYear}
          </span>
          <button onClick={() => handleMonthChange(1)} className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
            <ChevronDown className="w-4 h-4 -rotate-90" />
          </button>
        </div>
      </div>

      {/* Stats */}
      {isHR && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Banknote}    label="Total Net Payout"   value={formatINR(totalNetPay)}    color="text-emerald-400" bg="bg-emerald-500/10" />
          <StatCard icon={TrendingUp}  label="Total Gross"        value={formatINR(totalGross)}     color="text-indigo-400"  bg="bg-indigo-500/10"  />
          <StatCard icon={Receipt}     label="Total Deductions"   value={formatINR(totalDeductions)} color="text-rose-400"   bg="bg-rose-500/10"    />
          <StatCard icon={CheckCircle} label={`Paid (${paidCount}/${payroll.length})`} value={`${payroll.length > 0 ? Math.round((paidCount / payroll.length) * 100) : 0}%`} color="text-amber-400" bg="bg-amber-500/10" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-1 w-fit">
        {(isHR ? ["payroll", "departments"] : ["payroll"]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${activeTab === tab ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
            {tab === "departments" ? "By Department" : "Payroll Records"}
          </button>
        ))}
      </div>

      {/* Payroll Records Table */}
      {activeTab === "payroll" && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="font-semibold text-zinc-100 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-500" />
              {isHR ? "All Payroll Records" : "My Payslips"} — {MONTHS[viewMonth - 1]} {viewYear}
            </h3>
            <span className="text-xs text-zinc-600">{payroll.length} records</span>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-zinc-500">Loading payroll data...</p>
            </div>
          ) : payroll.length === 0 ? (
            <div className="py-16 text-center">
              <Wallet className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
              <p className="text-sm text-zinc-500">No payroll records for this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Employee</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Department</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Base Salary</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Bonus</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Deductions</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Net Pay</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Payslip</th>
                  </tr>
                </thead>
                <tbody>
                  {payroll.map((record, i) => (
                    <tr key={record.id}
                      className={`border-b border-zinc-900 hover:bg-zinc-900/30 transition-colors ${i % 2 === 0 ? "" : "bg-zinc-900/10"}`}>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-sm text-zinc-200">{record.employeeName}</div>
                        <div className="text-xs text-zinc-500">{record.position}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-zinc-400">{record.department}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-sm text-zinc-300">{formatINR(record.baseSalary)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-sm">
                        {record.bonuses > 0
                          ? <span className="text-emerald-400">+{formatINR(record.bonuses)}</span>
                          : <span className="text-zinc-600">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-sm text-rose-400">−{formatINR(record.totalDeductions)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-sm font-bold text-emerald-400">{formatINR(record.netPay)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold ${STATUS_BADGE[record.status]}`}>
                          {record.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          id={`btn-payslip-${record.id}`}
                          onClick={() => setSelectedRecord(record)}
                          className="p-1.5 rounded-lg hover:bg-indigo-500/10 text-indigo-400 hover:text-indigo-300 transition-colors"
                          title="View Payslip"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer total row */}
          {isHR && payroll.length > 0 && (
            <div className="border-t border-zinc-800 px-5 py-3 flex items-center justify-between bg-zinc-900/20">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Payout</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">{formatINR(totalNetPay)}</span>
            </div>
          )}
        </div>
      )}

      {/* Department Breakdown */}
      {activeTab === "departments" && isHR && (
        <div className="space-y-3">
          {deptList.length === 0 ? (
            <div className="py-16 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
              <p className="text-sm text-zinc-500">No data for this period</p>
            </div>
          ) : deptList.map(({ dept, count, total }) => {
            const pct = totalNetPay > 0 ? Math.round((total / totalNetPay) * 100) : 0;
            const isOpen = expandedDept === dept;
            const deptRecords = payroll.filter(r => r.department === dept);
            return (
              <div key={dept} className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedDept(isOpen ? null : dept)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-900/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-zinc-100 text-sm">{dept}</div>
                      <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Users className="w-3 h-3" /> {count} employees
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="font-bold text-emerald-400 font-mono">{formatINR(total)}</div>
                      <div className="text-xs text-zinc-500">{pct}% of total</div>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                  </div>
                </button>

                {/* Progress bar */}
                <div className="px-5 pb-2">
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Expanded employee list */}
                {isOpen && (
                  <div className="border-t border-zinc-800 divide-y divide-zinc-900">
                    {deptRecords.map(r => (
                      <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-900/20 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{r.employeeName}</p>
                          <p className="text-xs text-zinc-500">{r.position}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${STATUS_BADGE[r.status]}`}>
                            {r.status.toUpperCase()}
                          </span>
                          <span className="font-mono text-sm font-semibold text-emerald-400">{formatINR(r.netPay)}</span>
                          <button onClick={() => setSelectedRecord(r)} className="p-1.5 rounded hover:bg-indigo-500/10 text-indigo-400 transition-colors">
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Payslip Modal */}
      {selectedRecord && (
        <PayslipModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}
    </div>
  );
}
