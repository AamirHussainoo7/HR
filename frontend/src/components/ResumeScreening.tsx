import React, { useState } from "react";
import { Resume } from "../types";
import { 
  UploadCloud, 
  FileCheck, 
  AlertTriangle, 
  Sparkles, 
  Search, 
  Trash2, 
  FileText, 
  Check, 
  X, 
  Loader2,
  ChevronRight,
  Filter
} from "lucide-react";

interface ResumeScreeningProps {
  resumes: Resume[];
  authToken: string;
  onRefresh: () => void;
}

export default function ResumeScreening({ resumes, authToken, onRefresh }: ResumeScreeningProps) {
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [screeningId, setScreeningId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [recommendationFilter, setRecommendationFilter] = useState<string>("all");
  
  // Bulkuploader state
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("Senior Frontend Engineer");
  const [resumeTextContent, setResumeTextContent] = useState("");

  const handleCreateResume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName || !candidateEmail || !resumeTextContent) return;
    setUploading(true);

    try {
      const response = await fetch("/api/resumes/bulk-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          jobId: "j_" + Math.random().toString(36).substr(2, 5),
          jobTitle,
          resumes: [{ candidateName, email: candidateEmail, textContent: resumeTextContent }]
        })
      });

      if (response.ok) {
        setCandidateName("");
        setCandidateEmail("");
        setResumeTextContent("");
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleTriggerScreen = async (id: string) => {
    setScreeningId(id);
    try {
      const response = await fetch(`/api/resumes/screen/${id}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        onRefresh();
        if (selectedResume && selectedResume.id === id) {
          setSelectedResume(data.resume);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setScreeningId(null);
    }
  };

  const handleDeleteResume = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this candidate evaluation?")) return;
    try {
      const response = await fetch(`/api/resumes/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });
      if (response.ok) {
        if (selectedResume?.id === id) setSelectedResume(null);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkAction = async (rec: "shortlist" | "reject") => {
    const pendingResumes = filteredResumes.filter(r => r.status === "pending");
    if (pendingResumes.length === 0) {
      alert("No pending profiles found for bulk updates in the selected range.");
      return;
    }
    
    setUploading(true);
    // Process each resume in sequence to avoid timeouts
    for (const res of pendingResumes) {
      try {
        await fetch(`/api/resumes/screen/${res.id}`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${authToken}` }
        });
      } catch (e) {
        console.error(e);
      }
    }
    setUploading(false);
    onRefresh();
  };

  // Sample quick resume generation preset to speed up tester review
  const loadDemoResumeText = (prof: string) => {
    if (prof === "frontend") {
      setCandidateName("Liam Neeson");
      setCandidateEmail("liam@neeson.com");
      setJobTitle("Senior Frontend Engineer");
      setResumeTextContent("LIAM NEESON - ADVANCED FRONTEND DEVELOPER.\n- Built robust design systems using React, Vite, and Tailwind CSS.\n- Over 6 years of pure JavaScript & TypeScript mastery.\n- Optimized web packages reducing start bundle delay by 45%.\n- Integrated REST and WebSocket pipelines.");
    } else {
      setCandidateName("Ada Lovelace");
      setCandidateEmail("ada@lovelace.org");
      setJobTitle("AI Specialist");
      setResumeTextContent("ADA LOVELACE - SPECIALIST AI ARCHITECT.\n- Developed deep machine learning pipelines using PyTorch and Python.\n- Rigorous design of grounding vector embeddings.\n- Custom fine-tuned Gemini model configs for intelligent automated translation agents.\n- Zero tolerance regarding prompt injections.");
    }
  };

  // Search & Filters applications
  const filteredResumes = resumes.filter(r => {
    const matchesSearch = r.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.email.toLowerCase().includes(searchTerm.toLowerCase());
                          
    const matchesFilter = recommendationFilter === "all" || r.recommendation === recommendationFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Middle/Left: Upload & Resume List */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Upload Block */}
        <div className="glass p-6 rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-sans font-bold text-zinc-100 text-lg leading-none">Screening Pipeline</h3>
              <p className="text-xs text-zinc-400 mt-1">Upload resume profiles or select presets to test screening</p>
            </div>
            
            {/* Presets helpers */}
            <div className="flex gap-1.5">
              <button 
                type="button" 
                onClick={() => loadDemoResumeText("frontend")}
                className="px-2.5 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium font-mono rounded border border-zinc-700"
              >
                + React Dev Resume
              </button>
              <button 
                type="button" 
                onClick={() => loadDemoResumeText("ai")}
                className="px-2.5 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium font-mono rounded border border-zinc-700"
              >
                + AI Dev Resume
              </button>
            </div>
          </div>

          <form onSubmit={handleCreateResume} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-mono">Candidate Name</label>
                <input 
                  type="text" 
                  required 
                  value={candidateName} 
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="e.g. Liam Neeson" 
                  className="w-full px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-lg text-xs placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-mono">Email address</label>
                <input 
                  type="email" 
                  required 
                  value={candidateEmail} 
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  placeholder="name@email.com" 
                  className="w-full px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-lg text-xs placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-mono">Target position</label>
                <select 
                  value={jobTitle} 
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option className="bg-[#0a0a0a]" value="Senior Frontend Engineer">Senior Frontend Engineer</option>
                  <option className="bg-[#0a0a0a]" value="AI Specialist">AI Specialist</option>
                  <option className="bg-[#0a0a0a]" value="Lead UI / UX Designer">Lead UI / UX Designer</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-mono">Raw resume details / Text contents</label>
              <textarea 
                required
                rows={3}
                value={resumeTextContent}
                onChange={(e) => setResumeTextContent(e.target.value)}
                placeholder="Paste or draft credentials here..." 
                className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-lg text-xs font-mono placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end">
              <button 
                type="submit" 
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="w-3.5 h-3.5" />
                )}
                <span>{uploading ? "Uploading..." : "Inject Profile to Queue"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Filters and List */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-4 bg-zinc-900/20 border-b border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search candidates, positions, email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-lg text-xs placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Quick Bulk screening triggers */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Filter className="w-3.5 h-3.5 text-zinc-500" />
                <span className="font-mono text-[11px]">Recommendation:</span>
                <select 
                  value={recommendationFilter}
                  onChange={(e) => setRecommendationFilter(e.target.value)}
                  className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option className="bg-[#0a0a0a]" value="all">All</option>
                  <option className="bg-[#0a0a0a]" value="shortlist">Shortlist</option>
                  <option className="bg-[#0a0a0a]" value="maybe">Maybe</option>
                  <option className="bg-[#0a0a0a]" value="reject">Reject</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleBulkAction("shortlist")}
                disabled={uploading}
                className="px-3 py-1 bg-indigo-600/10 hover:bg-indigo-600/25 text-indigo-400 font-semibold text-xs rounded transition-all border border-indigo-600/20 cursor-pointer"
              >
                Bulk AI Screen
              </button>
            </div>
          </div>

          <div className="divide-y divide-zinc-800/40 max-h-[490px] overflow-y-auto no-scrollbar">
            {filteredResumes.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 text-xs">
                No matching profiles found in queue. Inject new profiles above!
              </div>
            ) : (
              filteredResumes.map((resume) => {
                const isSelected = selectedResume?.id === resume.id;
                const isScreening = screeningId === resume.id;

                let scoreColor = "bg-zinc-800 text-zinc-400 border border-zinc-700";
                if (resume.aiScore) {
                  if (resume.aiScore >= 80) scoreColor = "bg-emerald-950/20 text-emerald-400 border border-emerald-900/30";
                  else if (resume.aiScore >= 60) scoreColor = "bg-amber-950/20 text-amber-400 border border-amber-900/30";
                  else scoreColor = "bg-rose-950/20 text-rose-400 border border-rose-900/30";
                }

                return (
                  <div 
                    key={resume.id}
                    onClick={() => setSelectedResume(resume)}
                    className={`p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-900/20 transition-all ${
                      isSelected ? "bg-indigo-600/10 border-l-4 border-indigo-500" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-lg bg-indigo-600/10 text-indigo-400 mt-1">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-sans font-bold text-zinc-100 text-sm leading-snug">{resume.candidateName}</h4>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5 text-xs text-zinc-400 font-medium">
                          <span className="text-zinc-400">{resume.email}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-300">{resume.jobTitle}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                          Uploaded on {new Date(resume.uploadedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      {resume.status === "pending" ? (
                        <button
                          onClick={() => handleTriggerScreen(resume.id)}
                          disabled={isScreening}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded shadow-sm focus:outline-none cursor-pointer"
                        >
                          {isScreening ? (
                            <Loader2 className="w-3 animate-spin text-white" />
                          ) : (
                            <Sparkles className="w-3 text-white" />
                          )}
                          <span>{isScreening ? "Analyzing..." : "Review Profile"}</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          {resume.aiScore !== undefined && (
                            <span className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border ${scoreColor}`}>
                              {resume.aiScore}/100
                            </span>
                          )}
                          {resume.recommendation && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                              resume.recommendation === "shortlist" 
                                ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/30" 
                                : resume.recommendation === "maybe" 
                                ? "bg-amber-950/20 text-amber-400 border-amber-900/30"
                                : "bg-rose-950/20 text-rose-400 border-rose-900/30"
                            }`}>
                              {resume.recommendation}
                            </span>
                          )}
                        </div>
                      )}

                      <button 
                        onClick={(e) => handleDeleteResume(resume.id, e)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/10 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Right Side: Resume Detail Panel */}
      <div id="resume-detail-panel" className="glass rounded-xl p-6 flex flex-col justify-between">
        {selectedResume ? (
          <div className="space-y-6 h-full flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="pb-4 border-b border-zinc-800 flex items-start justify-between">
                <div>
                  <h3 className="font-sans font-bold text-zinc-100 text-base">{selectedResume.candidateName}</h3>
                  <p className="text-xs text-indigo-400 mt-0.5 font-medium">{selectedResume.jobTitle}</p>
                </div>
                {selectedResume.aiScore !== undefined && (
                  <div className="w-12 h-12 rounded-full border border-indigo-500/20 flex flex-col justify-center items-center bg-indigo-600/10">
                    <span className="text-[9px] text-indigo-400 font-mono -mb-1 font-bold">SCORE</span>
                    <span className="text-sm font-bold text-indigo-300 font-mono leading-none">{selectedResume.aiScore}</span>
                  </div>
                )}
              </div>

              {/* AI Insight section */}
              {selectedResume.status === "pending" ? (
                <div className="py-8 text-center bg-zinc-900/10 rounded-lg p-4 border border-dashed border-zinc-800 my-4">
                  <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400">This profile hasn't been processed yet for recruitment compatibility.</p>
                  <button 
                    onClick={() => handleTriggerScreen(selectedResume.id)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-white" />
                    <span>Run Evaluation Now</span>
                  </button>
                </div>
              ) : selectedResume.status === "failed" ? (
                <div className="p-4 bg-rose-950/25 border border-rose-900/30 text-rose-400 text-xs rounded-lg my-4">
                  Evaluations failed. Verify that your Gemini key is configured properly.
                </div>
              ) : (
                <div className="space-y-4 py-4" id="ai-insights-block">
                  <div className="p-3 bg-zinc-900/30 rounded-lg border border-zinc-800/80">
                    <span className="text-[10px] font-bold text-indigo-400 tracking-wider block uppercase font-mono mb-1">
                      Candidate Alignment Summary
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed italic">
                      "{selectedResume.aiSummary}"
                    </p>
                  </div>

                  {/* Skills tags */}
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 tracking-wider block uppercase font-mono mb-2">
                      Key Capabilities Detected
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {selectedResume.skills?.map((skill, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded text-[10px] font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Red flags */}
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 tracking-wider block uppercase font-mono mb-1.5">
                      Operational Concerns / Red Flags
                    </span>
                    {selectedResume.redFlags && selectedResume.redFlags.length > 0 ? (
                      <div className="space-y-1">
                        {selectedResume.redFlags.map((flag, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-xs text-rose-400 bg-rose-950/15 px-2 py-1 rounded border border-rose-900/20">
                            <AlertTriangle className="w-3" />
                            <span>{flag}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 p-2 bg-emerald-950/15 text-emerald-400 text-xs rounded border border-emerald-900/20">
                        <Check className="w-3.5 h-3.5 mt-0.5" />
                        <span>No red flags detected. Clean profile.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Raw document text representation */}
              <div className="mt-4">
                <span className="text-[10px] font-bold text-zinc-500 tracking-wider block uppercase font-mono mb-1.5">
                  Extracted CV Context
                </span>
                <div className="text-[11px] text-zinc-400 font-mono bg-zinc-950/40 p-3 rounded-lg max-h-[150px] overflow-y-auto whitespace-pre-wrap leading-relaxed border border-zinc-800/80">
                  {selectedResume.rawText}
                </div>
              </div>
            </div>

            {/* Bottom Recommendation actions */}
            {selectedResume.status === "processed" && (
              <div className="pt-4 border-t border-zinc-800 flex gap-2">
                <button
                  type="button"
                  onClick={() => alert("Successfully scheduled interview call with: " + selectedResume.candidateName)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs rounded-lg transition-all cursor-pointer border border-emerald-600/30"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Shortlist Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => alert("Candidate rejected from screening pipelines.")}
                  className="px-3 py-2 border border-zinc-800 bg-zinc-900/10 hover:bg-zinc-800 hover:text-zinc-300 text-zinc-400 rounded-lg text-xs transition-all cursor-pointer"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col justify-center items-center text-center text-zinc-500 py-20">
            <FileText className="w-10 h-10 text-zinc-600 mb-2" />
            <span className="text-xs font-semibold">Select a candidate profile from the pipeline list to view structured matching summaries and capability reports.</span>
          </div>
        )}
      </div>
    </div>
  );
}
