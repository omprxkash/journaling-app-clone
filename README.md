# Journal

> A personal writing space that lives in your browser first, syncs to the cloud when you want it to, and never asks you to pay to read your own words.

I built this because I got tired of journaling apps that feel more like products than notebooks. They either lock your entries behind a subscription, require a Wi-Fi connection just to open a blank page, or push you into their own heading structures and block types. I wanted something that gets out of the way — a clean Markdown editor, a calendar that shows whether I actually showed up to write, and the confidence that everything I write is mine, stored locally, readable offline.

This is the full source code. It's a complete, working, production-ready web app — not a tutorial or a skeleton. If you want to run it, fork it, learn from it, or build something similar, everything is here.

---

## What you get

A two-panel layout: a sidebar with your entry list, search, and tags on the left; a full-width Markdown editor on the right. At the bottom of the sidebar there's a 52-week writing heatmap that fills in as you write more.

**Write in Markdown.** The editor is CodeMirror 6, which means it handles mobile, line wrapping, copy-paste from other tools, and Markdown syntax highlighting without getting in the way. Every keystroke is saved automatically to your browser's IndexedDB — there's no save button because you shouldn't need one.

**Tag your entries.** Create colour-coded tags (pick any hex colour) and attach them to entries. The sidebar shows tag chips you can click to filter. Tags are per-user — so "work" can mean whatever it means to you.

**Log your mood.** Each entry can have a mood attached: happy, neutral, sad, or anxious. It shows up as an emoji in the sidebar and you can read back over time to spot patterns you wouldn't otherwise notice.

**Search.** When you're online and synced, search runs against PostgreSQL's full-text search engine — fast, stemmed, ranked by relevance. When you're offline, it falls back to a case-insensitive substring search over your local entries. You never get a blank result page because you're on a plane.

**Heatmap calendar.** A 52×7 SVG grid of the past year. The colour intensity of each square is based on word count (not just "did I write at all") — so a 1,500-word processing session looks different from a two-line note. There's a streak counter next to it.

**Local-first, sync optional.** Everything goes to IndexedDB immediately. The backend sync is opt-in — if you never set up the server, the app still fully works. If you do set it up, entries sync in the background whenever you're online, with conflict resolution and automatic retry.

---

## The idea behind local-first

Most web apps store your data on a server and show it to your browser. If the server is down, or your internet is slow, or you're offline — you get a loading spinner. That's the wrong default for something as personal as a journal.

Local-first flips this: your browser is the primary store. IndexedDB holds everything. The server is a sync target, not a gatekeeper. You write immediately, it saves immediately, and sync happens in the background without you thinking about it.

The sync logic in this app works like this:

1. **On mount**, the `useSync` hook checks when you last synced. It fetches all entries updated since then from the server and upserts them into your local IndexedDB — newer remote version wins.

2. **When you create, edit, or delete an entry**, the change goes to IndexedDB first. A record is also written to a `syncQueue` table: `{ entryId, operation: 'create'|'update'|'delete', timestamp }`.

3. **Also on mount**, the hook drains the sync queue — pushing each pending operation to the REST API. If a request fails (network error, server unavailable), it retries with exponential backoff: 2 seconds, then 4, then 8, up to 5 attempts. After 5 failures it leaves the item in the queue for the next session.

4. **Conflict resolution** is last-write-wins on `updatedAt`. If you edited an entry on your phone while offline and your laptop also edited it, whichever was saved most recently wins when the two devices finally sync. This is the simplest strategy that works without operational transforms.

```
You type something
      ↓
  IndexedDB   ←←← always first, immediate
      ↓
  syncQueue   ←←← pending operations recorded here
      ↓  (background, on next mount)
  REST API
      ↓
  PostgreSQL
```

---

## Tech stack and why each piece is here

### Frontend

| Library | Version | Why |
|---|---|---|
| React | 18 | Concurrent rendering, wide ecosystem |
| TypeScript | 5 | Catches mistakes before they reach the browser |
| Vite | 5 | Cold starts in milliseconds, native ESM, no webpack config maze |
| CodeMirror | 6 | Modular, mobile-friendly, proper Markdown support, extensible |
| Zustand | 4 | Global state without providers or reducers — just functions |
| Dexie.js | 3 | IndexedDB with a sane API, TypeScript types, live reactive queries |
| Tailwind CSS | 3 | Utility-first keeps styles colocated with components |
| Axios | 1 | Cleaner API than fetch, interceptors, typed responses |
| date-fns | 3 | Tree-shakeable, no prototype pollution |

