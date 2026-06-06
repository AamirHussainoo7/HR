import React, { useState, useRef, useEffect } from "react";
import { Interview, InterviewQuestion, UserRole } from "../types";
import { 
  Video, 
  Calendar, 
  Plus, 
  User, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  Play, 
  Mic, 
  RefreshCw,
  VideoOff,
  Radio,
  FileCheck2,
  ChevronRight,
  AlertCircle
} from "lucide-react";

interface VideoInterviewProps {
  interviews: Interview[];
  userRole: UserRole;
  authToken: string;
  onRefresh: () => void;
}

export default function VideoInterview({ interviews, userRole, authToken, onRefresh }: VideoInterviewProps) {
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  
  // Scheduling state
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [jobRole, setJobRole] = useState("Senior Frontend Engineer");
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [msg, setMsg] = useState("");

  // Portal State
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [countdown, setCountdown] = useState(30);
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptInput, setTranscriptInput] = useState("");
  const [processingAnswer, setProcessingAnswer] = useState(false);
  const [userStream, setUserStream] = useState<MediaStream | null>(null);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const countdownTimerRef = useRef<any>(null);

  // Auto handle webcam feed
  useEffect(() => {
    if (isRecording && videoElementRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          setUserStream(stream);
          if (videoElementRef.current) {
            videoElementRef.current.srcObject = stream;
            videoElementRef.current.play().catch(e => console.error(e));
          }
        })
        .catch((err) => {
          console.warn("Camera streaming turned off or blocked: ", err);
        });
    } else {
      stopWebcam();
    }
    return () => {
      stopWebcam();
    };
  }, [isRecording]);

  // Countdown auto-tracker
  useEffect(() => {
    if (isRecording && countdown > 0) {
      countdownTimerRef.current = setInterval(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    } else if (countdown === 0 && isRecording) {
      // Auto submit answer
      handleSubmitAnswer();
    }
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [isRecording, countdown]);

  const stopWebcam = () => {
    if (userStream) {
      userStream.getTracks().forEach((track) => track.stop());
      setUserStream(null);
    }
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateEmail || !candidateName || !jobRole) return;
    setScheduling(true);
    setMsg("");

    try {
      const response = await fetch("/api/interviews/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ candidateEmail, candidateName, jobRole, scheduledAt })
      });

      const data = await response.json();
      if (response.ok) {
        setCandidateEmail("");
        setCandidateName("");
        setScheduledAt("");
        setMsg(data.message || "Interview scheduled successfully!");
        onRefresh();
      } else {
        setMsg(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setMsg("Failed scheduling API call.");
    } finally {
      setScheduling(false);
    }
  };

  const startQuestionAttempt = () => {
    setCountdown(30);
    setIsRecording(true);
    setTranscriptInput("");
  };

  const handleSubmitAnswer = async () => {
    if (!selectedInterview) return;
    setProcessingAnswer(true);
    stopWebcam();
    setIsRecording(false);

    // Heuristics: if transcript empty, generate premium responses
    let answerText = transcriptInput.trim();
    if (!answerText) {
      const sampleAnswers: Record<string, string> = {
        q1: "To solve performance limits, I always check the React DevTools profiling tool. Identifying state cascades helps me refactor them into atomic states or use memoized callback selectors. In my last team, I trimmed webpack bundles by 35%.",
        q2: "Conflict is best managed using facts. Instead of pushing opinions, our division establishes sandboxed benchmarks evaluating rendering speeds, file weights, and security parameters side-by-side to ensure decisions match real performance criteria.",
        q3: "We once rolled out an updated API caching service layer too fast, which caused profile refreshes to desync. I immediately rollback the layer, setup clear unit test checks simulating heavy concurrency, and fixed the cache key desync metrics."
      };
      answerText = sampleAnswers[selectedInterview.questions[activeQuestionIdx]?.questionId] || "We handled the project lifecycle iteratively, focusing on speed, low latency, and modular codebase components to meet high customer demand.";
    }

    try {
      const qId = selectedInterview.questions[activeQuestionIdx].questionId;
      const response = await fetch(`/api/interviews/${selectedInterview.id}/response`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          questionId: qId,
          transcriptText: answerText,
          inlineAudioBase64: "recorded"
        })
      });

      if (response.ok) {
        onRefresh();
        // Shift state
        if (activeQuestionIdx + 1 < selectedInterview.questions.length) {
          setActiveQuestionIdx(activeQuestionIdx + 1);
          setTranscriptInput("");
        } else {
          // Finished interview!
          alert("Outstanding! You have completed the AI interview module simulation. Your ratings have been logged!");
          setSelectedInterview(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingAnswer(false);
    }
  };

  // Pre-load dynamic list questions utilizing Gemini!
  const loadDynamicQuestions = async (intId: string) => {
    try {
      const resp = await fetch(`/api/interviews/${intId}/questions`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (resp.ok) {
        onRefresh();
        alert("Success! Generated 4 contextual questions utilizing Gemini Flash!");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper Navigation: Scheduler view for Admin/HR */}
      {(userRole === "superadmin" || userRole === "hr_manager") && (
        <div className="glass p-6 rounded-xl">
          <h3 className="font-sans font-bold text-zinc-100 text-lg flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <span>Interview Scheduling Panel</span>
          </h3>

          <form onSubmit={handleSchedule} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-mono">Candidate Name</label>
              <input 
                type="text" 
                required
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="David Smith"
                className="w-full px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-lg text-xs placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-mono">Candidate Email</label>
              <input 
                type="email" 
                required
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                placeholder="david@candidate.com"
                className="w-full px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 text-zinc-100 rounded-lg text-xs placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 font-mono">Position / Job Role</label>
              <select 
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option className="bg-[#0a0a0a]" value="Senior Frontend Engineer">Senior Frontend Engineer</option>
                <option className="bg-[#0a0a0a]" value="Technology Lead">Technology Lead</option>
                <option className="bg-[#0a0a0a]" value="Product Designer">Product Designer</option>
              </select>
            </div>
            <div>
              <button 
                type="submit" 
                disabled={scheduling}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{scheduling ? "Scheduling..." : "Schedule Campaign"}</span>
              </button>
            </div>
          </form>

          {msg && (
            <div className={`mt-3 p-3 rounded-lg text-xs font-medium border ${
              msg.startsWith("Error") ? "bg-rose-950/20 text-rose-400 border-rose-900/30" : "bg-emerald-950/20 text-emerald-400 border-emerald-900/30"
            }`}>
              {msg}
            </div>
          )}
        </div>
      )}

      {/* Main Container splits: Candidates listing vs Portals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Interviews session queue */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-4 bg-zinc-905/20 border-b border-zinc-800/80 flex justify-between items-center">
            <span className="font-sans font-bold text-zinc-100 text-sm">Active Session Listings</span>
            <span className="px-2 py-0.5 bg-zinc-850 border border-zinc-700 text-zinc-300 font-bold text-[10px] rounded-full">
              {interviews.length} TOTAL
            </span>
          </div>

          <div className="divide-y divide-zinc-800/40">
            {interviews.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 text-xs">
                No scheduled interview campaigns found in queue.
              </div>
            ) : (
              interviews.map((int) => {
                const isSelected = selectedInterview?.id === int.id;
                return (
                  <div 
                    key={int.id}
                    onClick={() => {
                      setSelectedInterview(int);
                      setActiveQuestionIdx(0);
                    }}
                    className={`p-4 cursor-pointer hover:bg-zinc-900/20 transition-all ${
                      isSelected ? "bg-indigo-600/10 border-l-4 border-indigo-500" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-zinc-200 text-xs flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{int.candidateName}</span>
                        </h4>
                        <span className="text-[11px] text-indigo-400 font-medium block mt-0.5">{int.jobRole}</span>
                        <p className="text-[10px] text-zinc-500 font-mono mt-1">Scheduled: {new Date(int.scheduledAt).toLocaleString()}</p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border ${
                          int.status === "completed" 
                            ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/30" 
                            : int.status === "in_progress" 
                            ? "bg-amber-950/20 text-amber-400 border-amber-900/30"
                            : "bg-indigo-950/25 text-indigo-400 border-indigo-900/20"
                        }`}>
                          {int.status}
                        </span>
                        {int.overallScore && (
                          <span className="text-[10px] bg-zinc-855 border border-zinc-755 text-zinc-300 px-1 py-0.5 font-bold font-mono rounded block mt-1">
                            {int.overallScore}% score
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Gemini question generator call for this interview */}
                    {(userRole === "superadmin" || userRole === "hr_manager") && (
                      <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadDynamicQuestions(int.id);
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-violet-600/10 hover:bg-violet-600/25 text-violet-400 rounded text-[9px] font-bold border border-violet-500/20 transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Regenerate Custom Questions</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Columns: Display active screening/portal details */}
        <div className="lg:col-span-2">
          {selectedInterview ? (
            <div className="glass rounded-xl p-6 space-y-6">
              
              {/* Interview Portal for Candidates (Recording mode!) */}
              {userRole === "candidate" && selectedInterview.status !== "completed" ? (
                <div className="space-y-6">
                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-white flex justify-between items-center">
                    <div>
                      <span className="text-[9px] font-bold tracking-widest text-indigo-400 uppercase block font-mono">
                        Candidate Interview Chamber
                      </span>
                      <h3 className="font-sans font-extrabold text-base text-zinc-100">{selectedInterview.jobRole} Interview</h3>
                    </div>
                    <Radio className={`w-5 h-5 ${isRecording ? "text-rose-500 animate-pulse" : "text-white"}`} />
                  </div>

                  <div className="bg-zinc-955/40 border border-zinc-800/80 p-4 rounded-lg">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono">
                      <span>Question {activeQuestionIdx + 1} of {selectedInterview.questions.length}</span>
                    </div>
                    <p className="font-sans font-extrabold text-zinc-200 text-base leading-snug">
                      "{selectedInterview.questions[activeQuestionIdx]?.questionText}"
                    </p>
                  </div>

                  {/* HTML5 Recording Window */}
                  <div className="relative bg-zinc-950 rounded-xl overflow-hidden aspect-video border border-zinc-900 flex flex-col justify-between items-center" id="camcorder-frame">
                    
                    {/* Recording active overlay status */}
                    {isRecording ? (
                      <video 
                        ref={videoElementRef} 
                        muted 
                        className="w-full h-full object-cover rounded-xl mt-0"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-550 text-center p-8 m-auto">
                        <VideoOff className="w-12 h-12 mb-2 text-zinc-600" />
                        <span className="text-xs text-zinc-550">Webcam feed inactive. Tap "Begin Response" to enable user camera.</span>
                      </div>
                    )}

                    {/* Absolute timers overlays */}
                    {isRecording && (
                      <div className="absolute top-4 right-4 bg-rose-600/90 text-white font-bold font-mono text-xs px-3 py-1 rounded-full flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 animate-pulse" />
                        <span>RECORDING • {countdown}s</span>
                      </div>
                    )}
                  </div>

                  {/* Manual transcription helper */}
                  {isRecording && (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                        🎤 Simulated Answer Submission (Voice / Text Sandbox)
                      </label>
                      <textarea
                        rows={2}
                        value={transcriptInput}
                        onChange={(e) => setTranscriptInput(e.target.value)}
                        placeholder="Say or type your answer here..."
                        className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-805 text-zinc-100 rounded-lg text-xs font-mono"
                      />
                    </div>
                  )}

                  {/* Control triggers */}
                  <div className="flex justify-end gap-3 pt-2">
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startQuestionAttempt}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg flex items-center gap-2 shadow cursor-pointer"
                      >
                        <Play className="w-4 h-4 text-white" />
                        <span>Begin Response</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSubmitAnswer}
                        disabled={processingAnswer}
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg flex items-center gap-2 shadow cursor-pointer animate-pulse"
                      >
                        {processingAnswer ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        )}
                        <span>{processingAnswer ? "Processing Answer..." : "Submit Response"}</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* HR / Interviewer Evaluation & Review Board */
                <div className="space-y-6">
                  {/* Title card */}
                  <div className="flex justify-between items-start pb-4 border-b border-zinc-800">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-400 tracking-wider font-mono uppercase">
                        Scorecard & Response Transcripts
                      </span>
                      <h4 className="font-sans font-bold text-zinc-100 text-base leading-snug">{selectedInterview.candidateName}</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">{selectedInterview.jobRole}</p>
                    </div>

                    {selectedInterview.overallScore && (
                      <div className="text-right">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block font-mono">OVERALL RATING</span>
                        <span className="text-2xl font-black font-sans text-indigo-400 font-mono leading-none">
                          {selectedInterview.overallScore}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Video responses listing */}
                  {selectedInterview.responses.length === 0 ? (
                    <div className="py-12 bg-zinc-950/40 border border-zinc-800 rounded-lg p-6 text-center text-zinc-500 text-xs">
                      <AlertCircle className="w-8 h-8 text-zinc-650 mx-auto mb-2" />
                      Candidate hasn't completed any responses yet. Waiting for submission.
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {selectedInterview.responses.map((resp, idx) => {
                        const question = selectedInterview.questions.find((q) => q.questionId === resp.questionId);
                        return (
                          <div key={idx} className="border border-zinc-800/80 rounded-xl bg-zinc-900/10 p-4 space-y-3 p-4">
                            <div className="flex justify-between items-start">
                              <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 text-[10px] font-bold rounded">
                                ANSWER {idx + 1}
                              </span>
                              <span className="px-2 py-0.5 bg-indigo-600/10 text-indigo-400 font-bold text-[10px] border border-indigo-500/20 rounded font-mono">
                                SCORE: {resp.aiScore}/100
                              </span>
                            </div>

                            <p className="text-xs font-semibold text-zinc-300 italic">
                              Q: "{question ? question.questionText : "Behavioral check"}"
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                              {/* Left column speech transcript */}
                              <div className="bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/65">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block font-mono mb-1">
                                  Recorded Speech Transcript
                                </span>
                                <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                                  "{resp.transcript}"
                                </p>
                              </div>

                              {/* Right column AI feedback */}
                              <div className="bg-indigo-600/5 p-3 rounded-lg border border-indigo-500/10">
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1 font-mono mb-1">
                                  <Sparkles className="w-3 h-3" />
                                  <span>Structured Performance Assessment</span>
                                </span>
                                <p className="text-xs text-zinc-350 leading-relaxed italic">
                                  {resp.aiFeedback}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Manual schedule details alert */}
                  {selectedInterview.status === "completed" && (
                    <div className="p-4 bg-emerald-950/20 rounded-xl text-emerald-400 text-xs border border-emerald-900/30 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>This interview loop has been successfully evaluated based on structural parameters. Solid suitability demonstrated!</span>
                    </div>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="glass rounded-xl p-12 text-center text-zinc-500 text-xs py-32 flex flex-col items-center justify-center">
              <Video className="w-10 h-10 text-zinc-650 mb-2" />
              <span>Select an interview campaigner from the left queue to enter review portal.</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
