# ReviewMate Zoho Cliq Extension

ReviewMate is a Zoho Cliq extension designed for the CliqTrix 2026 contest. It accelerates code reviews by pairing smart reviewer assignment with a real-time dashboard that keeps developers on top of their pull requests.

## Features (Work in Progress)

- `/reviewme` — submit a GitHub/GitLab PR, auto-assign two reviewers, and store the record in the `code_reviews` database.
- `/reviewqueue` — list pending reviews assigned to the logged-in Cliq user, sorted by urgency with quick action buttons.
- `/reviewstatus` — show review progress for the user's submitted PRs, with polite reminders for stalled reviews.
- `/quickreview` — generate an AI-style summary and checklist by inspecting the PR diff via the GitHub API.
- Sidebar widget — dual-pane dashboard for assigned reviews vs. submitted PRs, plus real-time stats, notifications, and controls.

> ⚠️ The bot scripts and widget handler are being implemented incrementally. The manifest already declares their entry points so that future commits only need to fill in the Deluge logic and widget markup.

## Repository Layout

```
plugin-manifest.json   # Zoho Cliq extension manifest
deluge/bot_handler.ds  # (placeholder) Deluge bot logic for commands
deluge/widget_handler.ds # (placeholder) Widget data provider
deluge/setup_db.ds     # (placeholder) Database bootstrap script
widgets/widget.html    # (placeholder) Widget UI shell (HTML/CSS/JS)
assets/                # Icons and static assets
resources/             # Supporting docs, mock payloads, etc.
```

## Setup & Configuration

1. **Zoho Cliq Developer Console** — Create a new extension, upload `plugin-manifest.json`, and map the Deluge functions as they are completed.
2. **Secrets** — Add the manifest variables:
   - `GITHUB_PAT` (required): GitHub PAT with `repo` + `read:user`.
   - `GITLAB_PAT` (optional): GitLab PAT with `api`.
   - `ENABLE_SOUND_ALERTS` (optional): Toggle runtime notifications.
3. **Database** — Run `deluge/setup_db.ds` via the Developer Console once the script is implemented to ensure the `code_reviews` table exists.
4. **Testing** — Use a dedicated Cliq test organization so you can validate bot commands and widget rendering without impacting production teams.

## Roadmap Snapshot

- [ ] Implement Deluge helpers for GitHub/GitLab API calls with retry logic.
- [ ] Finish `/reviewme` flow, including reviewer assignment heuristics.
- [ ] Build `/reviewqueue`, `/reviewstatus`, and `/quickreview`.
- [ ] Create the HTML/CSS/JS widget with real-time polling + notifications.
- [ ] Add integration tests/mocks plus documentation and demo assets.

## Security & Compliance Notes

- Secrets are injected via Cliq variables and never logged or persisted.
- API calls will include exponential backoff and rate-limit handling.
- Personal data (user IDs, PR URLs) stays within the Zoho Cliq database.
- Widget UI will adhere to accessibility guidelines (semantic markup, color contrast).

---

For implementation guidance, consult the `docs/` folder once populated or reach out to the ReviewMate maintainers.
