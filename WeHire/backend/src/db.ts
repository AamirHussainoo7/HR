import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";
import dotenv from "dotenv";

// Load .env before reading any env vars — this file is imported before server.ts calls dotenv.config()
dotenv.config();

// MONGO_URI must be set via the MONGODB_URI environment variable in .env
// If not set, the app gracefully falls back to in-memory database mode
const MONGO_URI = process.env.MONGODB_URI || "";

// Disable command buffering on Mongoose so that queries fail instantly and gracefully fall back to memory
mongoose.set("bufferCommands", false);

// Global state tracking connection status
export let isConnectedToMongo = false;
export let lastMongoError: string | null = null;

// High fidelity in-memory fallback databases
export const inMemoryStore: { [modelName: string]: any[] } = {
  User: [],
  Resume: [],
  Interview: [],
  Template: [],
  Onboarding: [],
};

let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export async function connectDB() {
  try {
    // ALWAYS load fallback datasets first so app is immediately viable
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
    
    // Set 8-second timeout — enough for Atlas cold starts
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 8000,
    });
    
    isConnectedToMongo = true;
    lastMongoError = null;
    if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
    console.log("✅ Successfully connected to MongoDB Cluster.");
    await seedMongoDatabase();
  } catch (error: any) {
    lastMongoError = error?.message || String(error);
    isConnectedToMongo = false;
    console.warn("⚠️  MongoDB connection failed. Falling back to In-Memory Database Mode. Will retry in 30s...");
    scheduleReconnect();
  }
}

// Auto-retry connection every 30 seconds when offline
function scheduleReconnect() {
  if (_reconnectTimer) return; // already scheduled
  _reconnectTimer = setTimeout(async () => {
    _reconnectTimer = null;
    if (mongoose.connection.readyState >= 1) {
      isConnectedToMongo = true;
      return;
    }
    console.log("🔄 Retrying MongoDB connection...");
    try {
      if (!MONGO_URI) { scheduleReconnect(); return; }
      await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 8000,
      });
      isConnectedToMongo = true;
      lastMongoError = null;
      console.log("✅ MongoDB reconnected successfully.");
      await seedMongoDatabase();
    } catch (err: any) {
      lastMongoError = err?.message || String(err);
      isConnectedToMongo = false;
      console.warn("⚠️  Retry failed. Will retry again in 30s...");
      scheduleReconnect(); // keep retrying
    }
  }, 30_000);
}


// Watch status change if anything reconnects
mongoose.connection.on("connected", () => {
  isConnectedToMongo = true;
  lastMongoError = null;
});
mongoose.connection.on("error", (err) => {
  isConnectedToMongo = false;
  lastMongoError = err.message || String(err);
});
mongoose.connection.on("disconnected", () => {
  isConnectedToMongo = false;
});

// Helper: Password hashing logic matching server.ts
export function hashPassword(password: string): string {
  return crypto.pbkdf2Sync(password, "hr_salt_key_123!!", 1000, 64, "sha512").toString("hex");
}

// User Schema
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

// Resume Schema
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

// Interview Schema
const InterviewSchema = new Schema({
  id: { type: String, required: true, unique: true },
  candidateId: { type: String },
  candidateName: { type: String, required: true },
  candidateEmail: { type: String, required: true },
  jobId: { type: String },
  jobRole: { type: String, required: true },
  questions: [{
    questionId: { type: String, required: true },
    questionText: { type: String, required: true },
  }],
  responses: [{
    questionId: { type: String, required: true },
    videoUrl: { type: String },
    transcript: { type: String },
    aiScore: { type: Number },
    aiFeedback: { type: String },
  }],
  overallScore: { type: Number },
  status: { type: String, default: "scheduled" },
  scheduledAt: { type: String, required: true },
});

// Onboarding Template Schema
const TemplateSchema = new Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  department: { type: String, required: true },
  tasks: [{
    title: { type: String, required: true },
    relativeDays: { type: Number, required: true },
    assignedTo: { type: String, required: true },
  }],
});

// Onboarding Progress Schema
const OnboardingSchema = new Schema({
  id: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  employeeEmail: { type: String, required: true },
  employeeRole: { type: String, required: true },
  employeeDepartment: { type: String, required: true },
  templateId: { type: String, required: true },
  startDate: { type: String, required: true },
  tasks: [{
    id: { type: String, required: true },
    title: { type: String, required: true },
    dueDate: { type: String, required: true },
    status: { type: String, required: true },
    assignedTo: { type: String, required: true },
  }],
  completionPct: { type: Number, default: 0 },
  welcomeEmailText: { type: String },
});

