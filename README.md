# LearnLoop — Video Learning + Interactive Quiz Builder

A mini learning platform where admins publish video lessons with questions pinned to
specific timestamps, assign them to learners, and track how far each learner got and
how they answered. Learners watch, answer questions that interrupt playback, and
resume exactly where they left off.

Built for the SDE II full-stack assessment.

---

## Contents

- [Quick start](#quick-start)
- [Sample login credentials](#sample-login-credentials)
- [Environment variables](#environment-variables)
- [Database setup](#database-setup)
- [Seed data](#seed-data)
- [API documentation](#api-documentation)
- [Architecture](#architecture)
- [Data model](#data-model)
- [Key design decisions](#key-design-decisions)
- [Testing](#testing)
- [Assumptions](#assumptions)
- [Known limitations](#known-limitations)

---

## Quick start

**Prerequisites:** Node.js 20+, Docker (for MongoDB), npm 10+.

```bash
# 1. MongoDB
docker compose up -d mongo

# 2. API  → http://localhost:4000/api
cd backend
cp .env.example .env
npm install
npm run seed          # demo users, videos, questions, assignments, progress
npm run start:dev

# 3. Web  → http://localhost:5173   (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open **http://localhost:5173** and sign in with one of the accounts below — the login
screen has one-click buttons for the admin and learner demo accounts.

### Everything in Docker

```bash
docker compose --profile full up --build
# web → http://localhost:8080     api → http://localhost:4000/api
```

The seed script does not run automatically in this mode. Seed once the stack is up:

```bash
cd backend && MONGODB_URI=mongodb://localhost:27017/learnloop npm run seed
```

---

## Sample login credentials

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin | `admin@learnloop.dev` | `Admin@123` | Full library, assignment and reporting access |
| Learner | `asha@learnloop.dev` | `Learner@123` | Has one completed video — good for seeing reports |
| Learner | `rahul@learnloop.dev` | `Learner@123` | Mid-video, one question answered incorrectly |
| Learner | `priya@learnloop.dev` | `Learner@123` | Just started a second video |
| Learner | `daniel@learnloop.dev` | `Learner@123` | Untouched — shows the empty "not started" state |

New signups through the UI are always created as learners. Admin accounts come only
from the seed script, so the registration form cannot be used to escalate a role.

---

## Environment variables

### `backend/.env`

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | HTTP port |
| `NODE_ENV` | `development` | Enables stricter `JWT_SECRET` validation in `production` |
| `API_PREFIX` | `api` | Prefix for every route, including Swagger |
| `MONGODB_URI` | `mongodb://localhost:27017/learnloop` | Connection string |
| `JWT_SECRET` | dev placeholder | **Must** be ≥32 chars and non-default in production |
| `JWT_EXPIRES_IN` | `1d` | Access-token lifetime |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated allowed origins |
| `SEED_ADMIN_EMAIL` | `admin@learnloop.dev` | Seed-only |
| `SEED_ADMIN_PASSWORD` | `Admin@123` | Seed-only |
| `SEED_LEARNER_PASSWORD` | `Learner@123` | Seed-only |

Configuration is validated at boot (`src/config/env.validation.ts`), so a bad value
fails at startup rather than at the first request.

### `frontend/.env`

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:4000/api` | API base URL, including the prefix |

---

## Database setup

MongoDB 7 runs from `docker-compose.yml` with a named volume (`mongo-data`), so data
survives restarts. No manual schema step is needed: Mongoose creates the collections
and builds every index on boot.

```bash
docker compose up -d mongo      # start
docker compose logs -f mongo    # tail logs
docker compose down             # stop (keeps data)
docker compose down -v          # stop and wipe the volume
```

Using your own MongoDB (local install or Atlas) only requires pointing `MONGODB_URI`
at it.

---

## Seed data

```bash
cd backend && npm run seed
```

The script is **destructive and idempotent**: it clears the six collections it owns and
rewrites them, so it is safe to re-run whenever you want a clean demo state.

It creates 1 admin, 4 learners, and 4 videos (3 published, 1 draft) carrying 8 questions
across all three types, assigns the published videos to every learner, and backfills
partial progress so the admin reports are not empty on first login.

Seed videos point at public sample MP4s. They need network access on first play. To work
fully offline, edit the `videoUrl` of each video under **Admin → Videos → Settings** to a
file you host locally.

---

## API documentation

**Swagger UI:** http://localhost:4000/api/docs (click **Authorize**, paste the
`accessToken` from a login response).

**Postman:** import `docs/LearnLoop.postman_collection.json`. Run *Auth → Login as
admin* and *Login as learner* first; both store their token into collection variables
that every other request reuses.

### Response shape

Success:

```json
{ "success": true, "data": { }, "meta": { "total": 12, "page": 1, "totalPages": 2 } }
```

Error (`meta` is present only on paginated lists):

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": { "_": ["title must be longer than or equal to 3 characters"] },
  "path": "/api/videos",
  "timestamp": "2026-10-27T15:42:35.914Z"
}
```

### Endpoints

| Method | Path | Role | Purpose |
|---|---|---|---|
| `POST` | `/auth/login` | public | Issue a JWT |
| `POST` | `/auth/register` | public | Sign up (always a learner) |
| `GET` | `/auth/me` | any | Current user — rehydrates the session on refresh |
| `GET` | `/health` | public | Liveness plus Mongo connection state |
| `GET` | `/videos` | admin | List with `?search=&status=&tag=&page=&limit=` |
| `POST` | `/videos` | admin | Create |
| `GET` | `/videos/:id` | admin | Detail including questions **with** correct answers |
| `PATCH` | `/videos/:id` | admin | Update |
| `PATCH` | `/videos/:id/publish` | admin | Publish (validated) |
| `PATCH` | `/videos/:id/unpublish` | admin | Hide from learners |
| `DELETE` | `/videos/:id` | admin | Delete, cascading to all children |
| `GET` | `/videos/:id/questions` | admin | Questions in playback order |
| `POST` | `/videos/:id/questions` | admin | Add a timestamp question |
| `PATCH` | `/questions/:id` | admin | Update |
| `DELETE` | `/questions/:id` | admin | Delete, plus its answers |
| `GET` | `/users/learners` | admin | Learner picker, `?search=` |
| `POST` | `/videos/:id/assignments` | admin | Bulk assign (idempotent) |
| `GET` | `/videos/:id/assignments` | admin | Who has this video |
| `DELETE` | `/videos/:id/assignments/:learnerId` | admin | Unassign |
| `GET` | `/me/assignments` | learner | My videos, `?search=&status=` |
| `GET` | `/me/assignments/:videoId` | learner | Player payload (**no** correct answers) |
| `PUT` | `/me/assignments/:videoId/progress` | learner | Autosave playhead |
| `POST` | `/me/assignments/:videoId/questions/:qId/answer` | learner | Submit an answer |
| `GET` | `/reports/overview` | admin | Dashboard counters |
| `GET` | `/reports/videos/:id` | admin | Per-learner progress table |
| `GET` | `/reports/videos/:id/learners/:lId` | admin | One learner's answer sheet |

---

## Architecture

```
┌────────────────────────┐      JSON over HTTP       ┌─────────────────────────┐
│  React SPA (Vite)      │  ───────────────────────▶ │  NestJS API             │
│                        │     Bearer <JWT>          │                         │
│  RTK Query  ← cache    │ ◀───────────────────────  │  Guards → DTO validation│
│  Redux      ← session, │                           │  → Service → Mongoose   │
│               player   │                           └───────────┬─────────────┘
└────────────────────────┘                                       │
                                                        ┌────────▼────────┐
                                                        │  MongoDB 7      │
                                                        └─────────────────┘
```

### Backend

Nest modules map one-to-one onto the domain: `auth`, `users`, `videos`, `questions`,
`assignments`, `progress`, `responses`, `reports`, plus `learning`, which composes the
others into the handful of endpoints the learner app actually needs.

Every request passes through the same pipeline:

1. **`JwtAuthGuard`** — registered globally, so routes are authenticated *by default*.
   A forgotten decorator cannot silently expose an endpoint; opting out is explicit via
   `@Public()`. The strategy re-reads the user on every request rather than trusting the
   token body, so a deactivated account loses access immediately.
2. **`RolesGuard`** — enforces `@Roles(UserRole.ADMIN | LEARNER)`.
3. **`ValidationPipe`** — `whitelist` + `forbidNonWhitelisted`, so an unknown field is a
   loud 400 rather than silently dropped.
4. **Service layer** — all business rules; controllers stay thin.
5. **`TransformInterceptor`** — wraps every success in the envelope above.
6. **`AllExceptionsFilter`** — one exit point for errors, translating Mongoose
   `ValidationError`/`CastError` and Mongo duplicate-key (11000) into proper HTTP codes
   so a duplicate never surfaces as a 500.

### Frontend

- **Server state → RTK Query.** One API slice, features inject their own endpoints, and
  a tag graph (`Video`, `Question`, `Assignment`, `Report`, …) drives invalidation, so
  publishing a video or assigning a learner refreshes exactly the affected screens.
- **Client state → Redux slices.** `auth` (token/user, persisted), `player` (which
  question is blocking playback, what has been answered, save indicator) and `toast`.
- **The playhead deliberately stays out of Redux.** Mirroring `currentTime` into the
  store would re-render the tree several times a second; it lives on the `<video>`
  element and is read through a ref.

---

## Data model

Six collections. Questions are modelled separately from videos rather than embedded,
because they are edited independently, queried on their own, and referenced by
`Response.questionId` — embedding would make a response point into an array position.

```
User ──────┬──< Video (createdBy)
           │
           ├──< Assignment >── Video        unique (videoId, learnerId)
           ├──< Progress   >── Video        unique (videoId, learnerId)
           └──< Response   >── Question     unique (questionId, learnerId)
                                  │
                              Video ──< Question    unique (videoId, timestampSeconds)
```

| Collection | Key fields | Notable indexes |
|---|---|---|
| `users` | `name, email, password, role, isActive` | unique `email`; text on name+email |
| `videos` | `title, videoUrl, durationSeconds, status, tags, createdBy` | `{status, createdAt}`; text on title+description |
| `questions` | `videoId, timestampSeconds, type, prompt, options[], correctOptionKeys[], acceptedAnswers[], points` | **unique** `{videoId, timestampSeconds}` |
| `assignments` | `videoId, learnerId, assignedBy, dueAt` | **unique** `{videoId, learnerId}` |
| `progress` | `lastPositionSeconds, maxPositionSeconds, completionPercentage, status` | **unique** `{videoId, learnerId}` |
| `responses` | `questionId, videoId, learnerId, selectedOptionKeys[], answerText, isCorrect, attempts` | **unique** `{questionId, learnerId}` |

The unique compound indexes are load-bearing, not decoration: they are what make
bulk-assign idempotent, stop two questions racing at the same second, and keep one
answer row per learner per question.

---

## Key design decisions

**Correct answers never reach the browser.** `GET /me/assignments/:videoId` strips
`correctOptionKeys`, `acceptedAnswers` and `explanation` before responding. Grading
happens in `QuestionsService.grade()` on the server, and the explanation is returned
only in the answer response — after the learner has committed. Shipping the answers to
the client and checking there would put the key in the network tab.

**Progress is derived, not asserted by the client.** The client reports a position; the
server clamps it to the video duration and recomputes everything else. Two separate
positions are stored:

- `lastPositionSeconds` — where to drop the playhead on resume; moves backwards on rewind.
- `maxPositionSeconds` — the furthest point ever reached; **only ever increases**.

Completion percentage derives from `maxPositionSeconds`, so re-watching a section never
reduces earned progress.

**Completion length is read from the file, not asked for.** Completion percentage is
`maxWatched / duration`, so the denominator has to be right. Rather than trusting an admin
to look the number up, the form loads the video's metadata (`preload="metadata"` — the
header, not the whole file) the moment a URL is pasted. There is no duration input on the
form by default: it reports what it found, and only offers a field when detection cannot
answer or the admin explicitly asks to set it by hand. An empty box captioned "detected
automatically" is a worse prompt than no box at all.

**Completion requires both watching and answering.** A video is `completed` only when the
learner has watched ≥95% *and* answered every active question. Watching to the end while
skipping every question is not completing the lesson. The 95% threshold exists because
videos rarely get watched to the literal final frame.

**Editing a video re-derives everyone's progress.** Completion percentage is
`maxWatched / completionLength` and completion status also depends on the question count, so
changing either silently invalidates every stored progress row. Changing a duration, or
adding or deleting a question, recalculates all of that video's progress immediately —
and clamps any saved position that now sits past the end. Without it the admin report
keeps showing figures that were true under the old settings until each learner happens to
open the video again, which is the one place those figures need to be trustworthy.

**The field is named for what it does.** It is labelled *completion length*, not
*duration*, because it is not merely a fact about the file: it is the number completion is
measured against, and it is editable. The form compares it with the file's real length and
treats the two directions differently, because only one of them is a legitimate choice:

- **Shorter than the file** is allowed, with a warning. "Only the first half is required"
  is a real policy, and the warning says how much video will be left unplayed and how many
  assigned learners get recalculated.
- **Longer than the file** is refused. Requiring 54 seconds of a 20-second video is not a
  policy, it is an unreachable state: the 95% threshold can never be met, so nobody could
  ever complete it. Saving is blocked rather than warned about.

The check lives in the browser because that is the only place the file's true length is
known — see the limitation below.

**Questions cannot be skipped.** When the playhead reaches a question the video pauses and
the overlay has no dismiss control. Seeking forward past several questions surfaces the
*earliest* unanswered one and seeks back to it, so skipping ahead does not skip the quiz.

**Publishing is a validation gate.** A video cannot be published without a duration
(completion tracking is meaningless without one) or with any question that has no correct
answer configured. Likewise, a duration cannot be shortened past an existing question,
which would strand it where it could never fire.

**Deletes cascade.** Removing a video removes its questions, assignments, progress and
responses in a transaction where the deployment supports one, falling back to ordered
sequential deletes on a standalone mongod (the local Docker default). Without this,
reporting joins would hit orphaned rows.

**Unassigning keeps history.** Removing a learner from a video deletes the assignment but
retains their progress and answers, so past attempts stay auditable and a re-assignment
picks up where they left off.

---

## Testing

```bash
cd backend
npm test              # 29 unit tests
npm run test:cov      # with coverage
```

Coverage focuses on the two pieces of pure logic where a bug would be both likely and
costly, since they decide scores and completion:

- **`QuestionsService.grade()`** — all three question types, including exact-set matching
  for multiple choice (partial and superset selections both fail), case/whitespace
  insensitivity for short answers, and rejection of unknown option keys. Also asserts
  `toLearnerShape()` strips the answers.
- **`ProgressService.recalculate()`** — the completion rule: watched-but-unanswered and
  answered-but-unwatched both stay `in_progress`, the 95% threshold completes, an existing
  `completedAt` stays stable, percentages cap at 100, and an unknown duration reports 0%
  rather than a misleading number.
- **`ProgressService.recalculateForVideo()`** — what happens to existing learners when an
  admin edits a video: a position past a newly shortened end is pulled back inside it,
  percentages are re-derived against the new duration, adding a question un-completes
  whoever had finished the old set, deleting one can complete them, and every learner is
  updated rather than only the first.

The API was additionally verified end to end against a live database — auth, role
enforcement on both directions, the answer-leak check, progress monotonicity, clamping,
every validation guard, and the full learner journey through to `completed`.

---

## Assumptions

1. **Admins are seeded, not self-registered.** Public signup always produces a learner;
   allowing a `role` field would let anyone grant themselves admin.
2. **Videos are direct MP4 URLs**, played by the native `<video>` element. This gives
   precise, reliable control over pause and seek, which the timestamp questions depend on.
   YouTube/Vimeo embeds would add iframe-API latency around exactly that behaviour.
3. **Re-answering is allowed** and overwrites the previous answer while incrementing
   `attempts`. The assessment did not specify a one-shot rule, and keeping the latest
   answer with an attempt count makes reporting a direct lookup. Both the learner's
   verdict and the admin report surface the attempt count.
4. **One question per second per video.** Two questions firing at the same timestamp would
   race in the player, so the pairing is unique.
5. **Short answers are matched exactly** after trimming and lower-casing, against a list of
   accepted variants the admin supplies. No fuzzy matching or stemming.
6. **Duration is detected, not typed.** Pasting a video URL into the admin form loads the
   file's metadata in the browser and fills the duration in automatically; the field stays
   editable for the rare source that reports nothing. Publishing is blocked until a
   duration is known, because completion percentage has no denominator without one.
7. **Learners see only published, assigned videos.** Unpublishing hides a video without
   destroying assignments or progress.

## Known limitations

1. **No refresh tokens.** A single access token (1 day by default). On expiry the API
   returns 401, the client clears the session once globally and explains why on the login
   screen. Production would want a short access token plus a rotating refresh token.
2. **Seed videos depend on third-party hosting.** The URLs were verified reachable at the
   time of writing; if a host goes away, replace `videoUrl` under Admin → Videos →
   Settings. Nothing else depends on them.
3. **No video upload.** Admins paste a URL. File upload would need object storage and a
   transcoding pipeline, which is well outside the scope here.
4. **The unreachable-length check is client-side only.** The browser knows the file's
   real length because it loads its metadata; the API only ever receives a URL and a
   number, and does not fetch the video to verify it. So `PATCH /videos/:id` will still
   accept a completion length longer than the file if called directly. Enforcing it server
   side would mean the API range-requesting every video file on write, which is a lot of
   network dependency and failure surface for a mistake the UI already prevents. The
   consequence is a stuck video, not corrupted or unsafe data.
5. **Transactions need a replica set.** The delete cascade falls back to sequential deletes
   on a standalone mongod, ordered children-first so an interrupted delete leaves the video
   reachable rather than orphaning rows.
6. **Reports are computed per request.** Fine at this scale; a large deployment would want
   pre-aggregated rollups rather than recomputing a per-learner table on every load.
7. **The learner assignment list filters in memory.** The result set is scoped to one
   learner's assignments, so an extra round trip would cost more than the in-memory pass.
   This would move into the aggregation pipeline if learners accumulated hundreds of videos.
8. **Frontend tests are not included.** Testing effort went to the backend logic that
   decides scores and completion; the UI was verified manually in a browser across both
   roles. Component tests would be the next addition.
9. **No email, notifications or due-date enforcement.** `dueAt` is stored and displayed but
   nothing acts on it.
