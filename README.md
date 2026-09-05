This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Backend API

The app calls `<BACKEND_API_URL>/api/*` directly from the browser (see
`lib/api.ts`); the relative `/api/*` rewrite in `next.config.ts` is kept as a
fallback for local development. The backend origin is read from the required
`BACKEND_API_URL` environment variable — there is no hardcoded default, so the
app refuses to start without it. Copy `.env.example` to `.env.local` and set
the value for local development:

```bash
BACKEND_API_URL=http://localhost:8088 npm run dev
```

The value is inlined into the client bundle at build time, so it must be set
when the app is built (Vercel/Netlify: build environment variable). Because
the browser calls the backend directly, the backend must be reachable from
users' browsers and must allow CORS requests from the frontend origin.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Archivo](https://fonts.google.com/specimen/Archivo) for UI text and [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) for data/code.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
