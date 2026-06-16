# Professor IELTS — Android App (APK) Setup

This turns the web app into an installable Android APK. You do **not** need
Android Studio or any developer tools on your computer — the APK is built for
you in the cloud by GitHub Actions.

## How it fits together

```
  Your phone (APK)  ──HTTPS──►  Backend on Render  ──►  OpenAI
  (just the UI)                 (holds your secret key)
```

The APK contains **only the app screens**. Every AI call goes to your backend,
which is the only place your `OPENAI_API_KEY` lives. The key is therefore never
inside the APK and can't be extracted from your phone. This is the important
part for keeping the API calls working *and* safe.

You'll do three things, once:

1. **Deploy the backend** (so the phone has something to call).
2. **Build the APK** (GitHub builds it; you download it).
3. **Install it** on your phone.

---

## Part 1 — Put the project on GitHub

1. Create a free account at <https://github.com> if you don't have one.
2. Create a new **empty** repository (e.g. `professor-ielts`). Keep it private.
3. Upload this `professor-ielts` folder to it. Easiest way without tools:
   on the new repo page click **"uploading an existing file"** and drag the
   folder contents in. (Or, if you know git: `git init && git add . &&
   git commit -m "init" && git remote add origin <url> && git push -u origin main`.)

> The `.env` files with your real keys are **git-ignored** and will not upload —
> that's intended. You'll set the key in Render instead.

---

## Part 2 — Deploy the backend on Render (free)

1. Go to <https://render.com> and sign in with GitHub.
2. Click **New → Blueprint**, pick your `professor-ielts` repo. Render reads
   `render.yaml` and sets up a service called **professor-ielts-api**.
3. When prompted (or under the service's **Environment** tab) add:
   - `OPENAI_API_KEY` = your OpenAI key (starts with `sk-...`).
   - Leave `CORS_ORIGIN` as `https://localhost` (already set by the blueprint).
4. Click **Apply / Deploy** and wait for it to go **Live** (a few minutes).
5. Copy the service URL — it looks like
   `https://professor-ielts-api.onrender.com`.
6. Test it: open `https://professor-ielts-api.onrender.com/api/health` in a
   browser. You should see `{"status":"ok",...}` with `openaiConfigured: true`.

> **Free-tier note:** the backend "sleeps" after ~15 min idle. The first request
> after sleeping takes ~50 seconds to wake up — the app waits for it, so your
> first evaluation of a session may be slow. Everything after is fast.

---

## Part 3 — Build the APK with GitHub Actions

1. In your GitHub repo, open the **Actions** tab. If prompted, click
   **"I understand my workflows, enable them."**
2. Pick **Build Android APK** in the left list → click **Run workflow**.
3. In the box **"Backend origin WITHOUT /api"**, paste your Render URL exactly,
   with no trailing slash and **no** `/api`:
   ```
   https://professor-ielts-api.onrender.com
   ```
4. Click the green **Run workflow**. It takes ~5–10 minutes.
5. When it finishes (green check), open the run and scroll to **Artifacts**.
   Download **professor-ielts-apk** — it's a `.zip` containing `app-debug.apk`.

> Prefer automatic builds? Instead of step 3, set a repository **Variable**
> named `API_BASE_URL` (Settings → Secrets and variables → Actions → Variables)
> to the same URL. Then every push builds an APK.

---

## Part 4 — Install on your phone

1. Unzip the downloaded file to get **app-debug.apk**. Transfer it to your phone
   (email it to yourself, Google Drive, or USB).
2. Tap the APK. Android will ask to allow installing from this source —
   allow it (Settings → "Install unknown apps" for your file app/browser).
3. Open **Professor IELTS**. On first launch it asks for **microphone**
   permission — tap **Allow** (needed for recording).
4. Add a student, pick a question, record, and evaluate. The first call may take
   ~50s if the backend was asleep (see note above); after that it's quick.

---

## Updating the app later

- **Changed the app code?** Re-run the **Build Android APK** action, download the
  new APK, and install over the old one.
- **Changed the backend?** Render redeploys automatically on each push
  (`autoDeploy: true`).

---

## If the API calls don't work — quick checks

| Symptom | Likely cause | Fix |
|--------|--------------|-----|
| Every call fails / "network error" | Wrong backend URL baked in | Re-run the build with the exact Render URL, **no** `/api`, no trailing slash |
| Works then fails after idle | Render free tier asleep | Wait ~50s and retry; the app's timeout covers it |
| "AI service error" / 401 | `OPENAI_API_KEY` missing/invalid on Render | Set/replace it in Render → Environment, redeploy |
| 429 "Too many requests" | Rate limit hit | Default is 120/15 min; raise `RATE_LIMIT_MAX` in Render |
| Recording does nothing | Mic permission denied | Android Settings → Apps → Professor IELTS → Permissions → allow Microphone |

## Notes

- The build produces a **debug** APK — perfect for installing on your own
  phone. (A Play-Store release needs a signing key; ask if you ever want that.)
- Your students, history, and progress are stored **on the phone** (local
  storage), exactly as you asked — nothing personal is sent to the server except
  the audio/transcript needed to score each answer.
- App id: `com.professorielts.app` · App name: **Professor IELTS**.
