import mongoose, { Schema } from "mongoose";
import crypto from "crypto";
import dotenv from "dotenv";

// Load .env before reading any env vars
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || "";

mongoose.set("bufferCommands", false);

export let isConnectedToMongo = false;
export let lastMongoError = null;

export const inMemoryStore = {
  User: [],
  Resume: [],
  Interview: [],
  Template: [],
  Onboarding: [],
  Employee: [],
  Attendance: [],
  LeaveRequest: [],
  Payroll: [],
  Performance: [],
};

let _reconnectTimer = null;

export async function connectDB() {
  try {
    seedInMemoryData();

    if (mongoose.connection.readyState >= 1) {
      isConnectedToMongo = true;
      return;
    }

    if (!MONGO_URI) {
      console.warn("No MONGODB_URI set. Running in In-Memory Database Mode.");
      scheduleReconnect();
      return;
    }

    console.log("Connecting database to MongoDB Atlas session...");
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 8000,
    });

    isConnectedToMongo = true;
    lastMongoError = null;
    if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
    console.log("✅ Successfully connected to MongoDB Cluster.");
    await seedMongoDatabase();
  } catch (error) {
    lastMongoError = error?.message || String(error);
    isConnectedToMongo = false;
    console.warn("⚠️  MongoDB connection failed. Falling back to In-Memory Database Mode. Will retry in 30s...");
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (_reconnectTimer) return;
  _reconnectTimer = setTimeout(async () => {
    _reconnectTimer = null;
    if (mongoose.connection.readyState >= 1) { isConnectedToMongo = true; return; }
    console.log("🔄 Retrying MongoDB connection...");
    try {
      if (!MONGO_URI) { scheduleReconnect(); return; }
      await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000, socketTimeoutMS: 8000 });
      isConnectedToMongo = true;
      lastMongoError = null;
      console.log("✅ MongoDB reconnected successfully.");
      await seedMongoDatabase();
    } catch (err) {
      lastMongoError = err?.message || String(err);
      isConnectedToMongo = false;
      console.warn("⚠️  Retry failed. Will retry again in 30s...");
      scheduleReconnect();
    }
  }, 30_000);
}

mongoose.connection.on("connected", () => { isConnectedToMongo = true; lastMongoError = null; });
mongoose.connection.on("error", (err) => { isConnectedToMongo = false; lastMongoError = err.message || String(err); });
mongoose.connection.on("disconnected", () => { isConnectedToMongo = false; });

export function hashPassword(password) {
  return crypto.pbkdf2Sync(password, "hr_salt_key_123!!", 1000, 64, "sha512").toString("hex");
}

// Schemas
const UserSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true },
  department: { type: String, default: "Operations" },
  createdAt: { type: String, required: true },
  isActive: { type: Boolean, default: true },
});

const ResumeSchema = new Schema({
  id: { type: String, required: true, unique: true },
  jobId: { type: String, required: true },
  jobTitle: { type: String, required: true },
  candidateName: { type: String, required: true },
  email: { type: String, required: true },
  fileUrl: { type: String },
  rawText: { type: String },
  aiScore: { type: Number },
  aiSummary: { type: String },
  skills: [{ type: String }],
  redFlags: [{ type: String }],
  recommendation: { type: String },
  status: { type: String, default: "pending" },
  uploadedAt: { type: String, required: true },
});

const InterviewSchema = new Schema({
  id: { type: String, required: true, unique: true },
  candidateId: { type: String },
  candidateName: { type: String, required: true },
  candidateEmail: { type: String, required: true },
  jobId: { type: String },
  jobRole: { type: String, required: true },
  questions: [{ questionId: { type: String, required: true }, questionText: { type: String, required: true } }],
  responses: [{ questionId: { type: String, required: true }, videoUrl: { type: String }, transcript: { type: String }, aiScore: { type: Number }, aiFeedback: { type: String } }],
  overallScore: { type: Number },
  status: { type: String, default: "scheduled" },
  scheduledAt: { type: String, required: true },
});

const TemplateSchema = new Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  department: { type: String, required: true },
  tasks: [{ title: { type: String, required: true }, relativeDays: { type: Number, required: true }, assignedTo: { type: String, required: true } }],
});

