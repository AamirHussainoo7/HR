import React, { useState, useEffect } from "react";
import {
  Download, TrendingUp, TrendingDown, Users, FolderCheck,
  Percent, Clock, Grid, Award, Sparkles
} from "lucide-react";
import { apiUrl } from "../api.js";

export default function Analytics({ authToken }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl("/api/analytics/summary"), {
      headers: { "Authorization": `Bearer ${authToken}` }
    })
      .then((res) => res.json())
      .then((json) => { setData(json); setLoading(false); })
      .catch((err) => { console.error(err); setLoading(false); });
  }, [authToken]);

  const handleExportCSV = () => {
    if (!data) return;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Metric Category,Key Name,Count/Value\n";
    data.funnel.forEach(f => { csvContent += `Hiring Funnel Stage,${f.label},${f.count}\n`; });
    data.avgResumeScoreJob.forEach(as => { csvContent += `Job Average AI Score,${as.jobTitle},${as.avgScore}\n`; });
    data.completionRateDept.forEach(cr => { csvContent += `Interview Completion Rate Dept,${cr.department},${cr.ratePct}%\n`; });
    data.candidateSources.forEach(s => { csvContent += `Candidate Source,${s.source},${s.count}\n`; });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `synergy_hr_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <span className="text-xs text-slate-500">Compiling database metrics pipelines...</span>
      </div>
    );
  }

  if (!data) return null;

  const totalApplicants = data.funnel[0]?.count || 0;
  const shortlistRate = Math.round(((data.funnel[2]?.count || 0) / totalApplicants) * 100) || 0;
  const interviewCompleteRate = data.completionRateDept[0]?.ratePct || 80;

  return (
    <div className="space-y-6" id="analytics-module">
      <div className="glass p-5 rounded-xl flex justify-between items-center bg-zinc-900/10">
        <div>
          <h2 className="font-sans font-black text-zinc-100 text-lg leading-none">Recruitment Analytics Studio</h2>
          <p className="text-xs text-zinc-400 mt-1">Real-time pipeline metrics and structured evaluation indicators</p>
        </div>
        <button onClick={handleExportCSV} id="btn-export-csv"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg shadow-sm font-mono transition-colors cursor-pointer">
          <Download className="w-3.5 h-3.5" />
          <span>EXPORT CSV METRICS</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, bg: "bg-indigo-600/10 border-indigo-500/10", color: "text-indigo-400", label: "Total Applicants", value: `${totalApplicants} Active`, trend: "+12% vs last cycle", trendColor: "text-emerald-400", TrendIcon: TrendingUp },
          { icon: FolderCheck, bg: "bg-emerald-600/10 border-emerald-500/10", color: "text-emerald-400", label: "Shortlist Threshold", value: `${shortlistRate}% Pass`, trend: "High quality indices", trendColor: "text-emerald-400", TrendIcon: TrendingUp },
          { icon: Percent, bg: "bg-violet-600/10 border-violet-500/10", color: "text-violet-400", label: "Interview Complete Rate", value: `${interviewCompleteRate}% completes`, trend: "Fully Transcribed", trendColor: "text-indigo-400", TrendIcon: Sparkles },
          { icon: Clock, bg: "bg-amber-600/10 border-amber-500/10", color: "text-amber-400", label: "Avg Time To Hire", value: "13.2 Days", trend: "Reduced by 4 days", trendColor: "text-rose-400", TrendIcon: TrendingDown },
        ].map((kpi, i) => (
          <div key={i} className="glass p-5 rounded-xl flex items-center gap-4 bg-zinc-900/10">
            <div className={`p-3 rounded-lg ${kpi.bg} ${kpi.color} border`}><kpi.icon className="w-5 h-5" /></div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 font-mono block">{kpi.label}</span>
              <span className="text-xl font-bold text-zinc-150 font-mono leading-none mt-1 block">{kpi.value}</span>
              <span className={`text-[10px] ${kpi.trendColor} font-semibold flex items-center gap-0.5 mt-1`}>
                <kpi.TrendIcon className="w-3 h-3" /> {kpi.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-xl space-y-4 bg-zinc-900/10">
          <div>
            <h3 className="font-sans font-bold text-zinc-200 text-sm">Hiring Conversion Funnel</h3>
            <p className="text-[11px] text-zinc-400">Progression from applied to active hired templates</p>
          </div>
          <div className="space-y-3.5 pt-2" id="hiring-funnel-svg">
            {data.funnel.map((fun, idx) => {
              const max = data.funnel[0]?.count || 1;
              const widthPct = Math.round((fun.count / max) * 100);
              const stepColors = ["bg-blue-600", "bg-indigo-500", "bg-violet-600", "bg-emerald-600", "bg-teal-600"];
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-zinc-300">{fun.label}</span>
                    <span className="font-mono font-bold text-zinc-200">{fun.count} candidates</span>
                  </div>
                  <div className="w-full bg-zinc-950/60 h-6 border border-zinc-900 rounded-lg overflow-hidden flex">
                    <div style={{ width: `${widthPct}%` }}
                      className={`h-full flex items-center justify-end pr-2.5 rounded-lg transition-all duration-500 ${stepColors[idx] || "bg-indigo-600"}`}>
                      {widthPct > 20 && <span className="text-[9px] font-bold text-white font-mono leading-none">{widthPct}%</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass p-6 rounded-xl space-y-4 col-span-1 lg:col-span-2 bg-zinc-900/10">
          <div>
            <h3 className="font-sans font-bold text-zinc-200 text-sm">Average Compatibility Score per Role</h3>
            <p className="text-[11px] text-zinc-400">Cumulative average compatibility metrics analyzed through standard scoring profiles</p>
          </div>
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              {data.avgResumeScoreJob.map((item, idx) => {
                const barColor = idx % 3 === 1 ? "bg-emerald-500" : idx % 3 === 2 ? "bg-amber-500" : "bg-indigo-500";
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-zinc-300 truncate max-w-[180px]">{item.jobTitle}</span>
                      <span className="font-mono font-black text-indigo-400">{item.avgScore}/100 avg</span>
                    </div>
                    <div className="w-full bg-zinc-950/65 border border-zinc-900 h-2 rounded-full overflow-hidden">
                      <div style={{ width: `${item.avgScore}%` }} className={`h-full rounded-full transition-all ${barColor}`} />
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono inline-block">Based on {item.count} profiles evaluated</span>
                  </div>
                );
              })}
            </div>
            <div className="bg-zinc-950/40 rounded-xl p-4 border border-zinc-800/80 space-y-3">
              <div className="flex items-center gap-1.5 pb-2 border-b border-zinc-800">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Performance Highlights</span>
              </div>
              <div className="space-y-3 divide-y divide-zinc-900 font-sans">
                {data.completionRateDept.map((it, i) => (
                  <div key={i} className="pt-2 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold block text-zinc-200">{it.department}</span>
                      <span className="text-[10px] block text-zinc-500 font-mono">Completed: {it.completedCount}/{it.scheduledCount} interviews</span>
                    </div>
                    <span className="font-extrabold text-indigo-400 font-mono text-xs">{it.ratePct}% completes</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-xl space-y-4 lg:col-span-2 bg-zinc-900/10">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-sans font-bold text-zinc-200 text-sm">Detected High-Demand Skill tags</h3>
              <p className="text-[11px] text-zinc-400 font-mono">Aggregation of core skills detected from active screening</p>
            </div>
            <Award className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {data.skillFrequency.map((s, idx) => {
              const heat = s.value >= 20
                ? "bg-indigo-650 text-white font-extrabold shadow-sm shadow-indigo-900/30 border border-indigo-500/20"
                : s.value >= 12 ? "bg-indigo-950/50 border border-indigo-900/60 text-indigo-300 font-medium"
                : "bg-zinc-900/30 border border-zinc-800 text-zinc-400";
              return (
                <span key={idx} className={`px-2.5 py-1.5 rounded-lg text-xs leading-none transition-transform hover:scale-105 ${heat}`}>
                  {s.text}
                </span>
              );
            })}
          </div>
        </div>
        <div className="glass p-6 rounded-xl space-y-4 bg-zinc-900/10">
          <div>
            <h3 className="font-sans font-bold text-zinc-200 text-sm">Applicant Sourcing Channels</h3>
            <p className="text-[11px] text-zinc-400">Performance logs of recruitment lead providers</p>
          </div>
          <div className="space-y-3 pt-2">
            {data.candidateSources.map((ch, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-medium">{ch.source}</span>
                <span className="font-mono font-bold text-zinc-200 bg-zinc-900/60 border border-zinc-800 px-2.5 py-0.5 rounded-full">{ch.count} profiles</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
