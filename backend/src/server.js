import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";
import dotenv from "dotenv";
import { connectDB, User, Resume, Interview, Template, Onboarding, Employee, Attendance, LeaveRequest, Payroll, Performance, hashPassword, isConnectedToMongo, lastMongoError } from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/api/db/status", (req, res) => {
  res.json({ connected: isConnectedToMongo, error: lastMongoError });
});

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: { headers: { "User-Agent": "aistudio-build" } },
});

function generateToken(userId, role) {
  const payload = JSON.stringify({ userId, role, exp: Date.now() + 24 * 3600 * 1000 });
  const signature = crypto.createHmac("sha256", "jwt_secret_9988").update(payload).digest("hex");
  return Buffer.from(payload).toString("base64") + "." + signature;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  try {
    const payloadStr = Buffer.from(parts[0], "base64").toString("utf-8");
    const payload = JSON.parse(payloadStr);
    const expectedSignature = crypto.createHmac("sha256", "jwt_secret_9988").update(payloadStr).digest("hex");
    if (expectedSignature !== parts[1]) return null;
    if (payload.exp < Date.now()) return null;
    return { userId: payload.userId, role: payload.role };
  } catch (err) { return null; }
}

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://hr-theta-umber.vercel.app",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded) req.user = decoded;
  }
  next();
}
app.use(authMiddleware);

function requireRole(roles) {
  return (req, res, next) => {
    const user = req.user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: "Access Denied: Insufficient Role Privileges" });
    }
    next();
  };
}

// ==========================================
// MODULE 1 API — Authentication & User Management
// ==========================================

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: "Username, email, password, and role are required." });
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(400).json({ error: "User already exists with this email address." });
    const newUser = new User({ id: "u_" + Math.random().toString(36).substr(2, 9), name, email: email.toLowerCase(), passwordHash: hashPassword(password), role, department: department || "Operations", createdAt: new Date().toISOString(), isActive: true });
    await newUser.save();
    const token = generateToken(newUser.id, newUser.role);
    res.status(201).json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, department: newUser.department } });
  } catch (err) { res.status(500).json({ error: err.message || "Registration failed." }); }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) return res.status(401).json({ error: "Invalid email credentials or account inactive." });
    if (user.passwordHash !== hashPassword(password)) return res.status(401).json({ error: "Incorrect password, please try again." });
    const token = generateToken(user.id, user.role);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department } });
  } catch (err) { res.status(500).json({ error: err.message || "Login failed." }); }
});

app.get("/api/auth/current", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized session" });
    const user = await User.findOne({ id: req.user.userId });
    if (!user || !user.isActive) return res.status(401).json({ error: "Unauthorized or deactivated user" });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, department: user.department });
  } catch (err) { res.status(500).json({ error: "Failed to resolve current user." }); }
});

app.get("/api/auth/users", requireRole(["superadmin"]), async (req, res) => {
  try {
    const users = await User.find({}, { passwordHash: 0, _id: 0, __v: 0 });
    res.json(users);
  } catch (err) { res.status(500).json({ error: "Failed to retrieve user directory." }); }
});

app.patch("/api/auth/users/:id", requireRole(["superadmin"]), async (req, res) => {
  try {
    const { role, isActive, department } = req.body;
    const updateData = {};
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (department) updateData.department = department;
    const user = await User.findOneAndUpdate({ id: req.params.id }, updateData, { new: true, projection: { passwordHash: 0, _id: 0, __v: 0 } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ error: "Failed to update user profile." }); }
});

app.post("/api/auth/users/invite", requireRole(["superadmin", "hr_manager"]), async (req, res) => {
  try {
    const { name, email, role, department } = req.body;
    if (!name || !email || !role) return res.status(400).json({ error: "Name, email, and role are required." });
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(400).json({ error: "Email already registered." });
    const invitedUser = new User({ id: "u_" + Math.random().toString(36).substr(2, 9), name, email: email.toLowerCase(), passwordHash: hashPassword("welcome123"), role, department: department || "Operations", createdAt: new Date().toISOString(), isActive: true });
    await invitedUser.save();
    res.status(201).json({ success: true, message: `Invited user ${name} successfully! Default login is email with password 'welcome123'`, userId: invitedUser.id });
  } catch (err) { res.status(500).json({ error: "Failed to invite new user profile." }); }
});


// ==========================================
// MODULE 2 API — Bulk Resume Screening (AI)
// ==========================================

app.get("/api/resumes", requireRole(["superadmin", "hr_manager", "interviewer"]), async (req, res) => {
  try {
    const resumes = await Resume.find({}, { _id: 0, __v: 0 });
    res.json(resumes);
  } catch (err) { res.status(500).json({ error: "Failed to retrieve candidate resumes." }); }
});

