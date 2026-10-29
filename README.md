# PubPro — Publication Planning (proof of concept)

PubPro plans and tracks scientific publications (manuscripts, congress abstracts, posters,
presentations) through kick-off, drafting, author and internal review, and submission, with the
GPP and ICMJE checks built in.

- **Live app:** https://pubpro-production.up.railway.app
- **Code:** https://github.com/kristinaohill/pubpro (private)

Anything merged into `main` goes live within a few minutes, so please work on a branch and open a
pull request (see [Making changes](#making-changes)).

## Getting set up

1. **Accept the GitHub invite.** Use the invite email, or go to
   https://github.com/kristinaohill/pubpro/invitations while signed in. Invites expire after 7 days.
2. **Install Node.js** 24 or newer from https://nodejs.org (the LTS version). It runs PubPro.
3. **Install GitHub Desktop** from https://desktop.github.com and sign in with your GitHub account.
4. **Download the code.** In GitHub Desktop: **File → Clone Repository**, pick
   `kristinaohill/pubpro`, and choose a folder.
5. **Install what the app needs** (one time). In Terminal (Command Prompt on Windows), go to that
   folder and run:

   ```bash
   npm run install:all
   ```

## Running it on your computer

```bash
npm run dev
```

Open http://localhost:5173. Press Ctrl+C in Terminal to stop it.

Sign in with your @bplogix.com email and the shared PubPro test password (ask Kristina). The first
run creates your own database (`server/pubplanning.db`) with sample publications, plans and
authors. It's private to your computer: nothing you do locally touches the live site, and the live
site's data isn't copied down.

To start over with fresh sample data, stop the app, delete `server/pubplanning.db`, and run
`npm run dev` again.

## Making changes

1. In GitHub Desktop, **Fetch origin**, then **Pull**, so you start from the latest code.
2. **Current Branch → New Branch**, named after the change.
3. Make and test your changes locally.
4. **Commit**, then **Publish branch**, then **Create Pull Request**.
5. Kristina reviews and merges it, and the live site updates.

Please don't commit straight to `main`.

## Who can sign in

There is no self sign-up.

- **Internal users** (@bplogix.com) are created by a System Administrator: **Workspaces → System
  Administrator → Users → Add User**. Each user gets a role and the products they cover.
- **External authors** are added from a publication's **Authors** tab and sign in from the
  invitation the system sends them.

## How it's built

- **client/** — React 18 + Vite. Pages are in `client/src/pages`; the publication record's tabs
  are in `client/src/pages/publication-form`.
- **server/** — Node.js + Express, with SQLite through Node's built-in `node:sqlite`.
  - The compliance rules (signed authorship agreements before drafting, kick-off before drafting,
    proof for proxy approvals, posters approved on their own) are in `server/gates.js` and
    `server/kickoff.js`.
  - The client repeats some of these rules to show what's missing (`publication-form/kickoff.js`),
    so keep the two in step.
- **Auth** — JWT, stored in the browser.
- Locally the app runs on port 5173, and the API on port 3001.

## Hosting (Railway)

Railway builds and deploys every push to `main` (`railway.json`). The build runs `npm run build`
and starts `node server/index.js`; the health check is `/api/health`. The server serves the built
client, so it's one service.

The service has a volume mounted at `/data` and these variables:

- `DB_PATH` = `/data/pubplanning.db`
- `JWT_SECRET` = a long random string
- `ADMIN_PASSWORD` = the starting password for `admin@bplogix.com`. A brand-new database then sets
  every account to the shared test password once (`server/bplogixPeople.js`).

The hosted database is separate from everyone's local one.
