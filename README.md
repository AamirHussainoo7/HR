<div align="center">

# 🧠 WeHire — Human-First Talent Portal

**AI-powered recruitment platform that eliminates bias, automates interviews, and streamlines onboarding — end to end.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-hr--theta--umber.vercel.app-6366f1?style=for-the-badge&logo=vercel)](https://hr-theta-umber.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render)](https://render.com)
[![AI](https://img.shields.io/badge/AI-Gemini%202.0-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

</div>

---

## 📌 Overview

**WeHire** is a full-stack, AI-driven HR platform built for modern talent teams. It brings together resume screening, structured video interviews, automated onboarding, and real-time analytics — all under one role-based workspace.

Powered by **Google Gemini 2.0**, WeHire scores resumes against job roles, generates custom interview question sets, transcribes video sessions, and produces actionable hiring intelligence — in seconds.

---

## ✨ Features at a Glance

| Module | Description |
|---|---|
| 🔍 **Resume Screening** | AI scores resumes 0–100, highlights capabilities & red flags |
| 🎥 **Video Interviews** | Schedule campaigns, review webcam sessions, score transcripts |
| 📋 **Onboarding Board** | Assign checklists, track milestones, automate daily alerts |
| 📊 **HR Analytics** | Hiring funnel, compatibility scores, department performance |
| 🛡️ **Superadmin Control** | Invite users, manage roles, activate / deactivate accounts |
| 🔐 **Role-Based Access** | Superadmin · HR Manager · Interviewer · Candidate |

---

## 🖼️ Screenshots

### 🏠 Login / Landing Page

> Elegant dark-mode landing with split-panel layout — tagline on the left, secure login form on the right. Sandbox persona quick-access cards let evaluators jump straight into any role.

![Login Page](assest/Screenshot%20(1082).png)

---

### 🔍 Resume Screening

> Paste raw resume text, select a target position, and hit **Inject Profile to Queue**. Gemini returns an alignment score, detected skills, red flags, and a full CV summary. Bulk AI screening is supported for entire candidate pools.

![Resume Screening](assest/Screenshot%20(1083).png)

---

### 🎥 Video Interviews

> Create interview campaigns per candidate and role. Active sessions display real-time status (Scheduled / Completed) with AI-generated question sets. Select any session to enter the review portal and score the recording.

![Video Interviews](assest/Screenshot%20(1084).png)

---

### 📋 Onboarding Board

> Launch onboarding workflows by assigning reusable checklist templates to new hires. Track task completion live and simulate the daily 9am automated alert cron for overdue duties.

![Onboarding Board](assest/Screenshot%20(1085).png)

---

### 📊 HR Analytics

> Real-time **Recruitment Analytics Studio** — view total applicants, shortlist pass rate, interview completion rate, and average time-to-hire. Drill into the hiring funnel and compatibility scores by role and department.

![HR Analytics](assest/Screenshot%20(1086).png)

---

### 🛡️ Superadmin Control

> Invite new workspace members with pre-assigned roles and departments. The **Workspace Identity Directory** gives a full view of all users — manage access tiers and activate/deactivate accounts in one click.

![Superadmin Control](assest/Screenshot%20(1087).png)

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 + TypeScript | UI framework |
| Vite 6 | Build tool & dev server |
| Tailwind CSS v4 | Utility-first styling |
| Lucide React | Icon library |
| Motion (Framer) | Animations |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API server |
| TypeScript | Type-safe server code |
| MongoDB Atlas + Mongoose | Database & ODM |
| Google Gemini 2.0 (`@google/genai`) | AI screening, scoring & transcription |
| CORS + dotenv | Config & security |

### Infrastructure
| Service | Role |
|---|---|
| Vercel | Frontend deployment |
| Render | Backend deployment |
| MongoDB Atlas | Cloud database |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **MongoDB Atlas** account (free tier works)
- **Google Gemini API Key** — get one at [aistudio.google.com](https://aistudio.google.com/api-keys)

---

### 1. Clone the Repository

```bash
git clone https://github.com/AamirHussainoo7/HR.git
cd HR
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file based on the example:

```bash
cp .env.example .env
```

Fill in your credentials:

```env
GEMINI_API_KEY="your_gemini_api_key_here"
MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<database>"
APP_URL="http://localhost:5173"
```

Start the backend dev server:

```bash
npm run dev
```

Backend will run on **http://localhost:3001** (or the port defined in your config).

---

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create a `.env` file:

```bash
cp .env.example .env
```

Set the backend API URL:

```env
VITE_API_URL=http://localhost:3001
```

Start the frontend dev server:

```bash
npm run dev
```

Frontend will run on **http://localhost:5173**.

---

## 🧪 Demo Access

The live demo at [hr-theta-umber.vercel.app](https://hr-theta-umber.vercel.app) includes **Sandbox Persona Quick Access** — use the preset role cards to log in instantly:

| Role | Access Level | Credentials |
|---|---|---|
| **Super Admin** | Full workspace control | Use preset card |
| **HR Manager** | Screen, Onboard, Analytics | Use preset card |
| **Interviewer** | Reviews, Question Scoring | Use preset card |
| **Candidate** | Webcam Portal & Onboarding | Use preset card |

> 🔑 Demo bypass password for all presets: **`password`**

---

## 🌐 Deployment

### Frontend → Vercel

1. Push your repo to GitHub
2. Import the project at [vercel.com](https://vercel.com)
3. Set root directory to `frontend`
4. Add environment variable: `VITE_API_URL=<your_render_backend_url>`

### Backend → Render

The `render.yaml` in the repo root is pre-configured. In the Render dashboard, set these secret environment variables manually:

```
MONGODB_URI   →  your MongoDB Atlas URI
GEMINI_API_KEY →  your Gemini API key
```

Render will auto-build and deploy the backend on every push.

---

## 📁 Project Structure

```
HR/
├── assest/                  # Screenshots & media
├── backend/
│   ├── src/
│   │   └── server.ts        # Express API server
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ResumeScreening.tsx
│   │   │   ├── VideoInterview.tsx
│   │   │   ├── Onboarding.tsx
│   │   │   ├── Analytics.tsx
│   │   │   └── ...
│   │   └── App.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── render.yaml              # Render deployment config
└── README.md
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ❤️ using **React**, **Express**, and **Google Gemini AI**

⭐ Star this repo if you found it useful!

</div>
