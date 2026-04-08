# Deployment Guide (Vercel Frontend + Render Backend)

Use this deployment model:
1. Frontend website/mobile web on Vercel
2. Backend API on Render

## 0) Your deployment consoles

- Render project dashboard: https://dashboard.render.com/project/prj-d7akej14tr6s73ed6po0
- Vercel new project (team): https://vercel.com/new?teamSlug=vullampavan13-2895s-projects

Important:
- These are dashboard links, not live production app links.
- After deployment, copy the generated production URLs and replace placeholders in this document.

## 1) Final deploy links (fill after deployment)

- Frontend (Vercel): `https://YOUR_FRONTEND_PROJECT.vercel.app`
- Backend (Render): `https://YOUR_BACKEND_SERVICE.onrender.com`

These are the two links you will use in production.

## 2) Deploy backend on Render

- Create a new **Web Service** in Render
- Connect this repository
- Set root directory to `backend`
- Runtime: `Node`
- Build command: `npm install`
- Start command: `npm run start`

Quick path using your Render dashboard:
1. Open https://dashboard.render.com/project/prj-d7akej14tr6s73ed6po0
2. Click `New` -> `Web Service`
3. Choose your GitHub repo and branch
4. Set root directory `backend`
5. Build command `npm install`
6. Start command `npm run start`
7. Add env vars from section 2 and deploy

### Required backend env vars in Render

- `NODE_ENV=production`
- `PORT=10000`
- `JWT_SECRET=REPLACE_WITH_64_CHAR_RANDOM_SECRET`
- `USE_MONGODB=true`
- `MONGO_URI=mongodb://...` (Atlas URI)
- `MONGO_REQUIRED=true`
- `SQL_FALLBACK_WHEN_MONGO=false`
- `CORS_ALLOWED_ORIGINS=https://YOUR_FRONTEND_PROJECT.vercel.app`
- `ADMIN_NAME=Gita Admin`
- `ADMIN_EMAIL=admin@yourdomain.com`
- `ADMIN_PASSWORD=REPLACE_WITH_STRONG_PASSWORD`
- `EMAIL_USER=yourgmail@gmail.com`
- `EMAIL_PASS=your_16_char_gmail_app_password`
- `EMAIL_FROM_NAME=Gita Wisdom`

Optional:
- `LEGACY_PORT=5000`
- `DB_DIALECT=sqlite` (only if you intentionally want SQL fallback)
- `SQLITE_STORAGE=/tmp/gita_wisdom.sqlite` (only with SQL fallback)
- `DB_SYNC_ALTER=false` (only with SQL fallback)

After Render deploy, copy backend URL:
- `https://YOUR_BACKEND_SERVICE.onrender.com`

## 3) Deploy frontend on Vercel

- In Vercel, click **Add New Project**
- Select this repository
- Set **Root Directory** to `frontend`
- Framework preset: **Vite**

Quick path using your Vercel link:
1. Open https://vercel.com/new?teamSlug=vullampavan13-2895s-projects
2. Import this GitHub repository
3. Set root directory `frontend`
4. Keep framework `Vite`
5. Add env var `VITE_API_BASE_URL` with your Render backend URL
6. Click Deploy

Set this env var in Vercel:
- `VITE_API_BASE_URL=https://YOUR_BACKEND_SERVICE.onrender.com`

The SPA rewrite in `frontend/vercel.json` is already configured.

## 4) Website + Mobile readiness

- Website build is ready and verified
- Mobile version is ready as responsive mobile web + PWA install flow
- Backend API is ready for Render with env vars above

## 5) Post-deploy API smoke test map

After backend deploy, replace `BACKEND_URL` and test:

- `GET BACKEND_URL/` -> expect `200`
- `GET BACKEND_URL/api/videos` -> expect `200`
- `GET BACKEND_URL/api/stories` -> expect `200`
- `GET BACKEND_URL/api/movies` -> expect `200`
- `GET BACKEND_URL/api/slokas/daily` -> expect `200`
- `GET BACKEND_URL/api/search` -> expect `200`
- `GET BACKEND_URL/api/auth/profile` (without token) -> expect `401`

## 6) Security behavior enforced in production

- No weak default JWT secret in production
- No mock-auth fallback if DB fails in production
- Mongo connection is required (`MONGO_REQUIRED=true`) so deploy fails fast if Atlas is unreachable
- CORS restricted via `CORS_ALLOWED_ORIGINS`
- Basic request throttling for API and auth routes

