# BandLogic — Dual Database Architecture (Supabase + Firebase)

## The split

| Concern | Where | Why |
|---|---|---|
| Auth, user sessions | **Firebase Auth** | Already wired into the app; keep it |
| Real-time app logic (live scoring, presence) | **Firestore / RTDB** | Firebase's strength |
| User progress, attempts, bookmarks | **Firestore** | Per-user, real-time, already there |
| Content library: decks, cue cards, listening tests | **Supabase (Postgres)** | Relational, bulk-loadable, full-text search, cheap reads |
| Listening audio files | **Supabase Storage** (or keep Cloudinary — you already use it) | `audio_url` column just stores the URL either way |

Rule of thumb: **Firebase owns *who* the user is and *what they did*; Supabase owns *what the content is*.** No user IDs ever need to live in Supabase, so there's nothing to keep in sync between the two databases.

## Read path: two options

### Option A — everything through your Express server (recommended to start)
```
Client --Firebase ID token--> Express (verifies via firebase-admin, already in middleware/)
Express --service_role key--> Supabase Postgres
```
- Add `@supabase/supabase-js` to the server, create one client with `SUPABASE_SERVICE_ROLE_KEY`.
- Your existing Firebase auth middleware keeps gating requests; Supabase RLS is irrelevant because the service key bypasses it.
- Zero client changes beyond new endpoints: `GET /api/decks`, `GET /api/decks/:slug/cards`, `GET /api/listening/:testNumber`.
- Cache aggressively (content changes rarely): `Cache-Control: public, max-age=3600` or an in-memory LRU.

### Option B — client queries Supabase directly (Firebase as third-party auth)
Supabase supports Firebase as a third-party auth provider: register your Firebase project in the Supabase dashboard (Authentication → Sign In / Up → Third Party Auth), then create the client with your Firebase ID token:

```js
import { createClient } from '@supabase/supabase-js';
import { getAuth } from 'firebase/auth';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  accessToken: async () => (await getAuth().currentUser?.getIdToken()) ?? null,
});
```
RLS policies (already in `server/db/supabase_schema.sql`) then allow reads of published content only. Verify the exact setup steps against the current Supabase docs — this feature is newer and the dashboard flow changes.

**Start with A.** It ships today with the middleware you already have; move hot read paths to B later if server load matters.

## Write path (content ingestion)
Always server-side with the service key — clients never write content:
```
PDF -> extract.py / extractMakkar.js -> makkar_raw.txt
     -> parseMakkar.js [--llm]       -> makkar_parsed.json
     -> seedSupabase.js              -> decks / cue_cards / followup_questions
```
Decks are seeded with `is_published = false`; review the `needs_review` rows, then flip the flag.

## Listening tests
Same pattern: one deck ("80 Listening Tests"), rows in `listening_tests` (1–80), 4 `listening_sections` each with `audio_url`, and `listening_questions` with `answer` as a jsonb array of accepted variants (`["harbour","harbor"]`) so the grader can match loosely. Grading happens in your Express server or client; the user's score/attempt goes to Firestore, not Supabase.

## What NOT to do
- Don't mirror Firebase users into Supabase — unnecessary sync surface.
- Don't put user attempts in Postgres "while you're at it" — keep the content/user split clean until you have a reporting need.
- Don't ship the service_role key in the client bundle. Anon key + RLS only (Option B), or server-only (Option A).
