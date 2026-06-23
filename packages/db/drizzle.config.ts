import { defineConfig } from 'drizzle-kit';

// P2-025 audit fix: drizzle-kit is a dev/CI tool — there's no
// legitimate reason to ship a default DB password in the repo.
// Refuse to run without DATABASE_URL instead of falling back to
// `postgres://haa:haa_secret_2024@localhost:5432/haastores`. That
// fallback was the source of the hardcoded-credential flag in the
// gitleaks scan and would silently let `drizzle-kit migrate` hit
// the wrong DB if someone forgot to source `.env`.
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    'DATABASE_URL is required for drizzle-kit. Source your .env file or set it explicitly before running drizzle-kit commands.',
  );
}

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
});
