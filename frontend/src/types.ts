/**
 * Types and interfaces for the AI Human Resources System.
 * Shared across the frontend and backend.
 */

export type UserRole = "superadmin" | "hr_manager" | "interviewer" | "candidate";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  department: string;
  createdAt: string;
  isActive: boolean;
}

export interface Resume {
  id: string;
  jobId: string;
  jobTitle: string;
  candidateName: string;
  email: string;
  fileUrl: string;
  rawText: string;
  aiScore?: number; // 0-100
  aiSummary?: string; // 2 sentences summary
  skills?: string[];
  redFlags?: string[];
  recommendation?: "shortlist" | "maybe" | "reject";
  status: "pending" | "processed" | "failed";
  uploadedAt: string;
}

export interface InterviewQuestion {
  questionId: string;
  questionText: string;
  durationSeconds?: number;
}

export interface InterviewResponse {
  questionId: string;
  videoUrl?: string; // Local media blob URL or base64 indicator
  transcript: string;
  aiScore: number;
  aiFeedback: string;
}

export interface Interview {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobId: string;
  jobRole: string;
  questions: InterviewQuestion[];
  responses: InterviewResponse[];
  overallScore?: number;
  status: "scheduled" | "in_progress" | "completed";
  scheduledAt: string;
}

export interface OnboardingTask {
  id: string;
  title: string;
  dueDate: string;
  status: "todo" | "in_progress" | "complete";
  assignedTo: string;
}

export interface OnboardingTemplateTask {
  title: string;
  relativeDays: number;
  assignedTo: string;
}

export interface OnboardingTemplate {
  id: string;
  title: string;
  department: string;
  tasks: OnboardingTemplateTask[];
}

export interface Onboarding {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeeRole: string;
  employeeDepartment: string;
  templateId: string;
  tasks: OnboardingTask[];
  startDate: string;
  completionPct: number;
  welcomeEmailText?: string;
}

export type HiringStage = "applied" | "screened" | "interviewed" | "offered" | "hired";

export interface AnalyticsSummary {
  funnel: {
    stage: HiringStage;
    label: string;
    count: number;
  }[];
  avgResumeScoreJob: {
    jobTitle: string;
    avgScore: number;
    count: number;
  }[];
  completionRateDept: {
    department: string;
    scheduledCount: number;
    completedCount: number;
    ratePct: number;
  }[];
  timeToHireDays: {
    role: string;
    avgDays: number;
  }[];
  skillFrequency: {
    text: string;
    value: number;
  }[];
  candidateSources: {
    source: string;
    count: number;
  }[];
}