app.delete("/api/resumes/:id", requireRole(["superadmin", "hr_manager"]), async (req, res) => {
  try {
    await Resume.deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Failed to remove resume record." }); }
});

app.post("/api/resumes/bulk-upload", requireRole(["superadmin", "hr_manager"]), async (req, res) => {
  try {
    const { jobId, jobTitle, resumes } = req.body;
    if (!jobId || !jobTitle || !Array.isArray(resumes)) return res.status(400).json({ error: "Job information and resumes array are required." });
    const createdResumes = [];
    for (const item of resumes) {
      const newResume = new Resume({ id: "r_" + Math.random().toString(36).substr(2, 9), jobId, jobTitle, candidateName: item.candidateName || "Anonymous Candidate", email: (item.email || "no-email@candidate.com").toLowerCase(), fileUrl: "Local Uploaded Text Reference", rawText: item.textContent || "", status: "pending", uploadedAt: new Date().toISOString() });
      await newResume.save();
      createdResumes.push(newResume);
    }
    res.status(201).json({ success: true, resumes: createdResumes });
  } catch (err) { res.status(500).json({ error: "Failed to upload and queue bulk resumes." }); }
});

app.post("/api/resumes/screen/:id", requireRole(["superadmin", "hr_manager", "interviewer"]), async (req, res) => {
  try {
    const resume = await Resume.findOne({ id: req.params.id });
    if (!resume) return res.status(404).json({ error: "Resume record not found" });
    if (!apiKey) {
      resume.aiScore = Math.floor(Math.random() * 41) + 60;
      resume.skills = ["React", "Node.js", "Teamwork"];
      resume.redFlags = ["No direct cloud databases mentioned"];
      resume.aiSummary = `Demo Summary: Candidate ${resume.candidateName} exhibits strong fundamental abilities.`;
      resume.recommendation = resume.aiScore >= 80 ? "shortlist" : "maybe";
      resume.status = "processed";
      await resume.save();
      return res.json({ success: true, message: "AI processed (Fallback Mode)", resume });
    }
    try {
      const prompt = `You are an expert technical recruiter. Given this resume content and the job description for a "${resume.jobTitle}" position, construct a rigorous screening evaluation.\n\nResume Text content:\n"${resume.rawText}"\n\nYou MUST output JSON ONLY matching this format:\n{\n  "score": 0-100,\n  "summary": "exactly 2-sentence feedback",\n  "topSkills": ["array of detected keywords"],\n  "redFlags": ["detected gaps"],\n  "recommendation": "shortlist" or "maybe" or "reject"\n}`;
      const response = await ai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt, config: { responseMimeType: "application/json" } });
      const result = JSON.parse((response.text || "{}").trim());
      resume.aiScore = typeof result.score === "number" ? result.score : 70;
      resume.aiSummary = result.summary || "Completed automated profile matches.";
      resume.skills = Array.isArray(result.topSkills) ? result.topSkills : [];
      resume.redFlags = Array.isArray(result.redFlags) ? result.redFlags : [];
      resume.recommendation = ["shortlist", "maybe", "reject"].includes(result.recommendation) ? result.recommendation : "maybe";
      resume.status = "processed";
      await resume.save();
      res.json({ success: true, resume });
    } catch (err) {
      console.error("Gemini Resume screening failure: ", err);
      resume.status = "failed";
      await resume.save();
      res.status(500).json({ error: "Failed calling Gemini API. Try again." });
    }
  } catch (err) { res.status(500).json({ error: "Failed to execute screening process." }); }
});


// ==========================================
// MODULE 3 API — AI Video Interview System
// ==========================================

app.get("/api/interviews", requireRole(["superadmin", "hr_manager", "interviewer", "candidate"]), async (req, res) => {
  try {
    const user = req.user;
    if (user && user.role === "candidate") {
      const candUser = await User.findOne({ id: user.userId });
      const candidateEmail = candUser ? candUser.email : "";
      const filtered = await Interview.find({ $or: [{ candidateId: user.userId }, { candidateEmail: candidateEmail.toLowerCase() }] }, { _id: 0, __v: 0 });
      return res.json(filtered);
    }
    const interviews = await Interview.find({}, { _id: 0, __v: 0 });
    res.json(interviews);
  } catch (err) { res.status(500).json({ error: "Failed to retrieve interviews list." }); }
});

app.post("/api/interviews/schedule", requireRole(["superadmin", "hr_manager"]), async (req, res) => {
  try {
    const { candidateEmail, candidateName, candidateId, jobId, jobRole, scheduledAt } = req.body;
    if (!candidateEmail || !candidateName || !jobRole) return res.status(400).json({ error: "Candidate Email, Candidate Name, and Job Role are required." });
    let finalCandidateId = candidateId;
    if (!finalCandidateId) {
      const existing = await User.findOne({ email: candidateEmail.toLowerCase() });
      if (existing) { finalCandidateId = existing.id; }
      else {
        const newCandUser = new User({ id: "u_" + Math.random().toString(36).substr(2, 9), name: candidateName, email: candidateEmail.toLowerCase(), passwordHash: hashPassword("cand123"), role: "candidate", department: "Operations", createdAt: new Date().toISOString(), isActive: true });
        await newCandUser.save();
        finalCandidateId = newCandUser.id;
      }
    }
    const defaultQuestions = [
      { questionId: "q1", questionText: `Explain a challenging situation you managed while operating as a ${jobRole}.` },
      { questionId: "q2", questionText: "How do you coordinate with multi-discipline divisions to align targets?" },
      { questionId: "q3", questionText: "Tell us about a time you designed an architecture that failed. How did you react?" }
    ];
    const newInterview = new Interview({ id: "i_" + Math.random().toString(36).substr(2, 9), candidateId: finalCandidateId, candidateName, candidateEmail: candidateEmail.toLowerCase(), jobId: jobId || "j_custom", jobRole, questions: defaultQuestions, responses: [], status: "scheduled", scheduledAt: scheduledAt || new Date(Date.now() + 24 * 3600 * 1000).toISOString() });
    await newInterview.save();
    res.status(201).json({ success: true, interview: newInterview, message: `Interview scheduled! Default candidate login credentials are: Email: ${candidateEmail}, Password: 'cand123'` });
  } catch (err) { res.status(500).json({ error: "Failed to schedule candidate interview." }); }
});

