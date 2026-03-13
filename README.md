# CollabBoard — Real-Time Collaborative Workspace

A full-stack collaborative workspace tool (Trello-style) with real-time sync, role-based access control, and optimistic UI updates.

## Architecture

### Backend (Node.js / Express / Socket.io / MongoDB)
- **REST API** — auth, workspaces, boards, cards (CRUD + move)
- **WebSocket layer** — Socket.io for real-time card sync, presence tracking, cursor broadcasting
- **Auth** — JWT-based authentication with bcrypt password hashing
- **RBAC** — three roles per workspace: `owner`, `editor`, `viewer` with middleware enforcement
- **MongoDB schemas** — User, Workspace (with embedded members), Board (with embedded columns), Card (with embedded comments). Compound indexes on `board+column+order`, `members.user`, etc.

### Frontend (React / Vite / Zustand)
- **Zustand** state management with Immer for immutable updates
- **Optimistic UI** — cards are created/updated/moved/deleted instantly on the client, with server reconciliation and rollback on failure
- **Socket.io client** — listens for remote changes and merges them into local state
- **Drag & drop** — native HTML5 drag-and-drop for moving cards between columns
- **Real-time presence** — shows online users in each workspace via avatar badges

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Copy env
cp server/.env.example server/.env

# Start dev (server + client concurrently)
npm run dev
```

Server runs on `http://localhost:3001`, client on `http://localhost:5173`.

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Embedded columns in Board | Columns are always fetched with their board; no separate collection needed |
| Referenced cards (separate collection) | Cards can grow large (comments, assignees) and need independent queries |
| Compound index on `board + column + order` | Supports efficient sorted card fetching within a column |
| Optimistic updates with snapshot rollback | Instant UI response; reverts cleanly if the server rejects |
| Socket.io rooms per workspace + board | Scoped broadcasts — users only receive events for the board they're viewing |
| Rate limiting on API | 200 requests per 15-minute window to prevent abuse |

## API Endpoints

### Auth
- `POST /api/auth/register` — create account
- `POST /api/auth/login` — sign in
- `GET /api/auth/me` — get current user

### Workspaces
- `GET /api/workspaces` — list user's workspaces
- `POST /api/workspaces` — create workspace
- `GET /api/workspaces/:id` — get workspace
- `PATCH /api/workspaces/:id` — update (owner)
- `POST /api/workspaces/:id/members` — invite member (owner)
- `DELETE /api/workspaces/:id/members/:userId` — remove member (owner)

### Boards
- `GET /api/workspaces/:wsId/boards` — list boards
- `POST /api/workspaces/:wsId/boards` — create board
- `GET /api/workspaces/:wsId/boards/:id` — get board + cards
- `PATCH /api/workspaces/:wsId/boards/:id` — update board
- `DELETE /api/workspaces/:wsId/boards/:id` — delete board (owner)

### Cards
- `POST .../boards/:boardId/cards` — create card
- `PATCH .../cards/:cardId` — update card
- `PATCH .../cards/:cardId/move` — move card (column + reorder)
- `DELETE .../cards/:cardId` — delete card
- `POST .../cards/:cardId/comments` — add comment

## Socket Events

| Event | Direction | Description |
|---|---|---|
| `workspace:join` | Client → Server | Join workspace room for presence |
| `workspace:presence` | Server → Client | Updated list of online users |
| `board:join` | Client → Server | Join board room for card updates |
| `card:created/updated/moved/deleted` | Bidirectional | Real-time card changes |
| `cursor:move` | Client → Server → Clients | Live cursor positions |
