# ReviewMate

ReviewMate is a full-stack GitHub pull-request review companion. It ingests PR metadata from GitHub, auto-classifies review workload, stores everything in MongoDB, and delivers a sleek dashboard so teams can triage reviews faster.

## Project Overview

### What It Does
- Fetches GitHub PR details (lines changed, author, status) via the REST API.
- Persists each PR in MongoDB so teams can monitor review queues.
- Provides a React dashboard for submitting PRs, browsing queues, and cleaning up entries.

### Key Features
- `/reviewme`-style submission flow via the web form (paste PR URL + PAT).
- Priority indicators based on lines changed (High/Medium/Low).
- Cards with status, repository, author, and change metrics.
- Delete controls for clearing stale reviews.
- REST API suitable for future integrations (bots, widgets, automations).
- JWT authentication with encrypted GitHub token storage and user-scoped queues.
- Live WebSocket updates powered by Socket.io with toast notifications for new/updated/deleted reviews.
- Interactive dashboard filters (status, priority, repository) plus sort controls for lines/files/date.
- CSV batch import with background processing and live progress events.
- Built-in analytics for status distribution, review time, active repositories, and top contributors.
- Email notifications for status changes and daily pending-review digests (via SMTP).

### Tech Stack
- **Backend:** Node.js 20, Express, Mongoose, Axios, Socket.io, Jest, Supertest.
- **Frontend:** React 18 + Vite, TailwindCSS, React Hook Form, React Icons, Socket.io Client, Vitest, React Testing Library.
- **Database:** MongoDB (local or Atlas).
- **Tooling:** Docker (optional), ESLint, npm workspaces (logical separation).

## Project Structure

```
reviewmate-local/
├── backend/
│   ├── config/        # Database helpers
│   ├── middleware/    # Auth middleware
│   ├── models/        # Mongoose schemas
│   ├── realtime/      # Socket.io bootstrap + emit helpers
│   ├── routes/        # Auth, GitHub, review endpoints
│   └── server.js      # App entry point
└── frontend/
    └── src/
        ├── components/   # AuthPanel, PRForm, PRCard
        ├── services/     # Axios + auth helpers
        └── App.jsx       # Dashboard + realtime wiring
```

## Prerequisites
- **Node.js:** v20.x or higher (matches Docker images and ensures ESM compatibility).
- **MongoDB:** Local MongoDB Community Server 6.x _or_ a MongoDB Atlas cluster.
- **GitHub Account:** Needed to create personal access tokens (PATs) for API calls.

## Installation Steps

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-org/reviewmate-local.git
   cd reviewmate-local
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   ```
   Edit `.env` with your values (see [Environment Variables](#environment-variables)).
   - `JWT_SECRET`, `GITHUB_TOKEN_SECRET` are mandatory for auth.
   - Configure `SMTP_*` + `CLIENT_ORIGIN` to enable email notifications and Socket.io CORS restrictions.

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   cp .env.example .env
   ```
   - `VITE_API_URL`: Typically `http://localhost:5001/api`.
   - `VITE_SOCKET_URL`: Typically `http://localhost:5001` (no `/api`).

4. **Database Setup**
   - Start MongoDB locally (`brew services start mongodb-community` on macOS or `mongod`).
   - OR provision a free MongoDB Atlas cluster and grab the connection string (remember to whitelist your IP and add credentials).

5. **Run the Application**
   ```bash
   # Terminal 1 - backend
   cd backend
   npm run dev    # http://localhost:5001

   # Terminal 2 - frontend
   cd frontend
   npm run dev    # http://localhost:5173
   ```
   Register or log in via the Auth panel, then submit a PR URL from the dashboard to see cards populate.

## Environment Variables

| Variable     | Location  | Description                                      |
| ------------ | --------- | ------------------------------------------------ |
| `MONGODB_URI`| backend   | Mongo connection string (`mongodb://127.0.0.1:27017/reviewmate` for local). |
| `PORT`       | backend   | Port for Express (defaults to `5001`).           |
| `JWT_SECRET` | backend   | Secret key for signing JWT access tokens.       |
| `GITHUB_TOKEN_SECRET` | backend | Secret used to encrypt stored GitHub tokens (32+ chars recommended). |
| `VITE_API_URL` | frontend | Base URL for API calls (default `http://localhost:5001/api`). |
| `VITE_SOCKET_URL` | frontend | Socket.io base (default `http://localhost:5001`). |
| `CLIENT_ORIGIN` | backend (optional) | Restrict Socket.io CORS to a specific origin (e.g., `http://localhost:5173`). |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | backend (optional) | Configure to enable email notifications + daily digest. |
| `DIGEST_CRON` | backend (optional) | Cron syntax for daily digest (default `0 9 * * *`). |

> Never commit `.env` files. Use `.env.example` as the template.

## API Documentation

> All `/api/github/*` and `/api/reviews/*` endpoints require an `Authorization: Bearer <jwt>` header obtained from `/api/auth/register` or `/api/auth/login`.