// Raw Mongoose Models
const RawUser = mongoose.model("User", UserSchema);
const RawResume = mongoose.model("Resume", ResumeSchema);
const RawInterview = mongoose.model("Interview", InterviewSchema);
const RawTemplate = mongoose.model("Template", TemplateSchema);
const RawOnboarding = mongoose.model("Onboarding", OnboardingSchema);

// Memory filter matcher
function matchesFilter(item: any, filter: any): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;
  
  for (const key of Object.keys(filter)) {
    const filterVal = filter[key];
    
    // Handle $or
    if (key === "$or" && Array.isArray(filterVal)) {
      if (!filterVal.some(subFilter => matchesFilter(item, subFilter))) {
        return false;
      }
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
    
    // Standard primitive match
    if (typeof itemVal === "string" && typeof filterVal === "string") {
      if (itemVal.toLowerCase() !== filterVal.toLowerCase()) {
        return false;
      }
    } else if (itemVal != filterVal) {
      return false;
    }
  }
  return true;
}

// Memory modifier
function applyUpdate(item: any, update: any) {
  if (!update) return item;
  for (const k of Object.keys(update)) {
    if (k.startsWith("$")) {
      if (k === "$set") {
        Object.assign(item, update[k]);
      } else if (k === "$push") {
        for (const subKey of Object.keys(update[k])) {
          if (!Array.isArray(item[subKey])) {
            item[subKey] = [];
          }
          item[subKey].push(update[k][subKey]);
        }
      }
    } else {
      item[k] = update[k];
    }
  }
  return item;
}

// Wrapped document item adding .save() ability
function wrapInMemorizedItem(item: any, modelName: string) {
  if (!item) return item;
  
  const clone = JSON.parse(JSON.stringify(item));
  
  Object.defineProperty(clone, "save", {
    value: async function() {
      // 1. Sync to memory list
      const idx = inMemoryStore[modelName].findIndex((x: any) => x.id === this.id);
      if (idx !== -1) {
        inMemoryStore[modelName][idx] = JSON.parse(JSON.stringify(this));
      } else {
        inMemoryStore[modelName].push(JSON.parse(JSON.stringify(this)));
      }
      
      // 2. Safely sync to MongoDB async if active
      if (mongoose.connection.readyState === 1) {
        try {
          const rawModels: any = {
            User: RawUser,
            Resume: RawResume,
            Interview: RawInterview,
            Template: RawTemplate,
            Onboarding: RawOnboarding
          };
          const rawModel = rawModels[modelName];
          if (rawModel) {
            await rawModel.findOneAndUpdate({ id: this.id }, this, { upsert: true });
          }
        } catch (e) {
          console.error(`Async mongo sync save failed for ${modelName}`, e);
        }
      }
      return this;
    },
    enumerable: false,
    writable: true
  });
  
  return clone;
}