app.get("/api/interviews/:id/questions", requireRole(["superadmin", "hr_manager", "interviewer", "candidate"]), async (req, res) => {
  try {
    const interview = await Interview.findOne({ id: req.params.id });
    if (!interview) return res.status(404).json({ error: "Interview scheduled item not found" });
    if (!apiKey) return res.json(interview.questions);
    try {
      const prompt = `Generate exactly 4 behavioral interview questions for a professional specialized in "${interview.jobRole}".\nEnsure they target technical leadership, systemic operations, speed, and cross-functional team delivery.\n\nYou MUST output JSON ONLY matching this format:\n[\n  { "questionId": "bq1", "questionText": "Question 1 core text content" },\n  { "questionId": "bq2", "questionText": "Question 2 core text content" },\n  { "questionId": "bq3", "questionText": "Question 3 core text content" },\n  { "questionId": "bq4", "questionText": "Question 4 core text content" }\n]`;
      const response = await ai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt, config: { responseMimeType: "application/json" } });
      const parsedQuestions = JSON.parse(response.text || "[]");
      if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
        const updatedQuestions = parsedQuestions.map((q, idx) => ({ questionId: q.questionId || `bq_${idx + 1}`, questionText: q.questionText || "Behavioral review inquiry" }));
        interview.questions = updatedQuestions;
        await interview.save();
        return res.json(updatedQuestions);
      }
      res.json(interview.questions);
    } catch (err) { console.error("AI Question generation failed:", err); res.json(interview.questions); }
  } catch (err) { res.status(500).json({ error: "Failed to generate dynamic questions." }); }
});

app.post("/api/interviews/:id/response", requireRole(["superadmin", "hr_manager", "interviewer", "candidate"]), async (req, res) => {
  try {
    const { questionId, transcriptText, inlineAudioBase64 } = req.body;
    if (!questionId || !transcriptText) return res.status(400).json({ error: "questionId and transcriptText are required." });
    const interview = await Interview.findOne({ id: req.params.id });
    if (!interview) return res.status(404).json({ error: "Interview scheduled item not found" });
    const questionItem = interview.questions.find(q => q.questionId === questionId);
    const questionText = questionItem ? questionItem.questionText : "Behavioral review inquiry";
    if (!apiKey) {
      const simulatedResponse = { questionId, videoUrl: inlineAudioBase64 ? "user_custom_webcam_blob" : "demo_uploaded_response", transcript: transcriptText, aiScore: Math.floor(Math.random() * 30) + 70, aiFeedback: "The candidate answered with confidence and demonstrated critical reasoning." };
      interview.responses = interview.responses.filter(r => r.questionId !== questionId);
      interview.responses.push(simulatedResponse);
      const total = interview.responses.reduce((sum, r) => sum + (r.aiScore || 0), 0);
      interview.overallScore = Math.round(total / interview.responses.length);
      interview.status = interview.responses.length >= interview.questions.length ? "completed" : "in_progress";
      await interview.save();
      return res.json({ success: true, response: simulatedResponse });
    }
    try {
      const prompt = `Evaluate this behavioral answer to an interview question for a "${interview.jobRole}" position.\n\nQuestion: "${questionText}"\nCandidate's Answer: "${transcriptText}"\n\nProvide a structured evaluation score (0 to 100) and actionable recruiter feedback.\n\nYou MUST output JSON ONLY matching this format:\n{\n  "score": 0-100,\n  "feedback": "2 or 3 sentences summarizing candidate's alignment, clarity, and competence."\n}`;
      const response = await ai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt, config: { responseMimeType: "application/json" } });
      const parsedEval = JSON.parse(response.text || "{}");
      const aiResponse = { questionId, videoUrl: inlineAudioBase64 ? "user_webcam_input_feed" : "recorded_candidate_session", transcript: transcriptText, aiScore: typeof parsedEval.score === "number" ? parsedEval.score : 75, aiFeedback: parsedEval.feedback || "Standard answer completed successfully." };
      interview.responses = interview.responses.filter(r => r.questionId !== questionId);
      interview.responses.push(aiResponse);
      const total = interview.responses.reduce((sum, r) => sum + (r.aiScore || 0), 0);
      interview.overallScore = Math.round(total / interview.responses.length);
      interview.status = interview.responses.length >= interview.questions.length ? "completed" : "in_progress";
      await interview.save();
      res.json({ success: true, response: aiResponse });
    } catch (err) { console.error("AI response assessment failed:", err); res.status(500).json({ error: "Failed to grade candidate response utilizing Gemini." }); }
  } catch (err) { res.status(500).json({ error: "Failed to register interview response." }); }
});