### 1. `POST /api/github/fetch-pr`
Fetches PR metadata from GitHub and stores it.

> Requires `Authorization: Bearer <jwt>` header returned by the auth endpoints.

**Request Body**
```json
{
  "prUrl": "https://github.com/octocat/Hello-World/pull/1347",
  "githubToken": "ghp_xxx"
}
```

**Response (201)**
```json
{
  "prId": "octocat/Hello-World#1347",
  "author": "octocat",
  "repository": "octocat/Hello-World",
  "status": "open",
  "priority": "High",
  "filesChanged": 5,
  "linesChanged": 250,
  "additions": 200,
  "deletions": 50,
  "description": "Adds feature...",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

Errors include standard HTTP codes plus messages (`400` invalid URL, `404` GitHub missing PR, `409` duplicate entry).

### 2. `GET /api/reviews`
Returns all stored reviews for the authenticated user. Supports optional query parameters:

| Query Param | Values | Description |
| ----------- | ------ | ----------- |
| `status`    | `open` `closed` `merged` `all` | Filter by PR status. |
| `priority`  | `High` `Medium` `Low` `all` | Filter by ReviewMate priority. |
| `repository`| repo slug or `all` | Filter by repo. |
| `sortBy`    | `date` `lines` `files` | Sort field. |
| `sortDir`   | `asc` `desc` | Sort direction. |

**Response (200)**
```json
[
  {
    "prId": "octocat/Hello-World#1347",
    "status": "open",
    "priority": "High",
    "author": "octocat",
    "repository": "octocat/Hello-World",
    "...": "..."
  }
]
```

### 3. `GET /api/reviews/:prId`
Fetch a single review by `owner/repo#number`.

### 4. `DELETE /api/reviews/:prId`
Delete a stored review. Returns `{ "message": "Review deleted" }` when successful.

### Authentication Endpoints

#### `POST /api/auth/register`
Body:
```json
{
  "email": "dev@example.com",
  "password": "StrongPass123",
  "githubToken": "ghp_xxx"
}
```
Response:
```json
{
  "token": "<jwt>",
  "user": { "id": "...", "email": "dev@example.com" }
}
```

#### `POST /api/auth/login`
Body includes `email` + `password`. Returns the same `{ token, user }` payload.

#### `PUT /api/auth/token`
Authenticated route for rotating your stored GitHub token:
```json
{ "githubToken": "ghp_new" }
```
Response: `{ "message": "GitHub token updated" }`.

### Realtime Events
ReviewMate uses Socket.io (`VITE_SOCKET_URL`) and expects clients to connect with `auth: { token: <jwt> }`. Events are user-scoped:

| Event            | Payload                              | Description                          |
| ---------------- | ------------------------------------- | ------------------------------------ |
| `review.created` | `Review` document                     | Fired when a new PR is stored.       |
| `review.updated` | `Review` document                     | Fired when metadata/status changes.  |
| `review.deleted` | `{ prId: string }`                    | Fired when a PR is removed.          |
| `batch.progress` | `{ batchId, total, processed, ... }`  | Fired as CSV imports run.            |

### 5. `POST /api/reviews/batch`
Uploads a CSV file (`file` field) containing PR URLs. Processes each PR asynchronously and emits `batch.progress` websocket events.

**Response (202)**
```json
{ "batchId": "uuid", "total": 5 }
```

### 6. `GET /api/reviews/analytics`
Returns aggregate data for dashboards:
```json
{
  "statusCounts": { "open": 3, "closed": 1, "merged": 2 },
  "averageReviewTimeHours": 5.5,
  "repositoryActivity": [{ "repo": "org/repo", "count": 4 }],
  "topContributors": [{ "author": "octocat", "count": 3 }]
}
```

## GitHub Token Setup
1. Visit https://github.com/settings/tokens (classic tokens are fine for dev).
2. Click **Generate new token** → **Generate new token (classic)**.
3. Name it (e.g., “ReviewMate Dev”), optionally set an expiration.
4. Select scopes:
   - `repo` (or `public_repo` if you only need public data).
   - `read:user`.
5. Generate and copy the token. Paste it into the ReviewMate form when submitting PRs. Keep it secure; you can revoke it anytime in the same settings page.

## Usage
- **Authenticate:** Use the dashboard’s Auth panel to register (email, password, GitHub PAT) or log in. The PAT is encrypted and reused for GitHub calls.
- **Submit a PR:** Paste the GitHub PR URL and optionally override the stored PAT, then click “Fetch & Save PR.”
- **View Reviews:** Cards appear below the form with repository, status emoji, author, and change stats. Only your own PRs are shown.
- **Delete Reviews:** Click the `Remove` button on a card to clear it (sends `DELETE /api/reviews/:prId`).
- **Stay in Sync:** Keep the dashboard open to receive WebSocket notifications whenever ReviewMate ingests, updates, or deletes a PR.
- **Filter & Sort:** Use the filters panel (status, priority, repository, sort options) to zero in on the work that matters.
- **Batch Import:** Upload a CSV of PR URLs and monitor progress live in the Batch Import panel.
- **Analytics:** ReviewMate automatically summarizes status counts, average review time, busiest repos, and top contributors.
- **Email Alerts:** Configure SMTP variables to receive status-change notifications and daily digests of pending reviews.

