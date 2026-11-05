# Clearance mockups (Regeneron NPD steering committee, Nov 11)

Static screens for the deck. Fictional names and record IDs, no customer logo, no backend.

## Screenshots (1,440px wide)

| File | Screen |
|---|---|
| `1-coordinator-dashboard.png` | Coordinator dashboard: validation queue sorted by due date, Approvia AI flags, in-review records at risk |
| `2-requester-dashboard.png` | Requester dashboard: Start New Submission plus submissions in flight |
| `3a-intake-form-state-a.png` | Student Project Proposal, State A: Teacher Fellow, standard date, Expedited = No |
| `3b-intake-form-state-b.png` | State B: Student Intern + graduation year, date inside 6 business days, expedited reason, two departments |
| `3x-intake-form-clinical-hard-stop.png` | Extra: "related to a clinical program" = Yes stops the form |

## In the PubPro app (sign-in required)

- **Workspaces → Clearance Coordinator**: `/clearance/coordinator`
- **Workspaces → Clearance Requester**: `/clearance/requester` (its "Start New Submission" opens the form)
- **Create New → Student Project Proposal**: `/clearance/new-spp`. Add `?state=a`, `?state=b` or `?state=clinical` to open a captured state.

Live: https://pubpro-production.up.railway.app/clearance/coordinator

Hover a progress chevron for the step name and date, an Approvia AI flag for the field to check, or an info icon for what an answer triggers. The quick filters, AI flag expand, row menu and form answers respond to clicks. The screens use fixed sample data, not the signed-in user's records, and "today" is fixed at Thu Nov 5, 2026 so captures stay the same.

## Recapturing

The pages need a signed-in session, so capture them from a browser signed in to the local dev server (`npm run dev`, Vite on port 5173) at 1,440px wide, full page.

Source: `client/src/pages/mockups/regeneron/`; nav entries in `client/src/components/chrome.js`.
