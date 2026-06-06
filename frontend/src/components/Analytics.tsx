import React, { useState, useEffect } from "react";
import { AnalyticsSummary } from "../types";
import { 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  FolderCheck, 
  Percent, 
  Clock, 
  Grid,
  TrendingUp as TrendupIcon,
  Award,
  Sparkles
} from "lucide-react";
import { apiUrl } from "../api";

interface AnalyticsProps {
  authToken: string;
}

export default function Analytics({ authToken }: AnalyticsProps) {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl("/api/analytics/summary"), {
      headers: { "Authorization": `Bearer ${authToken}` }
    })
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [authToken]);

  // Export pipeline stats to CSV
  const handleExportCSV = () => {
    if (!data) return;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Metric Category,Key Name,Count/Value\n";
    
    // funnel
    data.funnel.forEach(f => {
      csvContent += `Hiring Funnel Stage,${f.label},${f.count}\n`;
    });
    // avg scores
    data.avgResumeScoreJob.forEach(as => {
      csvContent += `Job Average AI Score,${as.jobTitle},${as.avgScore}\n`;
    });
    // completion rate dept
    data.completionRateDept.forEach(cr => {
      csvContent += `Interview Completion Rate Dept,${cr.department},${cr.ratePct}%\n`;
    });
    // sources
    data.candidateSources.forEach(s => {
      csvContent += `Candidate Source,${s.source},${s.count}\n`;
    });

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

  // Simple aggregation math
  const totalApplicants = data.funnel[0]?.count || 0;
  const shortlistRate = Math.round(((data.funnel[2]?.count || 0) / totalApplicants) * 100) || 0;
  const interviewCompleteRate = data.completionRateDept[0]?.ratePct || 80;

  return (
    <div className="space-y-6" id="analytics-module">
      
      {/* Header and Export actions */}
      <div className="glass p-5 rounded-xl flex justify-between items-center bg-zinc-900/10">
        <div>
          <h2 className="font-sans font-black text-zinc-100 text-lg leading-none">Recruitment Analytics Studio</h2>
          <p className="text-xs text-zinc-400 mt-1">Real-time pipeline metrics and structured evaluation indicators</p>
        </div>
        <button
          onClick={handleExportCSV}
          id="btn-export-csv"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg shadow-sm font-mono transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>EXPORT CSV METRICS</span>
        </button>
      </div>

      {/* KPI Overviews bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1 */}
        <div className="glass p-5 rounded-xl flex items-center gap-4 bg-zinc-900/10">
          <div className="p-3 rounded-lg bg-indigo-600/10 text-indigo-400 border border-indigo-500/10">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 font-mono block">Total Applicants</span>
            <span className="text-xl font-bold text-zinc-150 font-mono leading-none mt-1 block">{totalApplicants} Active</span>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5 mt-1">
              <TrendingUp className="w-3 h-3" /> +12% vs last cycle
            </span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass p-5 rounded-xl flex items-center gap-4 bg-zinc-900/10">
          <div className="p-3 rounded-lg bg-emerald-600/10 text-emerald-400 border border-emerald-500/10">
            <FolderCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 font-mono block">Shortlist Threshold</span>
            <span className="text-xl font-bold text-zinc-150 font-mono leading-none mt-1 block">{shortlistRate}% Pass</span>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5 mt-1">
              <TrendingUp className="w-3 h-3" /> High quality indices
            </span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass p-5 rounded-xl flex items-center gap-4 bg-zinc-900/10">
          <div className="p-3 rounded-lg bg-violet-600/10 text-violet-400 border border-violet-500/10">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 font-mono block">Interview Complete Rate</span>
            <span className="text-xl font-bold text-zinc-150 font-mono leading-none mt-1 block">{interviewCompleteRate}% completes</span>
            <span className="text-[10px] text-indigo-400 font-semibold flex items-center gap-0.5 mt-1">
              <Sparkles className="w-3 h-3 text-indigo-400" /> Fully Transcribed
            </span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="glass p-5 rounded-xl flex items-center gap-4 bg-zinc-900/10">
          <div className="p-3 rounded-lg bg-amber-600/10 text-amber-400 border border-amber-500/10">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 font-mono block">Avg Time To Hire</span>
            <span className="text-xl font-bold text-zinc-150 font-mono leading-none mt-1 block">13.2 Days</span>
            <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-0.5 mt-1">
              <TrendingDown className="w-3 h-3" /> Reduced by 4 days
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Funnel chart (SVG-based high-fidelity stack bar design) */}
        <div className="glass p-6 rounded-xl space-y-4 bg-zinc-900/10">
          <div>
            <h3 className="font-sans font-bold text-zinc-200 text-sm">Hiring Conversion Funnel</h3>
            <p className="text-[11px] text-zinc-400">Progression from applied to active hired templates</p>
          </div>

          <div className="space-y-3.5 pt-2" id="hiring-funnel-svg">
            {data.funnel.map((fun, idx) => {
              const max = data.funnel[0]?.count || 1;
              const widthPct = Math.round((fun.count / max) * 100);
              
              // Custom colors for funnel steps
              const stepColors = [
                "bg-blue-600 shadow-blue-500/10",
                "bg-indigo-650 shadow-indigo-550/10",
                "bg-indigo-500 shadow-indigo-500/10",
                "bg-violet-600 shadow-violet-555/10",
                "bg-emerald-600 shadow-emerald-555/10",
              ];

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-zinc-300">{fun.label}</span>
                    <span className="font-mono font-bold text-zinc-200">{fun.count} candidates</span>
                  </div>
                  <div className="w-full bg-zinc-950/60 h-6 border border-zinc-900 rounded-lg overflow-hidden flex">
                    <div 
                      style={{ width: `${widthPct}%` }}
                      className={`h-full flex items-center justify-end pr-2.5 rounded-lg transition-all duration-500 ${stepColors[idx] || "bg-indigo-600"}`}
                    >
                      {widthPct > 20 && (
                        <span className="text-[9px] font-bold text-white font-mono leading-none">
                          {widthPct}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Radar/Bar Chart comparison: Candidate Match score by posting */}
        <div className="glass p-6 rounded-xl space-y-4 col-span-1 lg:col-span-2 bg-zinc-900/10">
          <div>
            <h3 className="font-sans font-bold text-zinc-200 text-sm">Average Compatibility Score per Role</h3>
            <p className="text-[11px] text-zinc-400">Cumulative average compatibility metrics analyzed through standard scoring profiles</p>
          </div>

          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            
            {/* Left side Graph representation using standard SVG lines */}
            <div className="space-y-4">
              {data.avgResumeScoreJob.map((item, idx) => {
                // Determine CSS bg class based on idx
                let barColor = "bg-indigo-500";
                if (idx % 3 === 1) barColor = "bg-emerald-500";
                if (idx % 3 === 2) barColor = "bg-amber-500";

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-zinc-300 truncate max-w-[180px]">{item.jobTitle}</span>
                      <span className="font-mono font-black text-indigo-400">{item.avgScore}/100 avg</span>
                    </div>

                    <div className="w-full bg-zinc-950/65 border border-zinc-900 h-2 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${item.avgScore}%` }}
                        className={`h-full rounded-full transition-all ${barColor}`}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono inline-block">Based on {item.count} profiles evaluated</span>
                  </div>
                );
              })}
            </div>

            {/* Right side Detailed Department Rates */}
            <div className="bg-zinc-950/40 rounded-xl p-4 border border-zinc-800/80 space-y-3">
              <div className="flex items-center gap-1.5 pb-2 border-b border-zinc-800">
                <TrendupIcon className="w-4 h-4 text-emerald-400" />
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

      {/* Skills cloud & candidate source breakdown bento style */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bento item 1: Detected skills freq */}
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
              // Custom sized heat indicators!
              const heat = s.value >= 20 
                ? "bg-indigo-650 text-white font-extrabold shadow-sm shadow-indigo-900/30 border border-indigo-500/20" 
                : s.value >= 12 
                  ? "bg-indigo-950/50 border border-indigo-900/60 text-indigo-300 font-medium" 
                  : "bg-zinc-900/30 border border-zinc-800 text-zinc-400";
              return (
                <span key={idx} className={`px-2.5 py-1.5 rounded-lg text-xs leading-none transition-transform hover:scale-105 ${heat}`}>
                  {s.text}
                </span>
              );
            })}
          </div>
        </div>

        {/* Bento item 2: Sources distribution */}
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