**Why Dexie over raw IndexedDB?** Raw IndexedDB is callback-based and verbose. Dexie gives you a clean promise API, TypeScript generics, and — most importantly — `useLiveQuery`, which makes Dexie tables behave like reactive state. When you write to the database, every component that queries it re-renders automatically.

**Why Zustand over Redux or Context?** Zustand stores are just functions. No actions, no reducers, no `dispatch`. The whole app state fits in two stores: `entryStore` (the list of entries, which entry is selected) and `uiStore` (sidebar open/closed, active tag filter, current user, theme). Both live outside the component tree so hooks can read them from anywhere.

**Why CodeMirror 6 over a simple textarea?** Line wrapping, syntax-aware copy/paste, mobile input events, and the option to add vim mode or other extensions later. The editor is purely an uncontrolled component — it fires `onChange` callbacks and you save to Dexie on a debounce. There's no React state holding the editor content.

### Backend

| Library | Version | Why |
|---|---|---|
| Node.js | 20 | LTS, native fetch, stable |
| Express | 4 | Familiar, minimal, well-understood middleware model |
| Prisma | 5 | Type-safe ORM, migrations, excellent DX |
| PostgreSQL | 16 | Built-in full-text search, battle-tested, `tsvector` is first-class |
| Zod | 3 | Runtime validation that generates TypeScript types — one source of truth |
| bcryptjs | 2 | Password hashing, pure JS (no native deps) |
| jsonwebtoken | 9 | JWT in httpOnly cookies |
| helmet | 7 | Security headers in one line |

**Why PostgreSQL for full-text search instead of Elasticsearch?** For a personal journaling app, Postgres FTS is more than enough — it handles stemming, ranking, multi-language support, and GIN indexes natively. Adding Elasticsearch would mean another service to run and another layer of sync. The `tsvector` column is updated via a raw SQL query after every write. Search queries use `plainto_tsquery` (natural language input) rather than `to_tsquery` (which needs special syntax), so you can search for "morning coffee" and get results without thinking about operators.

**Why httpOnly cookies for JWT instead of localStorage?** XSS attacks can read localStorage. They can't read httpOnly cookies — those only travel in HTTP headers, invisible to JavaScript. The cookie is also set with `sameSite: lax` to prevent CSRF on cross-origin form submissions. The tradeoff is that cookies don't work for native mobile apps without extra work, but for a web app this is the right choice.

---

## Data model

Three tables. Everything else derives from these.

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String                         // bcrypt hash
  entries   Entry[]
  tags      Tag[]
  createdAt DateTime @default(now())
}

model Entry {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(...)
  title     String
  body      String                         // raw Markdown
  bodyPlain String                         // Markdown stripped — used for FTS and word count
  searchVec Unsupported("tsvector")?       // PostgreSQL FTS index
  tags      Tag[]
  mood      String?                        // happy | neutral | sad | anxious
  wordCount Int       @default(0)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?                      // soft delete — record stays in DB
  @@index([userId, createdAt])
}

model Tag {
  id      String  @id @default(cuid())
  name    String
  color   String  @default("#6366f1")
  entries Entry[]
  userId  String
  @@unique([userId, name])                 // "work" is per-user, not global
}
```

A few non-obvious decisions here:

- **CUIDs not UUIDs.** CUIDs are URL-safe, collision-resistant without a central generator, and sort lexicographically by creation time. They're also shorter than UUIDs.
- **`bodyPlain` alongside `body`.** The `body` column stores raw Markdown. `bodyPlain` is a stripped version — headings, bold, italic, code blocks, links all removed. This serves two purposes: it feeds the `tsvector` column (Markdown syntax would pollute search results) and it's what shows in the sidebar entry preview.
- **Soft delete.** Setting `deletedAt` instead of `DELETE`ing the row means you can recover entries, and the sync logic can propagate deletions correctly — a hard delete leaves no trace for other clients to learn from.
- **Tags are per-user.** The `@@unique([userId, name])` constraint means two users can both have a tag called "ideas" and they're entirely separate records. You own your tag set.

---

## Full-text search, explained

When you save an entry, two things happen on the server:

1. The `body` field is stripped of Markdown syntax to produce `bodyPlain`. This means a search for "morning" finds the entry even if it was written as `**morning** coffee` in Markdown.

2. A raw SQL update sets the `searchVec` column:

```sql
UPDATE "Entry"
SET "searchVec" = to_tsvector('english', title || ' ' || bodyPlain)
WHERE id = $1
```

`to_tsvector` tokenises the text, normalises words to their stems ("running" → "run"), and stores a compact representation. The `'english'` dictionary handles English stemming and stop words.

When you search, the query runs:

```sql
SELECT id FROM "Entry"
WHERE userId = $1
  AND deletedAt IS NULL
  AND searchVec @@ plainto_tsquery('english', $2)
