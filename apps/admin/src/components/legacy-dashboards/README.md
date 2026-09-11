# Legacy dashboard drafts

These four components previously lived in `apps/admin/src/pages/`. Next.js
treats `src/pages/` as the Pages Router, so each file with a default-exported
component was being served as a real, publicly reachable route — `/GuardRoster`,
`/ReportsDashboard`, `/SLAEscalationUI` and `/SocietyDashboard` — sitting
entirely outside the App Router tree and therefore outside the admin session
check in `src/context/AdminAuthContext.js`. Anyone who knew the path could load
an internal society/SLA dashboard without logging in.

Nothing in the codebase imports them, and every one of them renders hardcoded
placeholder rows rather than live API data, so they were never finished screens.

They are kept here, out of the routing tree, so the markup can be reused when
these screens are built for real. Before shipping any of them: render it from a
tab under `src/app/`, replace the hardcoded arrays with a call through
`src/lib/api.js`, and confirm it inherits the admin auth guard.