### Batch Import Tips

- CSV format: one PR URL per line (no header needed). Example:
  ```csv
  https://github.com/org/repo/pull/12
  https://github.com/org/repo/pull/45
  ```
- Upload via the Batch Import widget; ReviewMate processes each PR asynchronously and streams progress via WebSocket events (`batch.progress`).
- Keep the dashboard open to observe “in progress” and “completed” batches with success/failure counts.

## Screenshots
- Dashboard Overview: `![ReviewMate Dashboard](docs/screenshots/dashboard-placeholder.png)`
- PR Submission Form: `![Review Submission](docs/screenshots/review-form-placeholder.png)`

(Replace placeholders with actual screenshots under `docs/screenshots/`.)

## Deployment

### Heroku (Backend)
1. Create a Heroku app.
2. Provision the [MongoDB Atlas add-on] or supply your Atlas URI via config vars.
3. Set config vars: `MONGODB_URI`, `PORT=5001`, `NODE_ENV=production`, `JWT_SECRET`, `GITHUB_TOKEN_SECRET`.
4. Push the backend folder: `git subtree push --prefix backend heroku main` or use a dedicated repo.

### Vercel (Frontend)
1. Import the `frontend/` directory as a Vercel project.
2. Set `VITE_API_URL` to the public URL of your backend (e.g., `https://reviewmate-api.herokuapp.com/api`).
3. Deploy; Vercel builds via `npm run build`.

### MongoDB Atlas
1. Create free cluster at https://www.mongodb.com/cloud/atlas.
2. Create a database user (copy username/password).
3. Allow network access for your deployment IPs.
4. Use the provided connection string as `MONGODB_URI`.

## Troubleshooting
| Issue | Cause | Fix |
| ----- | ----- | --- |
| `ECONNREFUSED mongodb://...` | MongoDB not running or URI incorrect | Start `mongod` or update `MONGODB_URI`. |
| `GitHub API call failed (403)` | PAT missing scopes or rate-limited | Regenerate PAT with `repo` scope or wait for reset. |
| Frontend can’t reach API | Wrong `VITE_API_URL` or backend port | Update `.env` and restart `npm run dev`. |
| Docker containers crash | Ports in use or env missing | Check `docker compose logs`, adjust ports, ensure `.env` copied. |
| `401 Authorization header missing` | Not logged in / token expired | Re-authenticate via `/api/auth/login` or the dashboard’s Auth panel. |
| Socket connection errors | `VITE_SOCKET_URL` or `CLIENT_ORIGIN` mismatch | Ensure both values reference the deployed backend base URL. |

## Email Notifications

- Populate `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` in `backend/.env` to enable transactional messages.
- ReviewMate emails the owner whenever a tracked PR changes status (open → closed/merged, etc.).
- A daily digest (default 9:00 AM server time) summarizes open reviews; override the schedule with `DIGEST_CRON` if necessary.

## Scripts

| Location | Command       | Description |
| -------- | ------------- | ----------- |
| backend  | `npm run dev` | Start Express via nodemon |
| backend  | `npm start`   | Production start |
| backend  | `npm test`    | Jest + Supertest suite |
| frontend | `npm run dev` | Start Vite dev server |
| frontend | `npm run build` | Build SPA assets |
| frontend | `npm test`    | Vitest + RTL |

## Notes

- GitHub access tokens are encrypted server-side with `GITHUB_TOKEN_SECRET` and never returned once stored.
- Priority is derived from total line churn (>400 High, >100 Medium, else Low) to mimic ReviewMate constraints.
- DELETE support is exposed in the UI via the trash icon on each PR card.

## Docker Workflow
1. `docker compose build`
2. `docker compose up -d`
3. Visit:
   - Frontend → http://localhost:3000
   - Backend → http://localhost:5001
   - MongoDB → mongodb://localhost:27017

Tear down with `docker compose down` (add `-v` to remove volumes).

> Update `JWT_SECRET` and `GITHUB_TOKEN_SECRET` in `docker-compose.yml` before deploying beyond local demos.
> Set `CLIENT_ORIGIN` and `VITE_SOCKET_URL` to your public URLs when hosting the containers.

## Testing Overview
- Backend: `npm test` spins up mongodb-memory-server + Nock mocks.
- Frontend: `npm test` runs Vitest/jsdom specs for forms, cards, API helpers, and state transitions.

## License

Released under the [MIT License](LICENSE). Use, modify, and distribute as needed—just keep the copyright notice.

---
Happy hacking with ReviewMate!
