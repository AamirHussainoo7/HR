import React, { useState, useEffect } from "react";
import {
  TrendingUp, Target, Star, MessageSquare, Plus, X, CheckCircle,
  AlertCircle, ChevronRight, Award, BarChart3, Edit2, Clock, Flag
} from "lucide-react";
import { apiUrl } from "../api.js";

const REVIEW_STATUS = {
  draft: "text-zinc-400 bg-zinc-800/60 border-zinc-700",
  in_review: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  completed: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

const GOAL_STATUS = {
  not_started: "text-zinc-500 bg-zinc-800/40 border-zinc-700",
  in_progress: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  achieved: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  missed: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

function RatingStars({ rating, max = 5, color = "text-yellow-400" }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < Math.round(rating) ? `${color} fill-current` : "text-zinc-700"}`} />
      ))}
      <span className="ml-1.5 text-sm font-bold text-zinc-300">{rating.toFixed(1)}</span>
    </div>
  );
}

function RatingInput({ value, onChange, label }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">{label}</label>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map(star => (
          <button key={star} type="button" onClick={() => onChange(star)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${star <= value ? "bg-yellow-500/20 border border-yellow-500/40 text-yellow-400" : "bg-zinc-800 border border-zinc-700 text-zinc-600 hover:text-zinc-400"}`}>
            <Star className={`w-4 h-4 ${star <= value ? "fill-current" : ""}`} />
          </button>
        ))}
        <span className="text-sm font-bold text-zinc-400 ml-1">{value}/5</span>
      </div>
    </div>
  );
}