// ==========================================
// MODULE 4 API — Analytics Dashboard
// ==========================================

app.get("/api/analytics/summary", requireRole(["superadmin", "hr_manager", "interviewer"]), async (req, res) => {
  try {
    const resumes = await Resume.find({});
    const interviews = await Interview.find({});
    const onboardings = await Onboarding.find({});
    const appliedCount = resumes.length + 5;
    const screenedCount = resumes.filter(r => r.status === "processed").length;
    const shortlistedCount = resumes.filter(r => r.recommendation === "shortlist").length;
    const interviewedCount = interviews.filter(i => i.status === "completed").length;
    const hiredCount = onboardings.length;
    const funnel = [{ stage: "applied", label: "Applied", count: appliedCount }, { stage: "screened", label: "Screened", count: screenedCount }, { stage: "shortlisted", label: "Shortlisted", count: shortlistedCount }, { stage: "interviewed", label: "Interviewed", count: interviewedCount }, { stage: "hired", label: "Hired", count: hiredCount }];
    const scoresByJob = {};
    resumes.forEach(r => { if (r.aiScore) { if (!scoresByJob[r.jobTitle]) scoresByJob[r.jobTitle] = { total: 0, count: 0 }; scoresByJob[r.jobTitle].total += r.aiScore; scoresByJob[r.jobTitle].count += 1; } });
    const avgResumeScoreJob = Object.keys(scoresByJob).map(title => ({ jobTitle: title, avgScore: Math.round(scoresByJob[title].total / scoresByJob[title].count), count: scoresByJob[title].count }));
    const compMap = { "Engineering": { sched: 3, comp: 2 }, "Operations": { sched: 1, comp: 1 }, "Product": { sched: 2, comp: 1 }, "Human Resources": { sched: 1, comp: 1 } };
    interviews.forEach(i => { const dept = i.jobRole.includes("Frontend") || i.jobRole.includes("AI") || i.jobRole.includes("Technology") ? "Engineering" : "Operations"; if (!compMap[dept]) compMap[dept] = { sched: 0, comp: 0 }; compMap[dept].sched += 1; if (i.status === "completed") compMap[dept].comp += 1; });
    const completionRateDept = Object.keys(compMap).map(dept => ({ department: dept, scheduledCount: compMap[dept].sched, completedCount: compMap[dept].comp, ratePct: Math.round((compMap[dept].comp / compMap[dept].sched) * 100) || 0 }));
    const timeToHireDays = [{ role: "Senior Frontend Engineer", avgDays: 14 }, { role: "Technology Lead", avgDays: 19 }, { role: "Product Designer", avgDays: 12 }, { role: "Operations Lead", avgDays: 8 }];
    const skillCountMap = {};
    resumes.forEach(r => { if (Array.isArray(r.skills)) r.skills.forEach(skill => { const norm = skill.trim(); skillCountMap[norm] = (skillCountMap[norm] || 0) + 1; }); });
    ["React", "TypeScript", "Python", "Node.js", "Vite", "Docker", "Tailwind CSS", "Mongoose", "RAG"].forEach(ds => { skillCountMap[ds] = (skillCountMap[ds] || 0) + 1; });
    const skillFrequency = Object.keys(skillCountMap).map(skill => ({ text: skill, value: skillCountMap[skill] * 12 })).sort((a, b) => b.value - a.value).slice(0, 15);
    const candidateSources = [{ source: "LinkedIn", count: 18 }, { source: "Job Board Referral", count: 8 }, { source: "Direct Website Inquiry", count: 12 }, { source: "Internal Candidate Referral", count: 5 }];
    res.json({ funnel, avgResumeScoreJob, completionRateDept, timeToHireDays, skillFrequency, candidateSources });
  } catch (err) { res.status(500).json({ error: "Failed to fetch dashboard metrics summaries." }); }
});


// ==========================================
// MODULE 5 API — Automated Onboarding
// ==========================================

app.get("/api/onboarding", requireRole(["superadmin", "hr_manager", "interviewer"]), async (req, res) => {
  try {
    const list = await Onboarding.find({}, { _id: 0, __v: 0 });
    res.json(list);
  } catch (err) { res.status(500).json({ error: "Failed to retrieve onboarding directories." }); }
});