// Adaptive model proxy creator
function createAdaptiveModelProxy(rawModel: any) {
  const modelName = rawModel.modelName;
  
  return new Proxy(rawModel, {
    construct(target: any, args: any[]) {
      if (mongoose.connection.readyState === 1 && isConnectedToMongo) {
        try {
          return new target(...args);
        } catch (err) {
          // ignore & fallback
        }
      }
      const data = args[0] || {};
      return wrapInMemorizedItem(data, modelName);
    },
    
    get(target: any, prop: string, receiver: any) {
      if (prop === "countDocuments") {
        return async function(filter: any) {
          if (mongoose.connection.readyState === 1 && isConnectedToMongo) {
            try {
              return await target.countDocuments(filter);
            } catch (err) {
              console.warn("Mongoose connect warning. Counting from in-memory.");
            }
          }
          return inMemoryStore[modelName].filter((x: any) => matchesFilter(x, filter)).length;
        };
      }
      
      if (prop === "find") {
        return async function(filter: any, projection: any) {
          if (mongoose.connection.readyState === 1 && isConnectedToMongo) {
            try {
              return await target.find(filter, projection);
            } catch (err) {
              console.warn("Mongoose connect warning. Finding from in-memory.");
            }
          }
          const filtered = inMemoryStore[modelName].filter((x: any) => matchesFilter(x, filter));
          return filtered.map((x: any) => wrapInMemorizedItem(x, modelName));
        };
      }
      
      if (prop === "findOne") {
        return async function(filter: any, projection: any) {
          if (mongoose.connection.readyState === 1 && isConnectedToMongo) {
            try {
              const res = await target.findOne(filter, projection);
              if (res) return res;
            } catch (err) {
              console.warn("Mongoose connect warning. Finding one from in-memory.");
            }
          }
          const found = inMemoryStore[modelName].find((x: any) => matchesFilter(x, filter));
          return found ? wrapInMemorizedItem(found, modelName) : null;
        };
      }
      
      if (prop === "findOneAndUpdate") {
        return async function(filter: any, update: any, options: any) {
          if (mongoose.connection.readyState === 1 && isConnectedToMongo) {
            try {
              const res = await target.findOneAndUpdate(filter, update, options);
              if (res) return res;
            } catch (err) {
              console.warn("Mongoose connect warning. Updating in-memory.");
            }
          }
          let found = inMemoryStore[modelName].find((x: any) => matchesFilter(x, filter));
          if (!found) {
            if (options && options.upsert) {
              found = { id: filter.id || "gen_" + Math.random().toString(36).substr(2, 9) };
              inMemoryStore[modelName].push(found);
            } else {
              return null;
            }
          }
          applyUpdate(found, update);
          
          // Async update mongo as well
          if (mongoose.connection.readyState === 1 && isConnectedToMongo) {
            target.findOneAndUpdate(filter, update, options).catch(() => {});
          }
          return wrapInMemorizedItem(found, modelName);
        };
      }
      
      if (prop === "deleteOne") {
        return async function(filter: any) {
          if (mongoose.connection.readyState === 1 && isConnectedToMongo) {
            try {
              return await target.deleteOne(filter);
            } catch (err) {
              console.warn("Mongoose connect warning. Deleting from in-memory.");
            }
          }
          const idx = inMemoryStore[modelName].findIndex((x: any) => matchesFilter(x, filter));
          if (idx !== -1) {
            inMemoryStore[modelName].splice(idx, 1);
            if (mongoose.connection.readyState === 1 && isConnectedToMongo) {
              target.deleteOne(filter).catch(() => {});
            }
            return { deletedCount: 1 };
          }
          return { deletedCount: 0 };
        };
      }
      
      if (prop === "deleteMany") {
        return async function(filter: any) {
          if (mongoose.connection.readyState === 1 && isConnectedToMongo) {
            try {
              return await target.deleteMany(filter);
            } catch (err) {
              console.warn("Mongoose connect warning. Batch deleting from in-memory.");
            }
          }
          const initialCount = inMemoryStore[modelName].length;
          inMemoryStore[modelName] = inMemoryStore[modelName].filter((x: any) => !matchesFilter(x, filter));
          if (mongoose.connection.readyState === 1 && isConnectedToMongo) {
            target.deleteMany(filter).catch(() => {});
          }
          const deletedCount = initialCount - inMemoryStore[modelName].length;
          return { deletedCount };
        };
      }
      
      if (prop === "insertMany") {
        return async function(docs: any[]) {
          if (mongoose.connection.readyState === 1 && isConnectedToMongo) {
            try {
              return await target.insertMany(docs);
            } catch (err) {
              console.warn("Mongoose connect warning. Soft inserting in-memory.");
            }
          }
          const processed = docs.map((d: any) => {
            const item = JSON.parse(JSON.stringify(d));
            inMemoryStore[modelName].push(item);
            return wrapInMemorizedItem(item, modelName);
          });
          if (mongoose.connection.readyState === 1 && isConnectedToMongo) {
            target.insertMany(docs).catch(() => {});
          }
          return processed;
        };
      }
      
      if (prop === "modelName") {
        return modelName;
      }
      
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function") {
        return value.bind(target);
      }
      return value;
    }
  });
}

// Export Proxied adaptive models!
export const User = createAdaptiveModelProxy(RawUser);
export const Resume = createAdaptiveModelProxy(RawResume);
export const Interview = createAdaptiveModelProxy(RawInterview);
export const Template = createAdaptiveModelProxy(RawTemplate);
export const Onboarding = createAdaptiveModelProxy(RawOnboarding);

