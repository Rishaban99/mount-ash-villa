# Mount Ash Villa

Hotel POS & terminal management app built with Next.js, Prisma, and MongoDB.

## Prerequisites

- Node.js 20.9+ (Next.js 16 requirement)
- MongoDB Atlas (or local MongoDB) connection string

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Set `DATABASE_URL` and `SESSION_SECRET` in `.env.local`.

3. Push schema and seed (optional):

   ```bash
   npm run db:push
   npm run db:seed
   ```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production

```bash
npm run build
npm start
```

## Deploy on Vercel

1. Import the repository in Vercel.
2. Set environment variables: `DATABASE_URL`, `SESSION_SECRET`, and optional seed vars.
3. Deploy — Next.js is detected automatically (no custom `vercel.json` needed).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Generate Prisma client and build for production |
| `npm start` | Run production server |
| `npm run lint` | Type-check with TypeScript |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:seed` | Seed initial data |
| `npm run db:studio` | Open Prisma Studio |