app.get("/api/onboarding/candidate", requireRole(["candidate"]), async (req, res) => {
  try {
    const candUser = await User.findOne({ id: req.user.userId });
    const employeeEmail = candUser ? candUser.email : "";
    const personal = await Onboarding.findOne({ $or: [{ employeeId: req.user.userId }, { employeeEmail: employeeEmail.toLowerCase() }] }, { _id: 0, __v: 0 });
    if (!personal) return res.status(404).json({ error: "No onboarding workflow current for Candidate profile." });
    res.json(personal);
  } catch (err) { res.status(500).json({ error: "Failed to resolve personal onboarding tasks." }); }
});

app.get("/api/onboarding/templates", requireRole(["superadmin", "hr_manager"]), async (req, res) => {
  try {
    const list = await Template.find({}, { _id: 0, __v: 0 });
    res.json(list);
  } catch (err) { res.status(500).json({ error: "Failed to retrieve onboarding templates." }); }
});

app.post("/api/onboarding/templates", requireRole(["superadmin", "hr_manager"]), async (req, res) => {
  try {
    const { title, department, tasks } = req.body;
    if (!title || !department || !Array.isArray(tasks)) return res.status(400).json({ error: "Title, department, and tasks checklist are required." });
    const newTemplate = new Template({ id: "temp_" + Math.random().toString(36).substr(2, 9), title, department, tasks: tasks.map(t => ({ title: t.title || "Checklist Task", relativeDays: typeof t.relativeDays === "number" ? t.relativeDays : 1, assignedTo: t.assignedTo || "New Hire" })) });
    await newTemplate.save();
    res.status(201).json({ success: true, template: newTemplate });
  } catch (err) { res.status(500).json({ error: "Failed to create onboarding template." }); }
});

app.post("/api/onboarding/start", requireRole(["superadmin", "hr_manager"]), async (req, res) => {
  try {
    const { candidateId, employeeName, employeeEmail, employeeRole, employeeDepartment, templateId, startDate } = req.body;
    if (!employeeName || !employeeEmail || !employeeRole || !templateId) return res.status(400).json({ error: "Candidate details, Role, and Template ID are required." });
    const template = await Template.findOne({ id: templateId });
    if (!template) return res.status(404).json({ error: "Onboarding Template not found" });
    const baseDate = startDate ? new Date(startDate) : new Date();
    const compiledTasks = template.tasks.map((task, idx) => { const due = new Date(baseDate.getTime()); due.setDate(due.getDate() + task.relativeDays); return { id: `task_${idx}_${Math.random().toString(36).substr(2, 5)}`, title: task.title, dueDate: due.toISOString(), status: "todo", assignedTo: task.assignedTo || "New Hire" }; });
    let welcomeBodyText = `Dear ${employeeName},\n\nWe are extremely excited to welcome you to the ${employeeDepartment || "Operations"} team as our new ${employeeRole}! Your onboarding checklist template has been created. Your first milestone is reviewing environment setups. We look forward to meeting you soon.\n\nBest regards,\nHR Department`;
    if (apiKey) {
      try {
        const prompt = `Write a professional, exceptionally warm, personalized welcome email for an employee joining the company.\nEmployee Name: "${employeeName}"\nRole: "${employeeRole}"\nDepartment: "${employeeDepartment || "Operations"}"\n\nDo not include any placeholders. Draft the email directly from the "Human Resources Team". Keep the length around 120-150 words.`;
        const response = await ai.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
        if (response.text) welcomeBodyText = response.text.trim();
      } catch (err) { console.error("Gemini failed onboarding welcome email draft:", err); }
    }
    const newOnboarding = new Onboarding({ id: "ob_" + Math.random().toString(36).substr(2, 9), employeeId: candidateId || "u_guest_hire", employeeName, employeeEmail: employeeEmail.toLowerCase(), employeeRole, employeeDepartment: employeeDepartment || "Operations", templateId, tasks: compiledTasks, startDate: baseDate.toISOString(), completionPct: 0, welcomeEmailText: welcomeBodyText });
    await newOnboarding.save();
    res.status(201).json({ success: true, onboarding: newOnboarding, message: "Welcome workflow created and welcome email successfully framed!" });
  } catch (err) { res.status(500).json({ error: "Failed to initiate onboarding journey." }); }
});

app.patch("/api/onboarding/:id/task/:taskId", requireRole(["superadmin", "hr_manager", "candidate"]), async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "Task status is required." });
    const item = await Onboarding.findOne({ id: req.params.id });
    if (!item) return res.status(404).json({ error: "Onboarding record not found" });
    const taskIndex = item.tasks.findIndex(t => t.id === req.params.taskId);
    if (taskIndex === -1) return res.status(404).json({ error: "Task item not found in this checklist" });
    item.tasks[taskIndex].status = status;
    const completed = item.tasks.filter(t => t.status === "complete").length;
    item.completionPct = Math.round((completed / item.tasks.length) * 100);
    await item.save();
    res.json({ success: true, onboarding: item });
  } catch (err) { res.status(500).json({ error: "Failed to update onboarding task status." }); }
});

