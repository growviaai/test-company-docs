# Company Docs Platform — build documents

Give these files to your AI coding assistant.

1. Put this whole folder into the repository as `docs/`.
2. Open `MASTER_PROMPT.md`, copy its prompt into the AI, and let it read `RULES.md` and files `00` to `14`.
3. Answer its questions, then approve each phase.

| File | Purpose |
|---|---|
| `MASTER_PROMPT.md` | The prompt that starts and steers the AI |
| `RULES.md` | Hard rules the AI must always follow |
| `00-README-for-AI.md` | Overview, locked stack, decisions, assumptions |
| `01-product-requirements.md` | What the product does |
| `02-architecture.md` | How the parts fit together |
| `03-database-schema.md` | Supabase tables and security |
| `04-auth-and-sessions.md` | Invites, sign-in, lockout, idle timeout, session termination |
| `05-roles-permissions.md` | Admin and Member permission matrix |
| `06-admin-panel.md` | Admin screens |
| `07-docs-editor.md` | Spaces, pages, editor, uploads |
| `08-comments-notifications.md` | Comments, mentions, notifications, email |
| `09-search-versions-audit.md` | Search, version history, audit log |
| `10-api-spec.md` | Every API endpoint |
| `11-design-system.md` | Design rules (uses `design/`) |
| `12-security.md` | Security checklist and test script |
| `13-deployment-git.md` | Hosting, environment variables, Git, CI |
| `14-build-plan.md` | Phases and checklists |
| `design/` | GitBook colors, typography, spacing, components |
| `reference-images/` | GitBook screenshots in dark and light mode, plus a list of the ones still to add |