// Load in-memory variables so App has immediate layout records online
export function seedInMemoryData() {
  if (inMemoryStore.User.length > 0) return;
  const defaultPasswordHash = hashPassword("password");

  inMemoryStore.User = [
    {
      id: "u1",
      name: "Alice Superadmin",
      email: "superadmin@hr.com",
      passwordHash: defaultPasswordHash,
      role: "superadmin",
      department: "Operation",
      createdAt: new Date().toISOString(),
      isActive: true,
    },
    {
      id: "u2",
      name: "Marcus HR",
      email: "hr@hr.com",
      passwordHash: defaultPasswordHash,
      role: "hr_manager",
      department: "Human Resources",
      createdAt: new Date().toISOString(),
      isActive: true,
    },
    {
      id: "u3",
      name: "Sonia Tech Lead",
      email: "interviewer@hr.com",
      passwordHash: defaultPasswordHash,
      role: "interviewer",
      department: "Engineering",
      createdAt: new Date().toISOString(),
      isActive: true,
    },
    {
      id: "u4",
      name: "David Smith",
      email: "david@candidate.com",
      passwordHash: defaultPasswordHash,
      role: "candidate",
      department: "Engineering",
      createdAt: new Date().toISOString(),
      isActive: true,
    },
  ];

  inMemoryStore.Resume = [
    {
      id: "r1",
      jobId: "j1",
      jobTitle: "Senior Frontend Engineer",
      candidateName: "David Smith",
      email: "david@candidate.com",
      fileUrl: "https://example.com/david-resume.pdf",
      rawText: "David Smith - Senior Frontend Developer. 5+ years React, Redux, Tailwind CSS, TypeScript, and Vite. Managed teams, built analytics tools, configured CI/CD pipelines.",
      aiScore: 88,
      aiSummary: "Experienced Frontend Developer with solid expertise in React and modern tooling. Strong team guidance and system architecture experience.",
      skills: ["React", "Redux", "Tailwind CSS", "TypeScript", "Vite", "CI/CD"],
      redFlags: ["Short tenure at previous contract"],
      recommendation: "shortlist",
      status: "processed",
      uploadedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "r2",
      jobId: "j1",
      jobTitle: "Senior Frontend Engineer",
      candidateName: "John Doe",
      email: "johndoe@example.com",
      fileUrl: "https://example.com/john-resume.pdf",
      rawText: "John Doe - Software enthusiast. Some coding experience with HTML, CSS, JavaScript, and a minor exposure to WordPress. Looking for a high-paying Senior React role.",
      aiScore: 42,
      aiSummary: "Candidate has basic frontend knowledge but lacks the required 5+ years of Senior level JavaScript/TypeScript and architectural layout design experience.",
      skills: ["HTML", "CSS", "JavaScript", "WordPress"],
      redFlags: ["Lacks senior-level experience, inflated expectations"],
      recommendation: "reject",
      status: "processed",
      uploadedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "r3",
      jobId: "j2",
      jobTitle: "Technology Lead",
      candidateName: "Clara Oswald",
      email: "clara@oswald.com",
      fileUrl: "https://example.com/clara-resume.pdf",
      rawText: "Clara Oswald - AI Researcher. MSc in Data Science, focused on LLMs, Retrieval-Augmented Generation (RAG), vector databases (ChromaDB, Pinecone), Python, PyTorch, and Gemini API fine-tuning.",
      aiScore: 94,
      aiSummary: "Strong academic background and concrete workspace experience in RAG and major LLM interfaces. Ideal match for the Technology Lead role.",
      skills: ["Python", "PyTorch", "LLMs", "RAG", "Vector Databases", "Gemini API"],
      redFlags: [],
      recommendation: "shortlist",
      status: "processed",
      uploadedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    },
  ];

  inMemoryStore.Interview = [
    {
      id: "i1",
      candidateId: "u4",
      candidateName: "David Smith",
      candidateEmail: "david@candidate.com",
      jobId: "j1",
      jobRole: "Senior Frontend Engineer",
      questions: [
        { questionId: "q1", questionText: "Can you explain how you optimize a slow React application?" },
        { questionId: "q2", questionText: "How do you handle team conflicts regarding framework updates?" },
      ],
      responses: [
        {
          questionId: "q1",
          videoUrl: "demo_blob_1",
          transcript: "To optimize React performance, I use useMemo, useCallback, and dynamic import/React.lazy split loads. I also inspect bundle sizes using rollup-analyzer and fix unnecessary re-renders using standard Profiler tools.",
          aiScore: 92,
          aiFeedback: "Excellent coverage of standard React optimization patterns. Mentioning bundler checks shows genuine engineering seniority.",
        },
        {
          questionId: "q2",
          videoUrl: "demo_blob_2",
          transcript: "I usually set up objective proofs, like writing speed test and code coverage comparisons, and review them as a group. This keeps ego out of technological decision pipelines.",
          aiScore: 90,
          aiFeedback: "Strong collaborative leadership and objective problem-oriented mindset.",
        }
      ],
      overallScore: 91,
      status: "completed",
      scheduledAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    },
    {
      id: "i2",
      candidateId: "cand_clara",
      candidateName: "Clara Oswald",
      candidateEmail: "clara@oswald.com",
      jobId: "j2",
      jobRole: "Technology Lead",
      questions: [
        { questionId: "q3", questionText: "How do you control hallucination in LLM-powered pipelines?" },
        { questionId: "q4", questionText: "Describe a project where you solved a major prompt injection issue." },
      ],
      responses: [],
      status: "scheduled",
      scheduledAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    },
  ];

  inMemoryStore.Template = [
    {
      id: "t1",
      title: "Standard Engineering Onboarding",
      department: "Engineering",
      tasks: [
        { title: "Set up local environment, repo pull and build", relativeDays: 1, assignedTo: "New Hire" },
        { title: "Security and compliance training completion", relativeDays: 2, assignedTo: "New Hire" },
        { title: "Review architecture design with sonic system mentor", relativeDays: 3, assignedTo: "Manager" },
        { title: "Deploy first micro-fix to sandbox/preview", relativeDays: 5, assignedTo: "New Hire" },
      ]
    },
    {
      id: "t2",
      title: "HR and Compliance Checklist",
      department: "Operations",
      tasks: [
        { title: "Sign insurance, tax forms, and payroll setups", relativeDays: 1, assignedTo: "New Hire" },
        { title: "Company benefits sync with HR Team", relativeDays: 3, assignedTo: "HR Team" },
        { title: "Set up Slack, Gmail, and Google Workspace calendar", relativeDays: 1, assignedTo: "IT Support" },
      ]
    }
  ];

  inMemoryStore.Onboarding = [
    {
      id: "ob1",
      employeeId: "u4",
      employeeName: "David Smith",
      employeeEmail: "david@candidate.com",
      employeeRole: "Senior Frontend Engineer",
      employeeDepartment: "Engineering",
      templateId: "t1",
      startDate: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      tasks: [
        { id: "task_1", title: "Set up local environment, repo pull and build", dueDate: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(), status: "complete", assignedTo: "New Hire" },
        { id: "task_2", title: "Security and compliance training completion", dueDate: new Date(Date.now()).toISOString(), status: "in_progress", assignedTo: "New Hire" },
        { id: "task_3", title: "Review architecture design with sonic system mentor", dueDate: new Date(Date.now() + 1 * 24 * 3600 * 1000).toISOString(), status: "todo", assignedTo: "Manager" },
        { id: "task_4", title: "Deploy first micro-fix to sandbox/preview", dueDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(), status: "todo", assignedTo: "New Hire" },
      ],
      completionPct: 25,
      welcomeEmailText: "Dear David,\n\nWelcome to the Engineering team as our new Senior Frontend Engineer! We are absolutely thrilled to have you bring your expertise in React, layout styling, and performance state optimization to our core applications. Over the coming weeks, you will be partnering with Sofia and sonia to roll out massive upgrades. Please reach out if you have any questions!\n\nBest regards,\nOperations Team"
    }
  ];
  console.log("Adaptive Offline InMemory Database populated.");
}

async function seedMongoDatabase() {
  const userCount = await RawUser.countDocuments();
  if (userCount > 0) {
    console.log("MongoDB cluster already contains records. Skipping sync.");
    return;
  }

  console.log("Seeding initial records into your MongoDB Atlas Cluster...");
  
  // Seed models with in-memory records
  await RawUser.insertMany(inMemoryStore.User);
  await RawResume.insertMany(inMemoryStore.Resume);
  await RawInterview.insertMany(inMemoryStore.Interview);
  await RawTemplate.insertMany(inMemoryStore.Template);
  await RawOnboarding.insertMany(inMemoryStore.Onboarding);
  
  console.log("In-Memory records successfully synchronized and written to MongoDB.");
}