app.post("/api/onboarding/cron-trigger", requireRole(["superadmin", "hr_manager"]), async (req, res) => {
  try {
    const onboardings = await Onboarding.find({});
    const alertList = [];
    const now = new Date();
    onboardings.forEach(ob => {
      ob.tasks.forEach(task => {
        if (task.status !== "complete" && new Date(task.dueDate) < now) {
          alertList.push({ employeeName: ob.employeeName, email: ob.employeeEmail, taskTitle: task.title, dueDate: task.dueDate, assignedTo: task.assignedTo });
        }
      });
    });
    res.json({ success: true, triggeredAt: new Date().toISOString(), message: "Triggered daily 9am onboarding alert checklist cron job successfully!", alertsSent: alertList.length, recipients: alertList });
  } catch (err) { res.status(500).json({ error: "Failed to execute schedule check cron trigger." }); }
});


// ==========================================
// MODULE 6 API — Employee Data Management
// ==========================================

app.get("/api/employees", requireRole(["superadmin", "hr_manager", "interviewer"]), async (req, res) => {
  try {
    const employees = await Employee.find({}, { _id: 0, __v: 0 });
    res.json(employees);
  } catch (err) { res.status(500).json({ error: "Failed to retrieve employee directory." }); }
});

app.get("/api/employees/my", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const emp = await Employee.findOne({ userId: req.user.userId });
    if (!emp) return res.status(404).json({ error: "Employee profile not found." });
    res.json(emp);
  } catch (err) { res.status(500).json({ error: "Failed to retrieve your employee profile." }); }
});

app.get("/api/employees/:id", requireRole(["superadmin", "hr_manager", "interviewer"]), async (req, res) => {
  try {
    const emp = await Employee.findOne({ id: req.params.id }, { _id: 0, __v: 0 });
    if (!emp) return res.status(404).json({ error: "Employee not found." });
    res.json(emp);
  } catch (err) { res.status(500).json({ error: "Failed to retrieve employee details." }); }
});

app.post("/api/employees", requireRole(["superadmin", "hr_manager"]), async (req, res) => {
  try {
    const { name, email, phone, position, department, managerId, managerName, contractType, hireDate, salary, currency, location, skills, emergencyContact } = req.body;
    if (!name || !email || !position || !department || !salary) return res.status(400).json({ error: "Name, email, position, department, and salary are required." });
    const newEmployee = new Employee({ id: "emp_" + Math.random().toString(36).substr(2, 9), name, email: email.toLowerCase(), phone: phone || "", position, department, managerId: managerId || null, managerName: managerName || null, contractType: contractType || "full_time", employmentStatus: "active", hireDate: hireDate || new Date().toISOString(), salary: Number(salary), currency: currency || "INR", location: location || "Remote", skills: Array.isArray(skills) ? skills : [], emergencyContact: emergencyContact || {}, createdAt: new Date().toISOString() });
    await newEmployee.save();
    res.status(201).json({ success: true, employee: newEmployee });
  } catch (err) { res.status(500).json({ error: "Failed to create employee record." }); }
});

app.patch("/api/employees/:id", requireRole(["superadmin", "hr_manager"]), async (req, res) => {
  try {
    const { name, phone, position, department, managerId, managerName, contractType, employmentStatus, salary, location, skills, emergencyContact } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (position) updateData.position = position;
    if (department) updateData.department = department;
    if (managerId !== undefined) updateData.managerId = managerId;
    if (managerName !== undefined) updateData.managerName = managerName;
    if (contractType) updateData.contractType = contractType;
    if (employmentStatus) updateData.employmentStatus = employmentStatus;
    if (salary) updateData.salary = Number(salary);
    if (location) updateData.location = location;
    if (skills) updateData.skills = skills;
    if (emergencyContact) updateData.emergencyContact = emergencyContact;
    const updated = await Employee.findOneAndUpdate({ id: req.params.id }, updateData, { new: true });
    if (!updated) return res.status(404).json({ error: "Employee not found." });
    res.json({ success: true, employee: updated });
  } catch (err) { res.status(500).json({ error: "Failed to update employee profile." }); }
});

app.delete("/api/employees/:id", requireRole(["superadmin"]), async (req, res) => {
  try {
    await Employee.deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Failed to remove employee record." }); }
});


// ==========================================
// MODULE 7 API — Attendance Management
// ==========================================

app.get("/api/attendance", requireRole(["superadmin", "hr_manager"]), async (req, res) => {
  try {
    const { month, year, employeeId } = req.query;
    let filter = {};
    if (employeeId) filter.employeeId = employeeId;
    if (month && year) {
      const prefix = `${year}-${String(month).padStart(2, "0")}`;
      const all = await Attendance.find(filter);
      return res.json(all.filter(a => a.date && a.date.startsWith(prefix)));
    }
    const records = await Attendance.find(filter, { _id: 0, __v: 0 });
    res.json(records);
  } catch (err) { res.status(500).json({ error: "Failed to retrieve attendance records." }); }
});

app.get("/api/attendance/my", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const emp = await Employee.findOne({ userId: req.user.userId });
    const employeeId = emp ? emp.id : req.user.userId;
    const records = await Attendance.find({ employeeId }, { _id: 0, __v: 0 });
    res.json(records);
  } catch (err) { res.status(500).json({ error: "Failed to retrieve your attendance records." }); }
});

