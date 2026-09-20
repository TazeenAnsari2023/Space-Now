# Space Now (Next.js Monorepo-Style, Single Deploy)

This project is now organized for a **single Vercel deployment**:

- `app/` -> Next.js App Router shell
- `pages/api/[...path].ts` -> serverless API bridge
- `src/` -> frontend React UI code (moved from old Vite `client/src`)
- `server/src/` -> Express routes/controllers/services reused by API bridge
- `server/data/Indian Cities Geo Data.csv` -> city geo dataset used by backend services

## Key Changes

- Removed old Vite runtime structure from deployment flow.
- Moved frontend source to root `src/` for Next-first structure.
- Kept backend inside repo and exposed it through `/api/*` (no separate frontend/backend deployment required).
- Added robust API bootstrap handling so failures return JSON messages instead of HTML error pages.

## Local Development

### Recommended (single process, same as production behavior)

```bash
npm install
npm install --prefix server
npm run dev
```

This runs only Next.js. API calls go through `pages/api/[...path].ts`.

### Optional legacy two-process mode

```bash
npm run dev:full
```

## Required Environment Variables (Vercel + local)

Set these in Vercel Project Settings -> Environment Variables:

- `MONGO_URI`
- `JWT_SECRET`
- `CORS_ORIGIN` (comma-separated if multiple)
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `NEXT_PUBLIC_API_BASE_URL` (optional; default is `/api`)

For local single-process mode, `server/.env` is automatically loaded by the API bridge.

## Deployment (Vercel)

This repo is configured to deploy as one project. `vercel.json` includes server files for API functions.

If you previously set custom Build/Output settings in Vercel UI:

- Framework Preset: `Next.js`
- Build Command: default
- Output Directory: **empty/default** (do not set `dist`)

## Troubleshooting

### `Unexpected token '<' ... is not valid JSON`
Usually means API endpoint returned an HTML error page. Check:

1. Vercel env vars (especially `MONGO_URI`)
2. Function logs for `/api/*`
3. That deployment uses latest commit with `pages/api/[...path].ts`

### `Request failed` on India Cities
Most often backend bootstrap/DB connection failed. Confirm `MONGO_URI` and function logs.

"# Space-Now" 