function ProgressRing({ progress, size = 64, stroke = 6, color = "#6366f1" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (progress / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#27272a" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }} />
    </svg>
  );
}

function getAvatarColor(name) {
  const colors = ["from-indigo-600 to-purple-600", "from-cyan-600 to-blue-600", "from-rose-600 to-pink-600",
    "from-emerald-600 to-teal-600", "from-amber-600 to-orange-600"];
  return colors[name.charCodeAt(0) % colors.length];
}

function getInitials(name) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function PerformanceTracking({ authToken, userRole, userName }) {
  const isHR = ["superadmin", "hr_manager"].includes(userRole);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showNewReviewModal, setShowNewReviewModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ rating: 3, strengths: "", improvements: "" });
  const [newReviewForm, setNewReviewForm] = useState({ employeeId: "", employeeName: "", department: "", position: "", reviewPeriod: "", reviewCycle: "quarterly" });
  const [ratingForm, setRatingForm] = useState({ selfRating: 0, managerRating: 0 });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const endpoint = isHR ? apiUrl("/api/performance") : apiUrl("/api/performance/my");
      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.ok) {
        const data = await res.json();
        setReviews(Array.isArray(data) ? data : [data]);
      }
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReviews(); }, []);

  const handleCreateReview = async (e) => {
    e.preventDefault(); setError("");
    try {
      const res = await fetch(apiUrl("/api/performance/review"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(newReviewForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess("Performance review created!");
      setShowNewReviewModal(false); fetchReviews();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) { setError(err.message); }
  };

  const handleUpdateRatings = async (review) => {
    try {
      const res = await fetch(apiUrl(`/api/performance/${review.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(ratingForm),
      });
      const data = await res.json();
      if (res.ok) { setSelectedReview(data.review); fetchReviews(); }
    } catch {}
  };

  const handleUpdateGoalProgress = async (review, goalId, progress, status) => {
    const updatedGoals = review.goals.map(g => g.id === goalId ? { ...g, progress, status } : g);
    try {
      const res = await fetch(apiUrl(`/api/performance/${review.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ goals: updatedGoals }),
      });
      const data = await res.json();
      if (res.ok) { setSelectedReview(data.review); fetchReviews(); }
    } catch {}
  };

  const handleSubmitFeedback = async (reviewId) => {
    try {
      const res = await fetch(apiUrl(`/api/performance/${reviewId}/feedback`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(feedbackForm),
      });
      if (res.ok) { setSuccess("Feedback submitted!"); setShowFeedbackModal(false); fetchReviews(); setTimeout(() => setSuccess(""), 3000); }
    } catch {}
  };

  const overallAvg = reviews.reduce((s, r) => s + r.overallRating, 0) / (reviews.length || 1);
  const completedCount = reviews.filter(r => r.status === "completed").length;
  const goalsAchieved = reviews.flatMap(r => r.goals).filter(g => g.status === "achieved").length;
  const totalGoals = reviews.flatMap(r => r.goals).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-purple-400" /> Performance Tracking
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Track goals, review cycles, ratings, and 360° feedback</p>
        </div>
        {isHR && (
          <button id="btn-new-review" onClick={() => setShowNewReviewModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600/20 border border-purple-500/20 text-purple-400 text-sm font-semibold hover:bg-purple-600/30 transition-all">
            <Plus className="w-4 h-4" /> New Review
          </button>
        )}
      </div>

      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Avg Rating", value: overallAvg.toFixed(1) + " / 5", color: "text-yellow-400", bg: "bg-yellow-500/10", icon: Star },
          { label: "Completed Reviews", value: `${completedCount} / ${reviews.length}`, color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle },
          { label: "Goals Achieved", value: `${goalsAchieved} / ${totalGoals}`, color: "text-indigo-400", bg: "bg-indigo-500/10", icon: Target },
          { label: "Active Reviews", value: reviews.filter(r => r.status === "in_review").length, color: "text-amber-400", bg: "bg-amber-500/10", icon: Clock },
        ].map(stat => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center ${stat.color} mb-2`}><stat.icon className="w-4 h-4" /></div>
            <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 animate-pulse space-y-4">
              <div className="flex items-center gap-4"><div className="w-14 h-14 rounded-xl bg-zinc-800" /><div className="flex-1 space-y-2"><div className="h-4 bg-zinc-800 rounded w-1/3" /><div className="h-3 bg-zinc-800 rounded w-1/4" /></div></div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No performance reviews found</p>
          {isHR && <p className="text-sm mt-1">Start by creating a performance review for an employee.</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => {
            const goalsPct = review.goals.length > 0 ? Math.round(review.goals.reduce((s, g) => s + g.progress, 0) / review.goals.length) : 0;
            return (
              <div key={review.id} onClick={() => { setSelectedReview(review); setRatingForm({ selfRating: review.selfRating, managerRating: review.managerRating }); }}
                className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all cursor-pointer">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getAvatarColor(review.employeeName)} flex items-center justify-center text-white font-bold shadow-lg`}>{getInitials(review.employeeName)}</div>
                    <div>
                      <h3 className="font-bold text-zinc-100">{review.employeeName}</h3>
                      <p className="text-xs text-zinc-500">{review.position} · {review.department}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{review.reviewPeriod}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${REVIEW_STATUS[review.status]}`}>{review.status.replace("_", " ").toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="relative flex items-center justify-center">
                        <ProgressRing progress={goalsPct} size={56} stroke={5} color="#8b5cf6" />
                        <span className="absolute text-xs font-bold text-purple-400">{goalsPct}%</span>
                      </div>
                      <p className="text-[10px] text-zinc-600 mt-1">Goals</p>
                    </div>
                    <div><p className="text-xs text-zinc-600 mb-1">Overall Rating</p><RatingStars rating={review.overallRating} /></div>
                  </div>
                </div>
                {review.goals.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {review.goals.slice(0, 2).map(goal => (
                      <div key={goal.id} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-zinc-400 truncate">{goal.title}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${GOAL_STATUS[goal.status]}`}>{goal.status.replace("_", " ")}</span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500" style={{ width: `${goal.progress}%` }} />
                          </div>
                        </div>
                        <span className="text-xs text-zinc-500 w-8 text-right">{goal.progress}%</span>
                      </div>
                    ))}
                    {review.goals.length > 2 && <p className="text-xs text-zinc-600">+{review.goals.length - 2} more goals</p>}
                  </div>
                )}
                {review.feedback.length > 0 && (
                  <div className="mt-4 flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5 text-zinc-600" /><span className="text-xs text-zinc-600">{review.feedback.length} feedback entries</span></div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={() => setSelectedReview(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-xl h-full bg-[#0f0f0f] border-l border-zinc-800 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-zinc-100">Performance Review</h3>
              <button onClick={() => setSelectedReview(null)} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex gap-1 p-4 border-b border-zinc-800">
              {["overview", "goals", "feedback"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${activeTab === tab ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getAvatarColor(selectedReview.employeeName)} flex items-center justify-center text-white font-bold text-lg shadow-xl`}>{getInitials(selectedReview.employeeName)}</div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-100">{selectedReview.employeeName}</h2>
                  <p className="text-sm text-zinc-500">{selectedReview.position} · {selectedReview.department}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{selectedReview.reviewPeriod}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${REVIEW_STATUS[selectedReview.status]}`}>{selectedReview.status.replace("_", " ").toUpperCase()}</span>
                  </div>
                </div>
              </div>

              {activeTab === "overview" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Self Rating", value: selectedReview.selfRating, color: "text-blue-400" },
                      { label: "Manager Rating", value: selectedReview.managerRating, color: "text-indigo-400" },
                      { label: "Overall", value: selectedReview.overallRating, color: "text-yellow-400" },
                    ].map(r => (
                      <div key={r.label} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">{r.label}</p>
                        <p className={`text-2xl font-bold ${r.color}`}>{r.value.toFixed(1)}</p>
                        <div className="flex justify-center mt-1">{[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-2.5 h-2.5 ${s <= Math.round(r.value) ? `${r.color} fill-current` : "text-zinc-700"}`} />)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-4">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Update Ratings</p>
                    <RatingInput value={ratingForm.selfRating} onChange={v => setRatingForm(f => ({ ...f, selfRating: v }))} label="Self Rating" />
                    {isHR && <RatingInput value={ratingForm.managerRating} onChange={v => setRatingForm(f => ({ ...f, managerRating: v }))} label="Manager Rating" />}
                    <button onClick={() => handleUpdateRatings(selectedReview)} className="w-full py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 text-sm font-medium hover:bg-indigo-600/30 transition-colors">Save Ratings</button>
                  </div>
                  {selectedReview.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Strengths</p>
                      <div className="flex flex-wrap gap-1.5">{selectedReview.strengths.map((s, i) => <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">{s}</span>)}</div>
                    </div>
                  )}
                  {selectedReview.areasForImprovement.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Areas for Improvement</p>
                      <div className="flex flex-wrap gap-1.5">{selectedReview.areasForImprovement.map((a, i) => <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">{a}</span>)}</div>
                    </div>
                  )}
                  <button onClick={() => setShowFeedbackModal(true)} className="w-full py-2.5 rounded-lg bg-purple-600/20 border border-purple-500/20 text-purple-400 text-sm font-semibold hover:bg-purple-600/30 transition-colors flex items-center justify-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Submit 360° Feedback
                  </button>
                </div>
              )}

              {activeTab === "goals" && (
                <div className="space-y-4">
                  {selectedReview.goals.map(goal => (
                    <div key={goal.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-200">{goal.title}</h4>
                          {goal.description && <p className="text-xs text-zinc-500 mt-0.5">{goal.description}</p>}
                          {goal.targetDate && <div className="flex items-center gap-1 mt-1 text-xs text-zinc-600"><Flag className="w-3 h-3" />Due: {new Date(goal.targetDate).toLocaleDateString()}</div>}
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 ${GOAL_STATUS[goal.status]}`}>{goal.status.replace("_", " ")}</span>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500" style={{ width: `${goal.progress}%` }} />
                        </div>
                        <span className="text-xs text-zinc-400 w-8 text-right font-mono">{goal.progress}%</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {[0, 25, 50, 75, 100].map(pct => (
                          <button key={pct} onClick={() => { const status = pct === 100 ? "achieved" : pct === 0 ? "not_started" : "in_progress"; handleUpdateGoalProgress(selectedReview, goal.id, pct, status); }}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${goal.progress === pct ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-400" : "border-zinc-700 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400"}`}>
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {selectedReview.goals.length === 0 && <div className="text-center py-8 text-zinc-500"><Target className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No goals set for this review</p></div>}
                </div>
              )}

              {activeTab === "feedback" && (
                <div className="space-y-4">
                  {selectedReview.feedback.map(fb => (
                    <div key={fb.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div><span className="text-sm font-semibold text-zinc-200">{fb.from}</span><span className="ml-2 text-xs text-zinc-600">{fb.fromRole.replace("_", " ")}</span></div>
                        <RatingStars rating={fb.rating} />
                      </div>
                      {fb.strengths && <div className="mb-2"><p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider mb-0.5">Strengths</p><p className="text-xs text-zinc-400">{fb.strengths}</p></div>}
                      {fb.improvements && <div><p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider mb-0.5">Areas to Improve</p><p className="text-xs text-zinc-400">{fb.improvements}</p></div>}
                      <p className="text-xs text-zinc-600 mt-2">{new Date(fb.submittedAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                  {selectedReview.feedback.length === 0 && <div className="text-center py-8 text-zinc-500"><MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No feedback submitted yet</p></div>}
                  <button onClick={() => setShowFeedbackModal(true)} className="w-full py-2.5 rounded-lg bg-purple-600/20 border border-purple-500/20 text-purple-400 text-sm font-semibold hover:bg-purple-600/30 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Add Feedback
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showNewReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowNewReviewModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-[#0f0f0f] border border-zinc-800 rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-zinc-100">New Performance Review</h3>
              <button onClick={() => setShowNewReviewModal(false)} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreateReview} className="p-6 space-y-4">
              {error && <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}
              {[
                { key: "employeeId", label: "Employee ID *", placeholder: "emp1" },
                { key: "employeeName", label: "Employee Name *", placeholder: "Jane Doe" },
                { key: "department", label: "Department", placeholder: "Engineering" },
                { key: "position", label: "Position", placeholder: "Senior Engineer" },
                { key: "reviewPeriod", label: "Review Period *", placeholder: "Q2 2026" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">{f.label}</label>
                  <input type="text" placeholder={f.placeholder} value={newReviewForm[f.key]}
                    onChange={e => setNewReviewForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500/50" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Review Cycle</label>
                <select value={newReviewForm.reviewCycle} onChange={e => setNewReviewForm(f => ({ ...f, reviewCycle: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-purple-500/50">
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                  <option value="probation">Probation</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNewReviewModal(false)} className="flex-1 py-2.5 rounded-lg border border-zinc-800 text-zinc-400 text-sm font-medium hover:bg-zinc-900 transition-colors">Cancel</button>
                <button type="submit" id="btn-create-review" className="flex-1 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors">Create Review</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFeedbackModal && selectedReview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setShowFeedbackModal(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-[#0f0f0f] border border-zinc-800 rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-zinc-100">360° Feedback</h3>
              <button onClick={() => setShowFeedbackModal(false)} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <RatingInput value={feedbackForm.rating} onChange={v => setFeedbackForm(f => ({ ...f, rating: v }))} label="Overall Rating *" />
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Strengths</label>
                <textarea value={feedbackForm.strengths} onChange={e => setFeedbackForm(f => ({ ...f, strengths: e.target.value }))}
                  rows={2} placeholder="What does this person do exceptionally well?"
                  className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Areas to Improve</label>
                <textarea value={feedbackForm.improvements} onChange={e => setFeedbackForm(f => ({ ...f, improvements: e.target.value }))}
                  rows={2} placeholder="What could they improve or do differently?"
                  className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowFeedbackModal(false)} className="flex-1 py-2.5 rounded-lg border border-zinc-800 text-zinc-400 text-sm font-medium hover:bg-zinc-900 transition-colors">Cancel</button>
                <button id="btn-submit-feedback" onClick={() => handleSubmitFeedback(selectedReview.id)} className="flex-1 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors">Submit Feedback</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