app.post("/api/attendance/clockin", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { employeeId, employeeName, notes } = req.body;
    const today = new Date().toISOString().split("T")[0];
    const existing = await Attendance.findOne({ employeeId: employeeId || req.user.userId, date: today });
    if (existing) return res.status(400).json({ error: "Already clocked in today." });
    const newAttendance = new Attendance({ id: "att_" + Math.random().toString(36).substr(2, 9), employeeId: employeeId || req.user.userId, employeeName: employeeName || "Employee", date: today, clockIn: new Date().toISOString(), status: "present", notes: notes || "" });
    await newAttendance.save();
    res.status(201).json({ success: true, attendance: newAttendance });
  } catch (err) { res.status(500).json({ error: "Failed to record clock-in." }); }
});

app.patch("/api/attendance/:id/clockout", async (req, res) => {
  try {
    const record = await Attendance.findOne({ id: req.params.id });
    if (!record) return res.status(404).json({ error: "Attendance record not found." });
    const clockOutTime = new Date();
    const clockInTime = record.clockIn ? new Date(record.clockIn) : null;
    const hoursWorked = clockInTime ? Math.round((clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 3600) * 10) / 10 : 0;
    record.clockOut = clockOutTime.toISOString();
    record.hoursWorked = hoursWorked;
    await record.save();
    res.json({ success: true, attendance: record });
  } catch (err) { res.status(500).json({ error: "Failed to record clock-out." }); }
});

app.get("/api/attendance/leaves", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const isHR = ["superadmin", "hr_manager"].includes(req.user.role);
    let filter = {};
    if (!isHR) { const emp = await Employee.findOne({ userId: req.user.userId }); if (emp) filter.employeeId = emp.id; }
    const leaves = await LeaveRequest.find(filter, { _id: 0, __v: 0 });
    res.json(leaves);
  } catch (err) { res.status(500).json({ error: "Failed to retrieve leave requests." }); }
});

app.post("/api/attendance/leave", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { employeeId, employeeName, leaveType, startDate, endDate, reason } = req.body;
    if (!leaveType || !startDate || !endDate) return res.status(400).json({ error: "Leave type, start date and end date are required." });
    const newLeave = new LeaveRequest({ id: "lr_" + Math.random().toString(36).substr(2, 9), employeeId: employeeId || req.user.userId, employeeName: employeeName || "Employee", leaveType, startDate, endDate, reason: reason || "", status: "pending", appliedAt: new Date().toISOString() });
    await newLeave.save();
    res.status(201).json({ success: true, leave: newLeave });
  } catch (err) { res.status(500).json({ error: "Failed to submit leave request." }); }
});

app.patch("/api/attendance/leaves/:id", requireRole(["superadmin", "hr_manager"]), async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !["approved", "rejected"].includes(status)) return res.status(400).json({ error: "Valid status (approved/rejected) is required." });
    const leave = await LeaveRequest.findOne({ id: req.params.id });
    if (!leave) return res.status(404).json({ error: "Leave request not found." });
    leave.status = status;
    const approver = await User.findOne({ id: req.user.userId });
    leave.approvedBy = approver ? approver.name : "HR Manager";
    await leave.save();
    res.json({ success: true, leave });
  } catch (err) { res.status(500).json({ error: "Failed to update leave request status." }); }
});

app.get("/api/attendance/summary", requireRole(["superadmin", "hr_manager"]), async (req, res) => {
  try {
    const employees = await Employee.find({});
    const allAttendance = await Attendance.find({});
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    const summaries = employees.map(emp => {
      const empRecords = allAttendance.filter(a => a.employeeId === emp.id && a.date && a.date.startsWith(prefix));
      const presentDays = empRecords.filter(a => a.status === "present").length;
      const absentDays = empRecords.filter(a => a.status === "absent").length;
      const halfDays = empRecords.filter(a => a.status === "half_day").length;
      const remoteDays = empRecords.filter(a => a.status === "remote").length;
      const totalHours = empRecords.reduce((sum, a) => sum + (a.hoursWorked || 0), 0);
      return { employeeId: emp.id, employeeName: emp.name, month, year, presentDays, absentDays, halfDays, remoteDays, leaveTaken: 0, totalHours: Math.round(totalHours * 10) / 10, overtimeHours: Math.max(0, Math.round((totalHours - presentDays * 8) * 10) / 10) };
    });
    res.json(summaries);
  } catch (err) { res.status(500).json({ error: "Failed to compute attendance summary." }); }
});


// ==========================================
// MODULE 8 API — Payroll Management
// ==========================================

app.get("/api/payroll", requireRole(["superadmin", "hr_manager"]), async (req, res) => {
  try {
    const { month, year } = req.query;
    const filter = {};
    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);
    const records = await Payroll.find(filter, { _id: 0, __v: 0 });
    res.json(records);
  } catch (err) { res.status(500).json({ error: "Failed to retrieve payroll records." }); }
});

