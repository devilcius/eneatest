# ENEATest

ENEATest is a React web app deployed on **Cloudflare Pages** with **Pages Functions** and **D1**.
It allows admins to register users, generate unique test links, and review results.

---

## Tech stack

- Frontend: React, Vite
- Backend: Cloudflare Pages Functions
- Database: Cloudflare D1 (SQLite)
- Deployment: Cloudflare Pages

---

## Local development

### Install dependencies

```bash
npm install
```

### Apply D1 migrations locally

```bash
npx wrangler d1 migrations apply eneatest --local
```

### Run locally with Pages + Functions

```bash
npx wrangler pages dev --d1 DB -- npm run dev
```

The app will be available at:

```
http://localhost:8788
```

---

## Environment & persistence

### Databases per environment

- Local: D1 in local SQLite via Wrangler (`--local`).
- Staging (optional): separate D1 database.
- Production: dedicated D1 database bound in Pages.
- Use the same binding name (`DB`) in all environments.

### Migrations workflow

1. Apply locally first:

```bash
npx wrangler d1 migrations apply eneatest --local
```

2. Apply to staging/prod:

```bash
npx wrangler d1 migrations apply eneatest --remote
```

### Seed / test definition loader

- Load the test definition JSON via the CLI loader after migrations.
- Run locally after schema changes.
- Run on staging/prod only when the test definition changes.

Example:

```bash
node scripts/load-test-definition.mjs --db ./data/local-d1.sqlite --json ./data/test-auto-gnosis.json --activate
```

Wrangler mode (remote):

```bash
node scripts/load-test-definition.mjs --wrangler --db-name eneatest --json ./data/test-auto-gnosis.json --activate
```

### Data access layer

- All database access lives in `functions/`.
- Keep SQL in small DAL modules (users, sessions, items, results).
- Route handlers orchestrate requests, DAL handles queries.

### Secrets & configuration

- Use Pages **D1 bindings** for the database.
- Use Pages **Secrets** for sensitive values (token salt, admin config).
- Store local secrets in `.env` (gitignored).
  - Required: `TOKEN_SALT` for hashing public session tokens.

---

## Deployment (Cloudflare Pages)

1. Create a **Pages** project in Cloudflare and connect it to this GitHub repository.
2. Configure build settings:

   - Build command: `npm run build`
   - Output directory: `dist`
   - Deploy command: (leave empty)

3. Add a **D1 binding** in:

   - Pages → Settings → Functions → D1 database bindings
   - Binding name: `DB`
   - Database: `eneatest`

4. Apply migrations to the remote database:

```bash
npx wrangler d1 migrations apply eneatest --remote
```

Each push to `main` triggers an automatic deployment.

---

## Notes

- For local development, update `wrangler.json` with your D1 database ID.
- The `functions/` folder contains Pages Functions endpoints.

---

## License

Private / internal use.
