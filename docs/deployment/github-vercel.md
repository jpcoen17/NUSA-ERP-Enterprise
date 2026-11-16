# Deploy: GitHub -> Vercel (step by step)

## 1. Push to GitHub (PowerShell, in the project folder)
```powershell
git init
git add .
git commit -m "feat: NUSA ERP demo (stages 1-9 + PWA)"
git branch -M main
git remote add origin https://github.com/<username>/nusa-erp-enterprise.git
git push -u origin main
git checkout -b develop
git push -u origin develop
```
Create the empty repo on github.com first (do NOT tick "add README"). `.env.local` is git-ignored: check with `git status` that it is not listed.

## 2. Vercel
1. vercel.com -> Add New -> Project -> Import the GitHub repo (login with GitHub is fine).
2. Framework preset: Vite. Build `npm run build`, output `dist` (already in vercel.json).
3. Environment Variables (Production AND Preview):
   - `VITE_SUPABASE_URL` = https://<ref>.supabase.co
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = your publishable key (never service_role)
4. Deploy. Production branch = `main`; every other branch gets a preview URL.

## 3. Supabase must allow the new URL
Supabase Dashboard -> Authentication -> URL Configuration:
- Site URL: your Vercel URL (https://xxx.vercel.app)
- Redirect URLs: add the same URL (and preview URLs if wanted).
Without this, email verification and password-reset links point to localhost.

## 4. Verify (do not skip)
Open the public URL: log in, open Module 1 dashboard and one generic module. On Android Chrome: menu -> "Install app" / "Add to Home screen".
A deployment is only "done" after these checks pass.

## PWA notes
- Installable (manifest + icons + service worker). The service worker caches only the app shell and static assets, never Supabase/API data.
- Offline: shows an offline notice page. The app needs internet to load data. Offline data mode is not built.
- Passkeys need HTTPS (Vercel provides it); not implemented yet.
- Not yet configured: CSP header, rate limiting, error monitoring, load testing.