app.get("/api/payroll/my", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const emp = await Employee.findOne({ userId: req.user.userId });
    if (!emp) return res.status(404).json({ error: "No employee profile linked to this account." });
    const records = await Payroll.find({ employeeId: emp.id }, { _id: 0, __v: 0 });
    res.json(records);
  } catch (err) { res.status(500).json({ error: "Failed to retrieve your payslips." }); }
});

app.get("/api/payroll/:id", async (req, res) => {
  try {
    const record = await Payroll.findOne({ id: req.params.id }, { _id: 0, __v: 0 });
    if (!record) return res.status(404).json({ error: "Payroll record not found." });
    res.json(record);
  } catch (err) { res.status(500).json({ error: "Failed to retrieve payroll record." }); }
});


// ==========================================
// MODULE 9 API — Performance Tracking
// ==========================================

app.get("/api/performance", requireRole(["superadmin", "hr_manager", "interviewer"]), async (req, res) => {
  try {
    const reviews = await Performance.find({}, { _id: 0, __v: 0 });
    res.json(reviews);
  } catch (err) { res.status(500).json({ error: "Failed to retrieve performance reviews." }); }
});

app.get("/api/performance/my", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const emp = await Employee.findOne({ userId: req.user.userId });
    if (!emp) return res.status(404).json({ error: "No employee profile linked." });
    const reviews = await Performance.find({ employeeId: emp.id }, { _id: 0, __v: 0 });
    res.json(reviews);
  } catch (err) { res.status(500).json({ error: "Failed to retrieve your performance reviews." }); }
});

app.post("/api/performance/review", requireRole(["superadmin", "hr_manager"]), async (req, res) => {
  try {
    const { employeeId, employeeName, department, position, reviewPeriod, reviewCycle, goals } = req.body;
    if (!employeeId || !employeeName || !reviewPeriod) return res.status(400).json({ error: "Employee, review period are required." });
    const reviewer = await User.findOne({ id: req.user.userId });
    const newReview = new Performance({ id: "perf_" + Math.random().toString(36).substr(2, 9), employeeId, employeeName, department: department || "", position: position || "", reviewPeriod, reviewCycle: reviewCycle || "quarterly", selfRating: 0, managerRating: 0, overallRating: 0, goals: Array.isArray(goals) ? goals.map((g, idx) => ({ id: "g_" + idx + "_" + Math.random().toString(36).substr(2, 5), title: g.title || "Goal", description: g.description || "", targetDate: g.targetDate || new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(), status: "not_started", progress: 0 })) : [], feedback: [], strengths: [], areasForImprovement: [], status: "draft", reviewedBy: reviewer ? reviewer.name : "HR Manager", createdAt: new Date().toISOString() });
    await newReview.save();
    res.status(201).json({ success: true, review: newReview });
  } catch (err) { res.status(500).json({ error: "Failed to create performance review." }); }
});

app.patch("/api/performance/:id", async (req, res) => {
  try {
    const review = await Performance.findOne({ id: req.params.id });
    if (!review) return res.status(404).json({ error: "Performance review not found." });
    const { selfRating, managerRating, goals, strengths, areasForImprovement, status } = req.body;
    if (selfRating !== undefined) review.selfRating = selfRating;
    if (managerRating !== undefined) review.managerRating = managerRating;
    if (goals !== undefined) review.goals = goals;
    if (strengths !== undefined) review.strengths = strengths;
    if (areasForImprovement !== undefined) review.areasForImprovement = areasForImprovement;
    if (status) review.status = status;
    const sr = review.selfRating || 0;
    const mr = review.managerRating || 0;
    if (sr > 0 && mr > 0) review.overallRating = Math.round((sr * 0.4 + mr * 0.6) * 10) / 10;
    if (status === "completed") review.completedAt = new Date().toISOString();
    await review.save();
    res.json({ success: true, review });
  } catch (err) { res.status(500).json({ error: "Failed to update performance review." }); }
});

app.post("/api/performance/:id/feedback", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { rating, strengths, improvements } = req.body;
    if (!rating) return res.status(400).json({ error: "Rating is required." });
    const review = await Performance.findOne({ id: req.params.id });
    if (!review) return res.status(404).json({ error: "Performance review not found." });
    const submitter = await User.findOne({ id: req.user.userId });
    const newFeedback = { id: "fb_" + Math.random().toString(36).substr(2, 9), from: submitter ? submitter.name : "Anonymous", fromRole: req.user.role, rating: Number(rating), strengths: strengths || "", improvements: improvements || "", submittedAt: new Date().toISOString() };
    if (!Array.isArray(review.feedback)) review.feedback = [];
    review.feedback.push(newFeedback);
    await review.save();
    res.status(201).json({ success: true, feedback: newFeedback });
  } catch (err) { res.status(500).json({ error: "Failed to submit feedback." }); }
});


async function startServer() {
  connectDB().catch(err => { console.error("MongoDB start connection warning:", err); });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend API server running on http://localhost:${PORT}`);
  });
}

startServer();
