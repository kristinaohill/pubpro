# PubPlanner — Scientific Publication Management

A full-stack web app for managing scientific publications (manuscripts, congress abstracts, posters, oral presentations) for pharma company clients.

## Setup

```bash
# From the project root (Claude Pub Planning/):
npm install
npm --prefix server install --ignore-scripts   # uses Node 22+ built-in sqlite
npm --prefix client install
```

> **Note:** The server uses Node's built-in `node:sqlite` module (available in Node 22+). No native compilation needed.

## Running

```bash
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:3001

## Deploying (Railway)

The server serves the built client, so the app is one Railway service. `railway.json` runs
`npm run build` and `npm start`, with a health check at `/api/health`.

1. Push this folder to a GitHub repo, then in Railway: **New Project → Deploy from GitHub repo**.
2. Add a **Volume** to the service, mounted at `/data` (this is where the database lives).
3. Set these service **Variables**:
   - `DB_PATH` = `/data/pubplanning.db`
   - `JWT_SECRET` = any long random string
   - `ADMIN_PASSWORD` = the password for admin@example.com (used when the database is first created)
4. **Settings → Networking → Generate Domain** to get the public URL.

People open the URL and use **Create an account** on the login page. The hosted database starts
empty apart from the admin account; local data in `server/pubplanning.db` is not uploaded.

## Default Login

- **Email:** admin@example.com
- **Password:** admin123

## Features

- **Dashboard** — upcoming milestones and recent publications
- **Clients** — manage pharma company clients (admin only)
- **Workflow Config** — define stages/steps/milestones per client + pub type (admin only)
- **Publication Plans** — group publications by campaign
- **Publication Detail** — metadata editing + Gantt chart timeline
- **Gantt Chart** — custom SVG chart with collapsible stages, step bars, milestone diamonds, today line

## Seeded Data

On first run, the database auto-creates and seeds:
- Client: Acme Pharma
- Workflow templates for all 4 publication types (Manuscript, Congress Abstract, Poster, Oral Presentation)
- Example plan: Q3 2026 Publications

## Stack

- **Frontend:** React + Vite (port 5173)
- **Backend:** Node.js + Express (port 3001)
- **Database:** SQLite via Node built-in `node:sqlite`
- **Auth:** JWT (stored in localStorage)
