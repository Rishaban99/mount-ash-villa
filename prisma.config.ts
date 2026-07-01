import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL || 'mongodb+srv://placeholder:placeholder@cluster0.mongodb.net/placeholder?retryWrites=true&w=majority',
  },
});
