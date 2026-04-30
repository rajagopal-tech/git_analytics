# Git Dev Analytics

A MERN stack web app that analyzes GitHub repository commit history and surfaces developer behavior insights through an interactive dashboard.

---

## What it does

Paste one or more GitHub repo URLs, and the app clones them, parses every commit, and computes 8 metrics:

| Metric | What it measures |
|---|---|
| **Total Commits** | All non-merge commits, broken down by year, day, and author |
| **Late Night Work** | Commits between 20:00–04:59 — after-hours pressure signal |
| **Weekend Work** | Saturday/Sunday commits — overwork or passion project indicator |
| **Churn Rate** | Commits with fix/revert/delete/remove — rework signal |
| **Burnout Risk** | Longest consecutive-day commit streak (Low / Medium / High) |
| **Commit Quality** | % following conventional format (`feat(scope): description`) |
| **Large Commits** | Commits changing >100 lines — hard to review, risky to merge |
| **Languages** | Languages detected from file extensions in the latest commit |

Each metric card shows a brief description and opens a detail modal with charts and a full commit table.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS v4, Recharts, TanStack Query |
| Backend | Node.js, Express 4, simple-git |
| Database | MongoDB + Mongoose |

---

## Project structure

```
git-dev-analytics/
├── server/                  Express REST API
│   ├── index.js             Entry point — connects MongoDB, starts server
│   ├── models/Analysis.js   Mongoose schema for cached analysis results
│   ├── routes/analyze.js    All API endpoints
│   └── services/analyzer.js Core git analysis engine
│
└── client/                  React frontend (Vite)
    └── src/
        ├── App.jsx
        ├── api/index.js     Axios API calls
        ├── hooks/           TanStack Query hooks
        └── components/      UI components and charts
```

---

## API endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/analyze` | Analyze repos — `{ repoUrls[], timezone, forceRefresh }` |
| `GET` | `/api/results` | List all cached analyses |
| `GET` | `/api/results/:repoName` | Get one cached analysis |
| `DELETE` | `/api/results/:repoName` | Delete one cached analysis |
| `GET` | `/api/summary` | Aggregate summary of all cached repos |
| `GET` | `/api/clones` | List cloned repo folders with disk size |
| `DELETE` | `/api/clones/:repoName` | Delete one cloned repo folder |
| `DELETE` | `/api/clones` | Delete all cloned repo folders |
| `GET` | `/health` | Server + MongoDB health check |

---

## Getting started

**Prerequisites:** Node.js 18+, MongoDB running locally (or set `MONGO_URI` to Atlas)

```bash
# 1. Install dependencies
cd server && npm install
cd ../client && npm install

# 2. Configure environment
cp server/.env.example server/.env
# Edit server/.env if needed

# 3. Start backend (terminal 1)
cd server && npm run dev

# 4. Start frontend (terminal 2)
cd client && npm run dev
```

Open `http://localhost:5173`

---

## Environment variables (`server/.env`)

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/gitAnalytics
CLIENT_URL=http://localhost:5173
```
