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

## Live pages (no sign-in)

- https://pubpro-production.up.railway.app/mockups/regeneron (index)
- `/mockups/regeneron/coordinator`
- `/mockups/regeneron/requester`
- `/mockups/regeneron/intake?state=a`, `?state=b`, `?state=clinical`

Hover a progress chevron for the step name and date, an Approvia AI flag for the field to check, or an info icon for what an answer triggers. The quick filters, AI flag expand, row menu and form answers respond to clicks. "Today" is fixed at Thu Nov 5, 2026 so captures stay the same.

## Recapturing

Run the client dev server (`npm run dev`, Vite on port 5173), then capture with headless Chrome at 1,440px, for example:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --window-size=1440,1640 --virtual-time-budget=8000 --screenshot=1-coordinator-dashboard.png http://localhost:5173/mockups/regeneron/coordinator
```

Source: `client/src/pages/mockups/regeneron/`.