const OnboardingSchema = new Schema({
  id: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  employeeEmail: { type: String, required: true },
  employeeRole: { type: String, required: true },
  employeeDepartment: { type: String, required: true },
  templateId: { type: String, required: true },
  startDate: { type: String, required: true },
  tasks: [{ id: { type: String, required: true }, title: { type: String, required: true }, dueDate: { type: String, required: true }, status: { type: String, required: true }, assignedTo: { type: String, required: true } }],
  completionPct: { type: Number, default: 0 },
  welcomeEmailText: { type: String },
});

const EmployeeSchema = new Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  position: { type: String, required: true },
  department: { type: String, required: true },
  managerId: { type: String },
  managerName: { type: String },
  contractType: { type: String, default: "full_time" },
  employmentStatus: { type: String, default: "active" },
  hireDate: { type: String, required: true },
  salary: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  location: { type: String },
  skills: [{ type: String }],
  emergencyContact: { name: { type: String }, relationship: { type: String }, phone: { type: String } },
  createdAt: { type: String, required: true },
});

const AttendanceSchema = new Schema({
  id: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  date: { type: String, required: true },
  clockIn: { type: String },
  clockOut: { type: String },
  hoursWorked: { type: Number },
  status: { type: String, default: "present" },
  notes: { type: String },
});

const LeaveRequestSchema = new Schema({
  id: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  leaveType: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  reason: { type: String },
  status: { type: String, default: "pending" },
  approvedBy: { type: String },
  appliedAt: { type: String, required: true },
});

