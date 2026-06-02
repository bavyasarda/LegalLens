# Deploying LegalLens to Vercel — Complete Guide

This guide walks you through every step: preparing the code, pushing to GitHub, and deploying with the Vercel CLI.

---

## Prerequisites

Install these once:

- **Git**: https://git-scm.com/download/win
- **GitHub CLI** (optional but easier): https://cli.github.com/
- **Vercel CLI**: install via `npm install -g vercel` or `pnpm add -g vercel`

Verify:
```bash
git --version
node --version
vercel --version
```

---

## Part 1: Prepare the code

### 1.1 Confirm your local app works

```bash
cd d:\LegalLens
npm run dev
```

Visit http://localhost:3000 and verify sign-in + upload work. If something is broken locally, fix it first.

### 1.2 Stop the dev server

Press `Ctrl+C` in the terminal.

### 1.3 Verify `.env.local` is in `.gitignore` (it should be)

```bash
cd d:\LegalLens
type .gitignore | findstr /I "env"
```

You should see `.env*.local` in the list. **Never commit `.env.local`** — it contains your secret keys.

---

## Part 2: Initialize git and commit

### 2.1 Initialize a git repository

```bash
cd d:\LegalLens
git init
git branch -M main
```

### 2.2 Stage all files

```bash
git add .
```

### 2.3 Verify what's staged (sanity check)

```bash
git status
```

You should see a long list of files. **Make sure `.env.local` is NOT in the list** (it should be hidden by `.gitignore`). If it shows up, stop and run `git reset .env.local`.

### 2.4 Commit

```bash
git commit -m "Initial commit: LegalLens MVP"
```

---

## Part 3: Push to GitHub

### Option A: Using GitHub CLI (recommended)

#### 3A.1 Sign in to GitHub

```bash
gh auth login
```

Follow the prompts. Choose **HTTPS**, sign in via **browser**.

#### 3A.2 Create a new private GitHub repo and push

```bash
gh repo create legallens --private --source=. --remote=origin --push
```

This will:
- Create a new private repo called `legallens` on your GitHub account
- Add it as the `origin` remote
- Push your `main` branch to it

#### 3A.3 Verify on GitHub

Go to https://github.com/your-username/legallens — you should see all your files.

### Option B: Using the GitHub website (manual)

#### 3B.1 Create a new repo on GitHub

1. Go to https://github.com/new
2. Repository name: `legallens`
3. Visibility: **Private** (recommended for now)
4. **DO NOT** initialize with README, .gitignore, or license (we already have them)
5. Click **Create repository**

#### 3B.2 Connect your local repo to GitHub

GitHub will show you the commands. Run these (replace `YOUR-USERNAME` with your actual GitHub username):

```bash
cd d:\LegalLens
git remote add origin https://github.com/YOUR-USERNAME/legallens.git
git push -u origin main
```