ORDER BY ts_rank(searchVec, plainto_tsquery('english', $2)) DESC
```

`plainto_tsquery` takes plain text and builds a query automatically — "morning coffee habit" becomes `'morning' & 'coffee' & 'habit'`. `ts_rank` scores each result by how many times the query terms appear, weighted by position.

The backend returns the matching IDs in ranked order, then Prisma fetches the full entry objects.

When offline, search runs locally over IndexedDB using a simple `includes()` check on the `title` and `bodyPlain` fields. It's not ranked, but it works without a server.

---

## The heatmap

No chart library. Just SVG.

The calendar is a 52×7 grid of `<rect>` elements. Each cell represents one day. The colour comes from the total word count written that day:

| Words written | Colour |
|---|---|
| 0 | Gray (empty) |
| 1–200 | Light indigo |
| 201–500 | Medium indigo |
| 500+ | Deep indigo |

The server's `/api/entries/stats` endpoint returns a `heatmap` array: one object per day with `{ date, count, wordCount }`. The component maps these into a `Map<date, data>` and draws cells from 52 weeks ago up to today.

The streak counter walks backward from today: if today is in the heatmap, add one day to the streak, step back one day, repeat. The moment there's a gap, the streak stops.

---

## How authentication works

Registration: hash the password with bcrypt (cost factor 12), store the hash, sign a JWT, write it to an httpOnly cookie.

Login: look up the user by email, `bcrypt.compare` the submitted password against the stored hash, sign a new JWT if it matches.

Every protected route uses an `authMiddleware` that reads the cookie, verifies the JWT, and attaches the `userId` to the request object. Controllers never touch raw tokens — they just read `req.userId`.

The JWT payload is minimal: just `{ userId }`. The token expires in 7 days. When it expires, the next request returns a 401 with a clear message ("Session expired, please sign in again"), and the frontend can redirect to the login page.

---

## Quick start

### Option 1: Docker (easiest)

You need Docker Desktop installed. That's it.

```bash
git clone https://github.com/omprxkash/journaling-app-clone.git
cd journaling-app-clone
docker compose up
```

Wait for three containers to start: `db` (PostgreSQL), `backend` (Express), `frontend` (nginx serving the React build). Then open [http://localhost:5173](http://localhost:5173).

The first time you open it, register an account. Your entries sync automatically once the backend is running.

### Option 2: Local dev (frontend only, no database)

If you just want to explore the UI without setting up a database:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Everything works — you can create entries, add tags, see the editor, toggle dark mode. Entries persist in IndexedDB. The heatmap shows empty (it needs the backend for stats). Sync silently fails but doesn't break anything.

### Option 3: Full local dev (with backend)

You need PostgreSQL 16 running locally, or you can use Docker just for the database:

```bash
docker run -d \
  --name journal-db \
  -e POSTGRES_DB=journal \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:16
```

Then set up the backend:

```bash
cd backend
cp .env.example .env
# Edit .env: set DATABASE_URL and a real JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run dev          # http://localhost:3001
```

And the frontend in another terminal:

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

The Vite dev server proxies `/api` requests to `:3001` automatically — no CORS config needed.

---

## Environment variables

Backend (`.env`):

```
DATABASE_URL=postgresql://user:password@localhost:5432/journal
JWT_SECRET=use-a-long-random-string-here-min-32-chars
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development
```

For production, generate a real JWT_SECRET:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## REST API reference

All endpoints under `/api`. Auth endpoints set/clear an httpOnly cookie. All other endpoints require that cookie.

### Auth

```
POST /api/auth/register
  Body:    { email: string, password: string }   (password min 8 chars)
  Returns: { user: { id, email, createdAt } }
  Effect:  Sets httpOnly 'token' cookie

POST /api/auth/login
  Body:    { email: string, password: string }
  Returns: { user: { id, email, createdAt } }
  Effect:  Sets httpOnly 'token' cookie

POST /api/auth/logout
  Returns: { ok: true }
  Effect:  Clears 'token' cookie