const PayrollSchema = new Schema({
  id: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  department: { type: String, required: true },
  position: { type: String, required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  baseSalary: { type: Number, required: true },
  bonuses: { type: Number, default: 0 },
  deductions: [{ label: { type: String }, amount: { type: Number } }],
  totalDeductions: { type: Number, default: 0 },
  netPay: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  status: { type: String, default: "draft" },
  processedAt: { type: String },
  paidAt: { type: String },
});

const PerformanceSchema = new Schema({
  id: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  department: { type: String, required: true },
  position: { type: String, required: true },
  reviewPeriod: { type: String, required: true },
  reviewCycle: { type: String, default: "quarterly" },
  selfRating: { type: Number, default: 0 },
  managerRating: { type: Number, default: 0 },
  overallRating: { type: Number, default: 0 },
  goals: [{ id: { type: String }, title: { type: String }, description: { type: String }, targetDate: { type: String }, status: { type: String, default: "not_started" }, progress: { type: Number, default: 0 } }],
  feedback: [{ id: { type: String }, from: { type: String }, fromRole: { type: String }, rating: { type: Number }, strengths: { type: String }, improvements: { type: String }, submittedAt: { type: String } }],
  strengths: [{ type: String }],
  areasForImprovement: [{ type: String }],
  status: { type: String, default: "draft" },
  reviewedBy: { type: String },
  createdAt: { type: String, required: true },
  completedAt: { type: String },
});

const RawUser = mongoose.model("User", UserSchema);
const RawResume = mongoose.model("Resume", ResumeSchema);
const RawInterview = mongoose.model("Interview", InterviewSchema);
const RawTemplate = mongoose.model("Template", TemplateSchema);
const RawOnboarding = mongoose.model("Onboarding", OnboardingSchema);
const RawEmployee = mongoose.model("Employee", EmployeeSchema);
const RawAttendance = mongoose.model("Attendance", AttendanceSchema);
const RawLeaveRequest = mongoose.model("LeaveRequest", LeaveRequestSchema);
const RawPayroll = mongoose.model("Payroll", PayrollSchema);
const RawPerformance = mongoose.model("Performance", PerformanceSchema);

function matchesFilter(item, filter) {
  if (!filter || Object.keys(filter).length === 0) return true;
  for (const key of Object.keys(filter)) {
    const filterVal = filter[key];
    if (key === "$or" && Array.isArray(filterVal)) {
      if (!filterVal.some(subFilter => matchesFilter(item, subFilter))) return false;
      continue;
    }
    const itemVal = item[key];
    if (typeof filterVal === "object" && filterVal !== null) {
      const operators = Object.keys(filterVal);
      if (operators.some(op => op.startsWith("$"))) {
        for (const op of operators) {
          const val = filterVal[op];
          if (op === "$ne" && itemVal === val) return false;
          if (op === "$in" && Array.isArray(val) && !val.includes(itemVal)) return false;
          if (op === "$nin" && Array.isArray(val) && val.includes(itemVal)) return false;
        }
        continue;
      }
    }
    if (typeof itemVal === "string" && typeof filterVal === "string") {
      if (itemVal.toLowerCase() !== filterVal.toLowerCase()) return false;
    } else if (itemVal != filterVal) return false;
  }
  return true;
}

function applyUpdate(item, update) {
  if (!update) return item;
  for (const k of Object.keys(update)) {
    if (k.startsWith("$")) {
      if (k === "$set") { Object.assign(item, update[k]); }
      else if (k === "$push") {
        for (const subKey of Object.keys(update[k])) {
          if (!Array.isArray(item[subKey])) item[subKey] = [];
          item[subKey].push(update[k][subKey]);
        }
      }
    } else { item[k] = update[k]; }
  }
  return item;
}

function wrapInMemorizedItem(item, modelName) {
  if (!item) return item;
  const clone = JSON.parse(JSON.stringify(item));
  Object.defineProperty(clone, "save", {
    value: async function() {
      const idx = inMemoryStore[modelName].findIndex(x => x.id === this.id);
      if (idx !== -1) inMemoryStore[modelName][idx] = JSON.parse(JSON.stringify(this));
      else inMemoryStore[modelName].push(JSON.parse(JSON.stringify(this)));
      if (mongoose.connection.readyState === 1) {
        try {
          const rawModels = { User: RawUser, Resume: RawResume, Interview: RawInterview, Template: RawTemplate, Onboarding: RawOnboarding, Employee: RawEmployee, Attendance: RawAttendance, LeaveRequest: RawLeaveRequest, Payroll: RawPayroll, Performance: RawPerformance };
          const rawModel = rawModels[modelName];
          if (rawModel) await rawModel.findOneAndUpdate({ id: this.id }, this, { upsert: true });
        } catch (e) { console.error(`Async mongo sync save failed for ${modelName}`, e); }
      }
      return this;
    },
    enumerable: false,
    writable: true
  });
  return clone;
}

function createAdaptiveModelProxy(rawModel) {
  const modelName = rawModel.modelName;
  return new Proxy(rawModel, {
    construct(target, args) {
      if (mongoose.connection.readyState === 1 && isConnectedToMongo) {
        try { return new target(...args); } catch (err) {}
      }
      return wrapInMemorizedItem(args[0] || {}, modelName);
    },
    get(target, prop, receiver) {
      if (prop === "countDocuments") {
        return async function(filter) {
          if (mongoose.connection.readyState === 1 && isConnectedToMongo) { try { return await target.countDocuments(filter); } catch (err) {} }
          return inMemoryStore[modelName].filter(x => matchesFilter(x, filter)).length;
        };
      }
      if (prop === "find") {
        return async function(filter, projection) {
          if (mongoose.connection.readyState === 1 && isConnectedToMongo) { try { return await target.find(filter, projection); } catch (err) {} }
          return inMemoryStore[modelName].filter(x => matchesFilter(x, filter)).map(x => wrapInMemorizedItem(x, modelName));
        };
      }
      if (prop === "findOne") {
        return async function(filter, projection) {
          if (mongoose.connection.readyState === 1 && isConnectedToMongo) { try { const res = await target.findOne(filter, projection); if (res) return res; } catch (err) {} }
          const found = inMemoryStore[modelName].find(x => matchesFilter(x, filter));
          return found ? wrapInMemorizedItem(found, modelName) : null;
        };
      }
      if (prop === "findOneAndUpdate") {
        return async function(filter, update, options) {
          if (mongoose.connection.readyState === 1 && isConnectedToMongo) { try { const res = await target.findOneAndUpdate(filter, update, options); if (res) return res; } catch (err) {} }
          let found = inMemoryStore[modelName].find(x => matchesFilter(x, filter));
          if (!found) {
            if (options && options.upsert) { found = { id: filter.id || "gen_" + Math.random().toString(36).substr(2, 9) }; inMemoryStore[modelName].push(found); }
            else return null;
          }
          applyUpdate(found, update);
          if (mongoose.connection.readyState === 1 && isConnectedToMongo) target.findOneAndUpdate(filter, update, options).catch(() => {});
          return wrapInMemorizedItem(found, modelName);
        };
      }
      if (prop === "deleteOne") {
        return async function(filter) {
          if (mongoose.connection.readyState === 1 && isConnectedToMongo) { try { return await target.deleteOne(filter); } catch (err) {} }
          const idx = inMemoryStore[modelName].findIndex(x => matchesFilter(x, filter));
          if (idx !== -1) {
            inMemoryStore[modelName].splice(idx, 1);
            if (mongoose.connection.readyState === 1 && isConnectedToMongo) target.deleteOne(filter).catch(() => {});
            return { deletedCount: 1 };
          }
          return { deletedCount: 0 };
        };
      }
      if (prop === "deleteMany") {
        return async function(filter) {
          if (mongoose.connection.readyState === 1 && isConnectedToMongo) { try { return await target.deleteMany(filter); } catch (err) {} }
          const initialCount = inMemoryStore[modelName].length;
          inMemoryStore[modelName] = inMemoryStore[modelName].filter(x => !matchesFilter(x, filter));
          if (mongoose.connection.readyState === 1 && isConnectedToMongo) target.deleteMany(filter).catch(() => {});
          return { deletedCount: initialCount - inMemoryStore[modelName].length };
        };
      }
      if (prop === "insertMany") {
        return async function(docs) {
          if (mongoose.connection.readyState === 1 && isConnectedToMongo) { try { return await target.insertMany(docs); } catch (err) {} }
          const processed = docs.map(d => { const item = JSON.parse(JSON.stringify(d)); inMemoryStore[modelName].push(item); return wrapInMemorizedItem(item, modelName); });
          if (mongoose.connection.readyState === 1 && isConnectedToMongo) target.insertMany(docs).catch(() => {});
          return processed;
        };
      }
      if (prop === "modelName") return modelName;
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function") return value.bind(target);
      return value;
    }
  });
}

export const User = createAdaptiveModelProxy(RawUser);
export const Resume = createAdaptiveModelProxy(RawResume);
export const Interview = createAdaptiveModelProxy(RawInterview);
export const Template = createAdaptiveModelProxy(RawTemplate);
export const Onboarding = createAdaptiveModelProxy(RawOnboarding);
export const Employee = createAdaptiveModelProxy(RawEmployee);
export const Attendance = createAdaptiveModelProxy(RawAttendance);
export const LeaveRequest = createAdaptiveModelProxy(RawLeaveRequest);
export const Payroll = createAdaptiveModelProxy(RawPayroll);
export const Performance = createAdaptiveModelProxy(RawPerformance);

export function seedInMemoryData() {
  if (inMemoryStore.User.length > 0) return;
  const defaultPasswordHash = hashPassword("password");

  inMemoryStore.User = [
    { id: "u1", name: "Alice Superadmin", email: "superadmin@hr.com", passwordHash: defaultPasswordHash, role: "superadmin", department: "Operation", createdAt: new Date().toISOString(), isActive: true },
    { id: "u2", name: "Marcus HR", email: "hr@hr.com", passwordHash: defaultPasswordHash, role: "hr_manager", department: "Human Resources", createdAt: new Date().toISOString(), isActive: true },
    { id: "u3", name: "Sonia Tech Lead", email: "interviewer@hr.com", passwordHash: defaultPasswordHash, role: "interviewer", department: "Engineering", createdAt: new Date().toISOString(), isActive: true },
    { id: "u4", name: "David Smith", email: "david@candidate.com", passwordHash: defaultPasswordHash, role: "candidate", department: "Engineering", createdAt: new Date().toISOString(), isActive: true },
  ];

  inMemoryStore.Resume = [
    { id: "r1", jobId: "j1", jobTitle: "Senior Frontend Engineer", candidateName: "David Smith", email: "david@candidate.com", fileUrl: "https://example.com/david-resume.pdf", rawText: "David Smith - Senior Frontend Developer. 5+ years React, Redux, Tailwind CSS, TypeScript, and Vite.", aiScore: 88, aiSummary: "Experienced Frontend Developer with solid expertise in React and modern tooling.", skills: ["React", "Redux", "Tailwind CSS", "TypeScript", "Vite", "CI/CD"], redFlags: ["Short tenure at previous contract"], recommendation: "shortlist", status: "processed", uploadedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString() },
    { id: "r2", jobId: "j1", jobTitle: "Senior Frontend Engineer", candidateName: "John Doe", email: "johndoe@example.com", fileUrl: "https://example.com/john-resume.pdf", rawText: "John Doe - Software enthusiast. HTML, CSS, JavaScript, WordPress.", aiScore: 42, aiSummary: "Candidate lacks senior-level experience.", skills: ["HTML", "CSS", "JavaScript", "WordPress"], redFlags: ["Lacks senior-level experience"], recommendation: "reject", status: "processed", uploadedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() },
    { id: "r3", jobId: "j2", jobTitle: "Technology Lead", candidateName: "Clara Oswald", email: "clara@oswald.com", fileUrl: "https://example.com/clara-resume.pdf", rawText: "Clara Oswald - AI Researcher. MSc in Data Science, focused on LLMs, RAG, Python, PyTorch, and Gemini API fine-tuning.", aiScore: 94, aiSummary: "Strong academic background and concrete workspace experience in RAG and major LLM interfaces.", skills: ["Python", "PyTorch", "LLMs", "RAG", "Vector Databases", "Gemini API"], redFlags: [], recommendation: "shortlist", status: "processed", uploadedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString() },
  ];

  inMemoryStore.Interview = [
    { id: "i1", candidateId: "u4", candidateName: "David Smith", candidateEmail: "david@candidate.com", jobId: "j1", jobRole: "Senior Frontend Engineer", questions: [{ questionId: "q1", questionText: "Can you explain how you optimize a slow React application?" }, { questionId: "q2", questionText: "How do you handle team conflicts regarding framework updates?" }], responses: [{ questionId: "q1", videoUrl: "demo_blob_1", transcript: "To optimize React performance, I use useMemo, useCallback, and dynamic import/React.lazy split loads.", aiScore: 92, aiFeedback: "Excellent coverage of standard React optimization patterns." }, { questionId: "q2", videoUrl: "demo_blob_2", transcript: "I usually set up objective proofs, like writing speed test and code coverage comparisons.", aiScore: 90, aiFeedback: "Strong collaborative leadership and objective problem-oriented mindset." }], overallScore: 91, status: "completed", scheduledAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString() },
    { id: "i2", candidateId: "cand_clara", candidateName: "Clara Oswald", candidateEmail: "clara@oswald.com", jobId: "j2", jobRole: "Technology Lead", questions: [{ questionId: "q3", questionText: "How do you control hallucination in LLM-powered pipelines?" }, { questionId: "q4", questionText: "Describe a project where you solved a major prompt injection issue." }], responses: [], status: "scheduled", scheduledAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString() },
  ];

  inMemoryStore.Template = [
    { id: "t1", title: "Standard Engineering Onboarding", department: "Engineering", tasks: [{ title: "Set up local environment, repo pull and build", relativeDays: 1, assignedTo: "New Hire" }, { title: "Security and compliance training completion", relativeDays: 2, assignedTo: "New Hire" }, { title: "Review architecture design with sonic system mentor", relativeDays: 3, assignedTo: "Manager" }, { title: "Deploy first micro-fix to sandbox/preview", relativeDays: 5, assignedTo: "New Hire" }] },
    { id: "t2", title: "HR and Compliance Checklist", department: "Operations", tasks: [{ title: "Sign insurance, tax forms, and payroll setups", relativeDays: 1, assignedTo: "New Hire" }, { title: "Company benefits sync with HR Team", relativeDays: 3, assignedTo: "HR Team" }, { title: "Set up Slack, Gmail, and Google Workspace calendar", relativeDays: 1, assignedTo: "IT Support" }] },
  ];

  inMemoryStore.Onboarding = [
    { id: "ob1", employeeId: "u4", employeeName: "David Smith", employeeEmail: "david@candidate.com", employeeRole: "Senior Frontend Engineer", employeeDepartment: "Engineering", templateId: "t1", startDate: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), tasks: [{ id: "task_1", title: "Set up local environment, repo pull and build", dueDate: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(), status: "complete", assignedTo: "New Hire" }, { id: "task_2", title: "Security and compliance training completion", dueDate: new Date(Date.now()).toISOString(), status: "in_progress", assignedTo: "New Hire" }, { id: "task_3", title: "Review architecture design with sonic system mentor", dueDate: new Date(Date.now() + 1 * 24 * 3600 * 1000).toISOString(), status: "todo", assignedTo: "Manager" }, { id: "task_4", title: "Deploy first micro-fix to sandbox/preview", dueDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(), status: "todo", assignedTo: "New Hire" }], completionPct: 25, welcomeEmailText: "Dear David,\n\nWelcome to the Engineering team as our new Senior Frontend Engineer! We are absolutely thrilled to have you bring your expertise in React to our core applications.\n\nBest regards,\nOperations Team" },
  ];

  inMemoryStore.Employee = [
    { id: "emp1", userId: "u2", name: "Marcus HR", email: "hr@hr.com", phone: "+91 555-234-5678", position: "HR Manager", department: "Human Resources", managerId: "u1", managerName: "Alice Superadmin", contractType: "full_time", employmentStatus: "active", hireDate: new Date(Date.now() - 730 * 24 * 3600 * 1000).toISOString(), salary: 1200000, currency: "INR", location: "Mumbai, MH", skills: ["Talent Acquisition", "HR Policy", "Performance Management", "Employee Relations"], emergencyContact: { name: "Sarah HR", relationship: "Spouse", phone: "+91 98765-43210" }, createdAt: new Date(Date.now() - 730 * 24 * 3600 * 1000).toISOString() },
    { id: "emp2", userId: "u3", name: "Sonia Tech Lead", email: "interviewer@hr.com", phone: "+91 555-345-6789", position: "Senior Technology Lead", department: "Engineering", managerId: "u1", managerName: "Alice Superadmin", contractType: "full_time", employmentStatus: "active", hireDate: new Date(Date.now() - 548 * 24 * 3600 * 1000).toISOString(), salary: 2800000, currency: "INR", location: "Bengaluru, KA", skills: ["TypeScript", "React", "Node.js", "System Architecture", "Team Leadership"], emergencyContact: { name: "James Lead", relationship: "Partner", phone: "+91 99887-76655" }, createdAt: new Date(Date.now() - 548 * 24 * 3600 * 1000).toISOString() },
    { id: "emp3", userId: "u4", name: "David Smith", email: "david@candidate.com", phone: "+91 555-456-7890", position: "Senior Frontend Engineer", department: "Engineering", managerId: "u3", managerName: "Sonia Tech Lead", contractType: "full_time", employmentStatus: "probation", hireDate: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(), salary: 1800000, currency: "INR", location: "Hyderabad, TS", skills: ["React", "TypeScript", "Vite", "Redux", "CSS", "CI/CD"], emergencyContact: { name: "Emma Smith", relationship: "Sister", phone: "+91 88776-65544" }, createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() },
    { id: "emp4", userId: null, name: "Priya Patel", email: "priya@wehire.com", phone: "+91 555-567-8901", position: "Product Designer", department: "Product", managerId: "u2", managerName: "Marcus HR", contractType: "full_time", employmentStatus: "active", hireDate: new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString(), salary: 1600000, currency: "INR", location: "Pune, MH", skills: ["Figma", "UX Research", "Prototyping", "Design Systems", "Accessibility"], emergencyContact: { name: "Raj Patel", relationship: "Father", phone: "+91 77665-54433" }, createdAt: new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString() },
    { id: "emp5", userId: null, name: "Carlos Rivera", email: "carlos@wehire.com", phone: "+91 555-678-9012", position: "Backend Engineer", department: "Engineering", managerId: "u3", managerName: "Sonia Tech Lead", contractType: "full_time", employmentStatus: "on_leave", hireDate: new Date(Date.now() - 200 * 24 * 3600 * 1000).toISOString(), salary: 2200000, currency: "INR", location: "Chennai, TN", skills: ["Node.js", "PostgreSQL", "Docker", "Kubernetes", "AWS"], emergencyContact: { name: "Maria Rivera", relationship: "Mother", phone: "+91 66554-43322" }, createdAt: new Date(Date.now() - 200 * 24 * 3600 * 1000).toISOString() },
    { id: "emp6", userId: null, name: "Nina Okafor", email: "nina@wehire.com", phone: "+91 555-789-0123", position: "Data Analyst", department: "Operations", managerId: "u2", managerName: "Marcus HR", contractType: "contract", employmentStatus: "active", hireDate: new Date(Date.now() - 120 * 24 * 3600 * 1000).toISOString(), salary: 1000000, currency: "INR", location: "Remote (India)", skills: ["Python", "SQL", "Tableau", "Power BI", "Statistics"], emergencyContact: { name: "John Okafor", relationship: "Brother", phone: "+91 55443-32211" }, createdAt: new Date(Date.now() - 120 * 24 * 3600 * 1000).toISOString() },
  ];

  const employees = ["emp1", "emp2", "emp3", "emp4", "emp5", "emp6"];
  const empNames = { emp1: "Marcus HR", emp2: "Sonia Tech Lead", emp3: "David Smith", emp4: "Priya Patel", emp5: "Carlos Rivera", emp6: "Nina Okafor" };
  const statuses = ["present", "present", "present", "present", "remote", "half_day"];
  let attIdx = 0;
  for (let d = 6; d >= 0; d--) {
    const dateObj = new Date(Date.now() - d * 24 * 3600 * 1000);
    const dateStr = dateObj.toISOString().split("T")[0];
    if (dateObj.getDay() === 0 || dateObj.getDay() === 6) continue;
    employees.forEach((empId, i) => {
      const status = empId === "emp5" ? "absent" : statuses[i % statuses.length];
      const clockInHour = 8 + Math.floor(Math.random() * 2);
      const clockInMin = Math.floor(Math.random() * 30);
      const hoursWorked = status === "half_day" ? 4 : 8 + Math.floor(Math.random() * 2);
      const clockInStr = `${dateStr}T0${clockInHour}:${clockInMin.toString().padStart(2, "0")}:00.000Z`;
      const clockOutStr = `${dateStr}T${(clockInHour + hoursWorked).toString().padStart(2, "0")}:${clockInMin.toString().padStart(2, "0")}:00.000Z`;
      inMemoryStore.Attendance.push({ id: `att_${attIdx++}`, employeeId: empId, employeeName: empNames[empId], date: dateStr, clockIn: status !== "absent" ? clockInStr : undefined, clockOut: status !== "absent" ? clockOutStr : undefined, hoursWorked: status !== "absent" ? hoursWorked : 0, status, notes: "" });
    });
  }

  inMemoryStore.LeaveRequest = [
    { id: "lr1", employeeId: "emp5", employeeName: "Carlos Rivera", leaveType: "sick", startDate: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split("T")[0], endDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split("T")[0], reason: "Medical procedure and recovery", status: "approved", approvedBy: "Marcus HR", appliedAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString() },
    { id: "lr2", employeeId: "emp3", employeeName: "David Smith", leaveType: "annual", startDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split("T")[0], endDate: new Date(Date.now() + 21 * 24 * 3600 * 1000).toISOString().split("T")[0], reason: "Family vacation", status: "pending", appliedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString() },
    { id: "lr3", employeeId: "emp4", employeeName: "Priya Patel", leaveType: "emergency", startDate: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split("T")[0], endDate: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split("T")[0], reason: "Family emergency", status: "approved", approvedBy: "Marcus HR", appliedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString() },
  ];

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const payrollData = [
    { empId: "emp1", name: "Marcus HR", dept: "Human Resources", pos: "HR Manager", base: 1200000 },
    { empId: "emp2", name: "Sonia Tech Lead", dept: "Engineering", pos: "Senior Technology Lead", base: 2800000 },
    { empId: "emp3", name: "David Smith", dept: "Engineering", pos: "Senior Frontend Engineer", base: 1800000 },
    { empId: "emp4", name: "Priya Patel", dept: "Product", pos: "Product Designer", base: 1600000 },
    { empId: "emp5", name: "Carlos Rivera", dept: "Engineering", pos: "Backend Engineer", base: 2200000 },
    { empId: "emp6", name: "Nina Okafor", dept: "Operations", pos: "Data Analyst", base: 1000000 },
  ];
  payrollData.forEach((p, i) => {
    const monthly = Math.round(p.base / 12);
    const bonus = i === 1 ? 25000 : i === 3 ? 8000 : 0;
    const tds = Math.round(monthly * 0.10);
    const pf = Math.round(Math.min(monthly, 15000) * 0.12);
    const professionalTax = 200;
    const totalDed = tds + pf + professionalTax;
    inMemoryStore.Payroll.push({ id: `pay_${i + 1}`, employeeId: p.empId, employeeName: p.name, department: p.dept, position: p.pos, month: currentMonth, year: currentYear, baseSalary: monthly, bonuses: bonus, deductions: [{ label: "TDS (Income Tax)", amount: tds }, { label: "Provident Fund (PF)", amount: pf }, { label: "Professional Tax", amount: professionalTax }], totalDeductions: totalDed, netPay: monthly + bonus - totalDed, currency: "INR", status: i < 4 ? "paid" : "processed", processedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), paidAt: i < 4 ? new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString() : undefined });
  });

  inMemoryStore.Performance = [
    { id: "perf1", employeeId: "emp2", employeeName: "Sonia Tech Lead", department: "Engineering", position: "Senior Technology Lead", reviewPeriod: "Q1 2026", reviewCycle: "quarterly", selfRating: 4.5, managerRating: 4.8, overallRating: 4.7, goals: [{ id: "g1", title: "Launch microservices migration", description: "Migrate monolith to microservices architecture", targetDate: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(), status: "achieved", progress: 100 }, { id: "g2", title: "Mentor 2 junior engineers", description: "Provide weekly 1:1s and code reviews", targetDate: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(), status: "in_progress", progress: 70 }, { id: "g3", title: "Reduce deployment time by 40%", description: "Optimize CI/CD pipelines", targetDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(), status: "in_progress", progress: 55 }], feedback: [{ id: "fb1", from: "Alice Superadmin", fromRole: "superadmin", rating: 5, strengths: "Exceptional technical leadership and architecture decisions.", improvements: "Could improve documentation habits.", submittedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString() }, { id: "fb2", from: "David Smith", fromRole: "interviewer", rating: 4, strengths: "Great mentor, always available for questions.", improvements: "Sometimes communication on blockers is delayed.", submittedAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString() }], strengths: ["System Architecture", "Technical Leadership", "Problem Solving", "Team Collaboration"], areasForImprovement: ["Documentation", "Delegating tasks more proactively"], status: "completed", reviewedBy: "Alice Superadmin", createdAt: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(), completedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() },
    { id: "perf2", employeeId: "emp3", employeeName: "David Smith", department: "Engineering", position: "Senior Frontend Engineer", reviewPeriod: "Probation Review 2026", reviewCycle: "probation", selfRating: 4.0, managerRating: 3.8, overallRating: 3.9, goals: [{ id: "g4", title: "Complete onboarding checklist", description: "Finish all onboarding tasks within 30 days", targetDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(), status: "in_progress", progress: 75 }, { id: "g5", title: "Ship first feature independently", description: "Design and implement the new dashboard widget", targetDate: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(), status: "not_started", progress: 0 }], feedback: [{ id: "fb3", from: "Sonia Tech Lead", fromRole: "interviewer", rating: 4, strengths: "Fast learner, high quality code from day one.", improvements: "Could ask more questions early.", submittedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() }], strengths: ["React Expertise", "Code Quality", "Fast Learning"], areasForImprovement: ["Proactive communication", "Time estimation accuracy"], status: "in_review", reviewedBy: "Sonia Tech Lead", createdAt: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString() },
    { id: "perf3", employeeId: "emp4", employeeName: "Priya Patel", department: "Product", position: "Product Designer", reviewPeriod: "Q1 2026", reviewCycle: "quarterly", selfRating: 4.2, managerRating: 4.5, overallRating: 4.4, goals: [{ id: "g6", title: "Redesign mobile app UX", description: "Complete UX overhaul for the mobile experience", targetDate: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(), status: "achieved", progress: 100 }, { id: "g7", title: "Create design system v2", description: "Document and expand the existing component library", targetDate: new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString(), status: "in_progress", progress: 40 }], feedback: [{ id: "fb4", from: "Marcus HR", fromRole: "hr_manager", rating: 4, strengths: "Highly organized, user-centric approach.", improvements: "Would benefit from more developer-side collaboration.", submittedAt: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString() }], strengths: ["UX Research", "Visual Design", "Stakeholder Collaboration", "Attention to Detail"], areasForImprovement: ["Cross-functional technical communication"], status: "completed", reviewedBy: "Marcus HR", createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(), completedAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString() },
  ];

  console.log("Adaptive Offline InMemory Database populated with HRMS core modules.");
}

async function seedMongoDatabase() {
  const userCount = await RawUser.countDocuments();
  if (userCount > 0) { console.log("MongoDB cluster already contains records. Skipping sync."); return; }
  console.log("Seeding initial records into your MongoDB Atlas Cluster...");
  await RawUser.insertMany(inMemoryStore.User);
  await RawResume.insertMany(inMemoryStore.Resume);
  await RawInterview.insertMany(inMemoryStore.Interview);
  await RawTemplate.insertMany(inMemoryStore.Template);
  await RawOnboarding.insertMany(inMemoryStore.Onboarding);
  await RawEmployee.insertMany(inMemoryStore.Employee);
  await RawAttendance.insertMany(inMemoryStore.Attendance);
  await RawLeaveRequest.insertMany(inMemoryStore.LeaveRequest);
  await RawPayroll.insertMany(inMemoryStore.Payroll);
  await RawPerformance.insertMany(inMemoryStore.Performance);
  console.log("In-Memory records successfully synchronized and written to MongoDB.");
}
