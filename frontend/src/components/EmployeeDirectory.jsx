import React, { useState, useEffect } from "react";
import {
  Users, Plus, Search, Edit2, Trash2, X, Check, MapPin,
  Phone, Mail, Briefcase, Calendar, DollarSign, Shield,
  ChevronDown, AlertCircle, Building2, UserCheck
} from "lucide-react";
import { apiUrl } from "../api.js";

const STATUS_COLORS = {
  active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  probation: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  on_leave: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  terminated: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

const CONTRACT_LABELS = {
  full_time: "Full-Time", part_time: "Part-Time",
  contract: "Contract", intern: "Intern",
};

const DEPT_COLORS = {
  Engineering: "text-indigo-400 bg-indigo-500/10",
  "Human Resources": "text-pink-400 bg-pink-500/10",
  Product: "text-purple-400 bg-purple-500/10",
  Operations: "text-cyan-400 bg-cyan-500/10",
  Finance: "text-yellow-400 bg-yellow-500/10",
  Marketing: "text-orange-400 bg-orange-500/10",
};

const DEPARTMENTS = ["Engineering", "Human Resources", "Product", "Operations", "Finance", "Marketing"];

const defaultForm = {
  name: "", email: "", phone: "", position: "", department: "Engineering",
  contractType: "full_time", salary: "", currency: "INR",
  location: "", hireDate: "", managerName: "",
  emergencyContactName: "", emergencyContactRelationship: "", emergencyContactPhone: "",
  skills: "",
};

function getInitials(name) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(name) {
  const colors = [
    "from-indigo-600 to-purple-600", "from-cyan-600 to-blue-600",
    "from-rose-600 to-pink-600", "from-emerald-600 to-teal-600",
    "from-amber-600 to-orange-600", "from-violet-600 to-fuchsia-600",
  ];
  return colors[name.charCodeAt(0) % colors.length];
}

export default function EmployeeDirectory({ employees, userRole, authToken, onRefresh }) {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManage = ["superadmin", "hr_manager"].includes(userRole);

  const filtered = employees.filter(emp => {
    const matchSearch = emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.position.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "All" || emp.department === deptFilter;
    const matchStatus = statusFilter === "All" || emp.employmentStatus === statusFilter;
    return matchSearch && matchDept && matchStatus;
  });

  const openAdd = () => { setEditEmployee(null); setForm(defaultForm); setError(""); setShowModal(true); };

  const openEdit = (emp) => {
    setEditEmployee(emp);
    setForm({
      name: emp.name, email: emp.email, phone: emp.phone || "",
      position: emp.position, department: emp.department,
      contractType: emp.contractType, salary: String(emp.salary),
      currency: emp.currency || "INR", location: emp.location || "",
      hireDate: emp.hireDate ? emp.hireDate.split("T")[0] : "",
      managerName: emp.managerName || "",
      emergencyContactName: emp.emergencyContact?.name || "",
      emergencyContactRelationship: emp.emergencyContact?.relationship || "",
      emergencyContactPhone: emp.emergencyContact?.phone || "",
      skills: (emp.skills || []).join(", "),
    });
    setError(""); setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const payload = {
        name: form.name, email: form.email, phone: form.phone,
        position: form.position, department: form.department,
        contractType: form.contractType, salary: Number(form.salary),
        currency: form.currency, location: form.location,
        hireDate: form.hireDate ? new Date(form.hireDate).toISOString() : new Date().toISOString(),
        managerName: form.managerName,
        skills: form.skills.split(",").map(s => s.trim()).filter(Boolean),
        emergencyContact: {
          name: form.emergencyContactName,
          relationship: form.emergencyContactRelationship,
          phone: form.emergencyContactPhone,
        },
      };
      const url = editEmployee ? apiUrl(`/api/employees/${editEmployee.id}`) : apiUrl("/api/employees");
      const method = editEmployee ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save employee.");
      setSuccess(editEmployee ? "Employee updated successfully!" : "Employee added successfully!");
      setShowModal(false); onRefresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (emp) => {
    if (!window.confirm(`Remove ${emp.name} from the directory?`)) return;
    try {
      const res = await fetch(apiUrl(`/api/employees/${emp.id}`), {
        method: "DELETE", headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) { onRefresh(); setSelectedEmployee(null); }
    } catch {}
  };

  const activeCount = employees.filter(e => e.employmentStatus === "active").length;
  const onLeaveCount = employees.filter(e => e.employmentStatus === "on_leave").length;
  const deptCount = new Set(employees.map(e => e.department)).size;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" /> Employee Directory
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Manage and view all employee profiles across departments</p>
        </div>
        {canManage && (
          <button id="btn-add-employee" onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-indigo-500/20">
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        )}
      </div>

      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <Check className="w-4 h-4" /> {success}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Employees", value: employees.length, color: "text-indigo-400", icon: Users },
          { label: "Active", value: activeCount, color: "text-emerald-400", icon: UserCheck },
          { label: "On Leave", value: onLeaveCount, color: "text-blue-400", icon: Calendar },
          { label: "Departments", value: deptCount, color: "text-purple-400", icon: Building2 },
        ].map(stat => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-zinc-800 ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-zinc-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input type="text" placeholder="Search by name, email, or position..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50" />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50">
          <option value="All">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50">
          <option value="All">All Statuses</option>
          <option value="active">Active</option>
          <option value="probation">Probation</option>
          <option value="on_leave">On Leave</option>
          <option value="terminated">Terminated</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(emp => (
          <div key={emp.id} onClick={() => setSelectedEmployee(emp)}
            className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all cursor-pointer group">
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarColor(emp.name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg`}>
                {getInitials(emp.name)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-zinc-100 truncate group-hover:text-indigo-300 transition-colors">{emp.name}</h3>
                <p className="text-xs text-zinc-500 truncate">{emp.position}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${STATUS_COLORS[emp.employmentStatus]}`}>
                    {emp.employmentStatus.replace("_", " ").toUpperCase()}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${DEPT_COLORS[emp.department] || "text-zinc-400 bg-zinc-800"}`}>
                    {emp.department}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-zinc-500"><Mail className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{emp.email}</span></div>
              {emp.phone && <div className="flex items-center gap-2 text-xs text-zinc-500"><Phone className="w-3.5 h-3.5 flex-shrink-0" /><span>{emp.phone}</span></div>}
              {emp.location && <div className="flex items-center gap-2 text-xs text-zinc-500"><MapPin className="w-3.5 h-3.5 flex-shrink-0" /><span>{emp.location}</span></div>}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-zinc-500"><Briefcase className="w-3.5 h-3.5" /><span>{CONTRACT_LABELS[emp.contractType]}</span></div>
              {canManage && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(emp)} className="p-1.5 rounded hover:bg-indigo-500/10 text-zinc-500 hover:text-indigo-400 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  {userRole === "superadmin" && (
                    <button onClick={() => handleDelete(emp)} className="p-1.5 rounded hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              )}
            </div>
            {emp.skills && emp.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {emp.skills.slice(0, 3).map(skill => <span key={skill} className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">{skill}</span>)}
                {emp.skills.length > 3 && <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-500">+{emp.skills.length - 3}</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-zinc-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No employees found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={() => setSelectedEmployee(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-md h-full bg-[#0f0f0f] border-l border-zinc-800 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-zinc-100">Employee Profile</h3>
              <button onClick={() => setSelectedEmployee(null)} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getAvatarColor(selectedEmployee.name)} flex items-center justify-center text-white font-bold text-xl shadow-xl`}>
                  {getInitials(selectedEmployee.name)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-100">{selectedEmployee.name}</h2>
                  <p className="text-sm text-zinc-400">{selectedEmployee.position}</p>
                  <span className={`mt-1 inline-block text-[10px] px-2 py-0.5 rounded border font-medium ${STATUS_COLORS[selectedEmployee.employmentStatus]}`}>
                    {selectedEmployee.employmentStatus.replace("_", " ").toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Department", value: selectedEmployee.department, icon: Building2 },
                  { label: "Contract", value: CONTRACT_LABELS[selectedEmployee.contractType], icon: Briefcase },
                  { label: "Location", value: selectedEmployee.location, icon: MapPin },
                  { label: "Hire Date", value: selectedEmployee.hireDate ? new Date(selectedEmployee.hireDate).toLocaleDateString() : "N/A", icon: Calendar },
                  { label: "Salary", value: `₹${selectedEmployee.salary?.toLocaleString("en-IN")}/yr`, icon: DollarSign },
                  { label: "Manager", value: selectedEmployee.managerName || "N/A", icon: Shield },
                ].map(item => (
                  <div key={item.label} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-zinc-500 mb-1"><item.icon className="w-3.5 h-3.5" /><span className="text-[10px] uppercase tracking-wider font-semibold">{item.label}</span></div>
                    <p className="text-sm font-medium text-zinc-200">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Contact</p>
                <div className="flex items-center gap-2 text-sm text-zinc-300"><Mail className="w-4 h-4 text-zinc-500" />{selectedEmployee.email}</div>
                {selectedEmployee.phone && <div className="flex items-center gap-2 text-sm text-zinc-300"><Phone className="w-4 h-4 text-zinc-500" />{selectedEmployee.phone}</div>}
              </div>
              {selectedEmployee.skills && selectedEmployee.skills.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEmployee.skills.map(skill => <span key={skill} className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">{skill}</span>)}
                  </div>
                </div>
              )}
              {selectedEmployee.emergencyContact?.name && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Emergency Contact</p>
                  <p className="text-sm font-medium text-zinc-200">{selectedEmployee.emergencyContact.name}</p>
                  <p className="text-xs text-zinc-500">{selectedEmployee.emergencyContact.relationship} · {selectedEmployee.emergencyContact.phone}</p>
                </div>
              )}
              {canManage && (
                <div className="flex gap-2 pt-2">
                  <button onClick={() => { openEdit(selectedEmployee); setSelectedEmployee(null); }} className="flex-1 py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 text-sm font-medium hover:bg-indigo-600/30 transition-colors">Edit Profile</button>
                  {userRole === "superadmin" && <button onClick={() => handleDelete(selectedEmployee)} className="flex-1 py-2 rounded-lg bg-rose-600/10 border border-rose-500/20 text-rose-400 text-sm font-medium hover:bg-rose-600/20 transition-colors">Remove</button>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-2xl bg-[#0f0f0f] border border-zinc-800 rounded-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-zinc-100 text-lg">{editEmployee ? "Edit Employee Profile" : "Add New Employee"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Full Name *", key: "name", type: "text", placeholder: "Jane Doe" },
                  { label: "Email *", key: "email", type: "email", placeholder: "jane@company.com" },
                  { label: "Phone", key: "phone", type: "tel", placeholder: "+91 9876543210" },
                  { label: "Position *", key: "position", type: "text", placeholder: "Senior Engineer" },
                  { label: "Annual Salary (₹) *", key: "salary", type: "number", placeholder: "800000" },
                  { label: "Location", key: "location", type: "text", placeholder: "Mumbai, MH" },
                  { label: "Manager Name", key: "managerName", type: "text", placeholder: "Alice Smith" },
                  { label: "Hire Date", key: "hireDate", type: "date", placeholder: "" },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">{field.label}</label>
                    <input type={field.type} placeholder={field.placeholder} value={form[field.key]}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Department *</label>
                  <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50">
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Contract Type</label>
                  <select value={form.contractType} onChange={e => setForm(f => ({ ...f, contractType: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50">
                    {Object.entries(CONTRACT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Skills (comma separated)</label>
                <input type="text" placeholder="React, Node.js, Python" value={form.skills}
                  onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50" />
              </div>
              <div className="border-t border-zinc-800 pt-4">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Emergency Contact (optional)</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { key: "emergencyContactName", label: "Name", placeholder: "John Doe" },
                    { key: "emergencyContactRelationship", label: "Relationship", placeholder: "Spouse" },
                    { key: "emergencyContactPhone", label: "Phone", placeholder: "+91 9876543210" },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs text-zinc-600 mb-1">{f.label}</label>
                      <input type="text" placeholder={f.placeholder} value={form[f.key]}
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg border border-zinc-800 text-zinc-400 text-sm font-medium hover:bg-zinc-900 transition-colors">Cancel</button>
                <button id="btn-save-employee" type="submit" disabled={loading}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                  {loading ? "Saving..." : editEmployee ? "Save Changes" : "Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