```

### Entries

```
GET /api/entries
  Query params:
    tag=string        Filter by tag name
    search=string     Full-text search query
    from=ISO8601      Entries created after this date
    to=ISO8601        Entries created before this date
    page=number       Page number (default 1)
    limit=number      Results per page (default 20, max 100)
  Returns: { entries: Entry[], total: number, page, limit }

POST /api/entries
  Body:    { title: string, body: string, tags?: string[], mood?: Mood }
  Returns: { entry: Entry }

GET /api/entries/:id
  Returns: { entry: Entry }

PUT /api/entries/:id
  Body:    { title, body, tags?, mood? }
  Returns: { entry: Entry }

DELETE /api/entries/:id
  Effect:  Sets deletedAt (soft delete)
  Returns: { ok: true }

GET /api/entries/stats
  Returns: {
    totalEntries: number,
    totalWords: number,
    streakDays: number,
    heatmap: Array<{ date: string, count: number, wordCount: number }>
  }
```

### Tags

```
GET /api/tags
  Returns: { tags: Array<{ id, name, color }> }

POST /api/tags
  Body:    { name: string, color?: string }   (color is a hex string, default #6366f1)
  Returns: { tag: { id, name, color } }
```

### Entry shape

```typescript
{
  id: string           // cuid
  title: string
  body: string         // raw Markdown
  bodyPlain: string    // stripped text (for display previews)
  mood?: 'happy' | 'neutral' | 'sad' | 'anxious'
  wordCount: number
  tags: Array<{ id: string, name: string, color: string }>
  createdAt: string    // ISO 8601
  updatedAt: string    // ISO 8601
  deletedAt?: string   // present if soft-deleted
}
```

---

## Project structure, file by file

```
journaling-app-clone/
├── frontend/
│   ├── src/
│   │   ├── main.tsx                  React entry point
│   │   ├── App.tsx                   Root: auth guard, layout shell, new-entry flow
│   │   ├── index.css                 Tailwind directives + CodeMirror height fix
│   │   │
│   │   ├── types/
│   │   │   └── journal.ts            All shared TypeScript types (Entry, Tag, Mood, Stats…)
│   │   │
│   │   ├── db/
│   │   │   └── dexie.ts              Dexie schema — 3 tables: entries, tags, syncQueue
│   │   │
│   │   ├── api/
│   │   │   └── client.ts             Axios instance + typed helpers for every endpoint
│   │   │
│   │   ├── store/
│   │   │   ├── entryStore.ts         Zustand: entry list, selected entry, CRUD actions
│   │   │   └── uiStore.ts            Zustand: sidebar, theme, active tag, search, user
│   │   │
│   │   ├── hooks/
│   │   │   ├── useEntries.ts         Dexie live query — filters entries reactively
│   │   │   ├── useSearch.ts          Debounced search: 300ms after you stop typing
│   │   │   └── useSync.ts            Pull remote → upsert local; drain sync queue
│   │   │
│   │   └── components/
│   │       ├── Auth/
│   │       │   ├── LoginForm.tsx
│   │       │   └── RegisterForm.tsx
│   │       ├── Editor/
│   │       │   ├── MarkdownEditor.tsx  CodeMirror 6 with autosave (800ms debounce)
│   │       │   └── Toolbar.tsx         Mood buttons + live word count
│   │       ├── Sidebar/
│   │       │   ├── EntryList.tsx       Live-queried from Dexie; shows preview + tags
│   │       │   ├── SearchBar.tsx       Controlled input → useSearch hook
│   │       │   └── TagFilter.tsx       Tag chips from Dexie; click to filter
│   │       └── Calendar/
│   │           └── HeatmapCalendar.tsx Pure SVG; fetches stats from API on mount
│   │
│   ├── index.html                    Base HTML with font imports
│   ├── vite.config.ts                Vite + React plugin + /api proxy + Vitest config
│   ├── tailwind.config.ts            Custom 'journal' colour palette
│   └── Dockerfile                    Multi-stage: node build → nginx serve
│
├── backend/
│   ├── src/
│   │   ├── server.ts                 Express bootstrap: middleware, routes, error handler
│   │   │
│   │   ├── prisma/
│   │   │   └── schema.prisma         User, Entry (with tsvector), Tag
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts    Reads cookie → verifies JWT → attaches userId
│   │   │   └── validate.middleware.ts  Zod schema → 400 if invalid
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts    register / login / logout
│   │   │   ├── entries.controller.ts list / create / get / update / delete / stats
│   │   │   └── tags.controller.ts    list / create
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── entries.routes.ts
│   │   │   └── tags.routes.ts
│   │   │
│   │   └── services/
│   │       └── search.service.ts     stripMarkdown, countWords, updateSearchVector, searchEntries
│   │
│   ├── tests/
│   │   └── entries.test.ts           Supertest: full auth + CRUD flow against real DB
│   │
│   ├── .env.example
│   └── Dockerfile                    Multi-stage: build TypeScript → run compiled JS
│
├── docker-compose.yml                PostgreSQL + backend + frontend, with healthcheck
└── README.md
```

---

## How to build something like this

If you're reading this to understand the patterns rather than just run the app, here's the mental model:

**Start with the data model.** Before writing any UI or any API, figure out what an "entry" actually is. In this app it's: a title, a Markdown body, a stripped plain-text copy of that body, a word count, an optional mood, and a list of tags. Everything else — search, stats, sync — follows from that.

**Make IndexedDB your primary store, not a cache.** Most tutorials treat IndexedDB as a cache in front of an API. This app treats it as the truth — the API is a backup. That changes how you write every write operation: write locally, record the intent in a queue, sync later.

**The sync queue is the key primitive.** Instead of calling the API directly when the user does something, write the change locally and add `{ entryId, operation, timestamp }` to a `syncQueue` table. A background hook drains the queue when the app loads. This gives you offline-first for free, and retry logic for free, and the UI never waits for a network request to update.

**Derive don't store when you can, store when you must.** The `bodyPlain` field is an example of "store when you must" — you need it in PostgreSQL for full-text indexing. The word count is the same — you could compute it in SQL but it's cheaper to compute it on write and store the result. Streak and heatmap are derived at query time from the raw entry dates because they'd be expensive to keep in sync as a stored value.

**TypeScript types as the contract.** The `types/journal.ts` file in the frontend defines the shapes that both the API client and the Dexie queries return. If the backend changes its response shape, TypeScript will tell you everywhere it breaks. This is the fastest way to refactor with confidence.

---

## Running tests

**Backend integration tests** — these hit a real database, so you need PostgreSQL running (or use Docker):

```bash
cd backend
npm test
```

The test suite covers: registration, duplicate email rejection, login, cookie-protected routes, entry creation, reading, updating, tag filtering, stats endpoint, soft delete, and logout. It uses Supertest to fire real HTTP requests against the Express app without starting an actual server.

**Frontend tests:**

```bash
cd frontend
npm test
```

---

## Deploying to production

A few things to change before you run this anywhere public:

1. **Set a real JWT_SECRET.** Generate 32+ random bytes. Rotate it if you ever suspect it was exposed.

2. **Use HTTPS.** The JWT cookie is set with `secure: true` only when `NODE_ENV=production`. HTTPS is required for secure cookies.

3. **Set `FRONTEND_URL`** in the backend environment to your actual frontend domain so CORS is scoped correctly.

4. **Run Prisma migrations** before starting the backend:
   ```bash
   npx prisma migrate deploy
   ```
   The Dockerfile's `CMD` does this automatically, but be aware of it if you're deploying without Docker.

5. **The GIN index.** Prisma doesn't manage the GIN index on `searchVec` (because it's an `Unsupported` column type). After your first migration, run this manually:
   ```sql
   CREATE INDEX IF NOT EXISTS entry_search_idx ON "Entry" USING GIN("searchVec");
   ```
   Without this, full-text search still works but will do a sequential scan on large datasets.

---

## What's not here (and why)

**Rich media attachments.** Supporting images or files would require an object storage service (S3 or similar), a whole extra upload flow, and meaningful extra cost to run. The app is deliberately text-only — if you need images in your journal, you can link to them in Markdown.

**Sharing / public entries.** There's no concept of a public entry or a shared link. Every entry belongs to exactly one user. Adding this would require a separate access-control layer.

**Import from other formats.** There's no import wizard for other journaling formats. You can paste Markdown directly into any entry, and since everything is stored as raw Markdown, exporting is just a matter of reading your own data.

**Mobile app.** This is a web app. It works reasonably well on mobile browsers (CodeMirror 6 handles mobile input events correctly, which is why it was chosen over simpler alternatives), but it's not a native app.

**Email verification.** Registration accepts any email address and doesn't send a confirmation. Fine for a self-hosted personal tool, something to add if you open this up to others.

---

## License

MIT. See [LICENSE](LICENSE). Use it, modify it, ship it.
