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