If it asks for credentials, sign in. (If you have 2FA, you'll need a [Personal Access Token](https://github.com/settings/tokens) instead of your password.)

---

## Part 4: Install Vercel CLI and sign in

### 4.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 4.2 Sign in

```bash
vercel login
```

This opens your browser. Sign in with the account you want to deploy to (create one at https://vercel.com/signup if needed — free Hobby tier is fine).

### 4.3 Confirm you're logged in

```bash
vercel whoami
```

Should print your email.

---

## Part 5: Deploy

### 5.1 First-time deployment

From your project folder:

```bash
cd d:\LegalLens
vercel
```

The CLI will ask a series of questions. Answer them like this:

| Question | Answer |
|---|---|
| Set up and deploy? | **Y** |
| Which scope? | Select your account |
| Link to existing project? | **N** (first time) |
| Project name? | `legallens` (or anything you like) |
| In which directory is your code located? | `./` (just press Enter) |
| Override settings? | **N** (use defaults from vercel.json) |

The CLI will build and deploy. At the end, you'll get a **preview URL** like:
```
🔗  Preview: https://legallens-abc123.vercel.app
```

### 5.2 Add environment variables

Your app needs the 5 env vars to work. Add them via the CLI:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
```

When prompted, paste the value. Repeat for each variable:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Paste: https://evvvqvyseulgkdztufhn.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Paste your anon key

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Paste your service role key

vercel env add GEMINI_API_KEY production
# Paste your Gemini key

vercel env add GROQ_API_KEY production
# Paste your Groq key
```

You can also add them for the preview environment (good for testing):
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
# same values
```
(repeat for all 5, both `production` and `preview`)

### 5.3 Deploy to production

```bash
vercel --prod
```

This redeploys with the env vars you just added. You'll get a final URL like:
```
🔗  Production: https://legallens.vercel.app
```

---

## Part 6: Update Supabase and Google OAuth

Your app now lives at a real URL, but Supabase and Google need to know about it.

### 6.1 Add your Vercel URL to Supabase allowed redirects

1. Go to https://supabase.com/dashboard/project/evvvqvyseulgkdztufhn/auth/url-configuration
2. In the **"Redirect URLs"** section, click **"Add URL"**
3. Add (replace with your actual Vercel URL):
   ```
   https://legallens.vercel.app/auth/callback
   ```
4. Click **Save**

### 6.2 Add your Vercel URL to Google Cloud Console

1. Go to https://console.cloud.google.com/apis/credentials
2. Click your OAuth 2.0 Client ID
3. **Authorized JavaScript origins** → click "+ Add URI" → add:
   ```
   https://legallens.vercel.app
   ```
4. **Authorized redirect URIs** → click "+ Add URI" → add:
   ```
   https://legallens.vercel.app/auth/callback
   ```
5. Click **SAVE**
6. **Wait 5 minutes** for Google's config to propagate

### 6.3 (Optional) Update Supabase site URL

1. Go to https://supabase.com/dashboard/project/evvvqvyseulgkdztufhn/auth/url-configuration
2. Under **"Site URL"**, change it from `http://localhost:3000` to:
   ```
   https://legallens.vercel.app
   ```
3. Click **Save**

---

## Part 7: Test the production deployment

1. Open your Vercel URL: `https://legallens.vercel.app`
2. Click **"Sign in with Google"**
3. Authorize the app
4. You should land on `/dashboard` (empty at first)
5. Click **+ Upload Document**, pick a PDF or image
6. Click **Upload** — should progress through Extracting → Uploading → Indexing → Done
7. Click **Ask a question** → type a question → see streamed answer with citations

If something breaks, check the Vercel logs:
```bash
vercel logs legallens.vercel.app
```

---

## Useful Vercel CLI commands

```bash
vercel                    # deploy preview
vercel --prod             # deploy to production
vercel env ls             # list env vars
vercel logs               # tail production logs
vercel logs --prod        # same
vercel inspect            # show deployment details
vercel rm legallens       # delete a deployment
vercel link               # link to existing project
vercel open               # open the project in browser
vercel domains ls         # list custom domains
vercel domains add        # add a custom domain
```

---

## Troubleshooting

### "Build failed" during deploy

Run locally to see the error:
```bash
cd d:\LegalLens
npm run build
```

Common fixes:
- Missing dep → `npm install <package>`
- TypeScript error → fix the file
- Missing env var → add via `vercel env add`

### "redirect_uri_mismatch" on production

You forgot step 6.2. Add `https://legallens.vercel.app/auth/callback` to Google Cloud Console.

### "Your project's URL and Key are required" on production

You forgot step 5.2. Add the Supabase env vars via `vercel env add`.

### App works but uploads fail with 500

The Gemini API key is missing or wrong. Verify:
```bash
vercel env ls
```

Should show all 5 vars. If GEMINI_API_KEY is missing, add it and redeploy.

### Cold starts are slow

Vercel Hobby puts functions to sleep after inactivity. The first request after sleep can take 5-10s. This is normal and the second request is fast.

---

## Cost: $0/month

Everything is on free tiers:
- **Vercel Hobby**: 100 GB bandwidth, unlimited deployments
- **Supabase free**: 500 MB database, 1 GB storage
- **Gemini free tier**: 1500 embedding requests/day
- **Groq free tier**: thousands of LLM requests/day

For personal use, you'll never hit any limit.

---

## Next steps after deploy

- Set up a custom domain: `vercel domains add yourdomain.com`
- Enable automatic deploys: every `git push` to `main` auto-deploys
- Add GitHub Actions for CI: run tests on every PR (not needed for MVP)
