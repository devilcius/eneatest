# ENEATest — Specifications (v1.1)

## 1) Purpose

ENEATest is a React web application (Cloudflare Pages + Pages Functions + D1) that lets a non-technical **administrator**:

* authenticate to access an admin area
* register users
* generate a **unique test link** per user
* view test sessions and results

End users access the system through a unique link and either:

* take the test (if not completed)
* view results (if completed)

The test definition is provided as a **JSON file extracted from `test-auto-gnosis.pdf`**, and is loaded into D1 using a **Node CLI command** (run by a technical operator).

## 2) Stack & Deployment

* Frontend: React (Vite)
* Hosting: Cloudflare Pages
* Backend: Cloudflare Pages Functions (TypeScript)
* DB: Cloudflare D1 (SQLite)

Base app exists:

* `npm create vite@latest eneatest -- --template react`

## 3) Test content (from PDF → JSON)

The test is the “AutoGnosis Eneagrama” structure:

* **9 questionnaires** (types 1..9)
* **20 items per questionnaire** (180 items total)
* Response scale: integer **0..5**
* Scoring: **sum of item responses per questionnaire**
  → yields 9 scores (one per type).
  The “result” is:

  * per-type totals
  * optional ranking (sorted types by score)

### JSON format

We treat `data/test-auto-gnosis.json` as the canonical source in v1.

## 4) Admin Authentication

Same as before: **Cloudflare Access** recommended to protect `/admin/*` and `/api/admin/*`.

* Admin is not a technical role, but does have login capabilities via Access identity provider.
* No passwords stored in D1 (preferred).

## 5) Data model (D1) — updated

### 5.1 Tables

#### `app_user`

Registered people who can take the test.

* `id` (integer pk)
* `external_id` (text, unique) — stable identifier you control (e.g., “U000123”)
* `display_name` (text)
* `email` (text, nullable)
* `created_at` (text ISO)

#### `test_definition`

One active test definition (v1 assumes a single test).

* `id` (text pk) — e.g., `autognosis-eneagrama-9`
* `name` (text)
* `language` (text) — `es`
* `scale_min` (int) — 0
* `scale_max` (int) — 5
* `scale_labels_json` (text) — JSON mapping value→label
* `source_pdf` (text, nullable)
* `version` (int) — increments on load
* `is_active` (int 0/1)
* `created_at` (text ISO)

> `version` allows future evolution without breaking historical sessions.

#### `questionnaire`

Represents Eneatype questionnaire 1..9.

* `id` (integer pk)
* `test_definition_id` (text fk → test_definition.id)
* `eneatype` (int) — 1..9
* `title` (text) — e.g., “Cuestionario 1”
* `order_index` (int) — 1..9
* `created_at` (text ISO)

Unique: `(test_definition_id, eneatype)`

#### `item`

A statement within a questionnaire.

* `id` (integer pk)
* `questionnaire_id` (int fk → questionnaire.id)
* `order_index` (int) — 1..20
* `text` (text)
* `is_active` (int 0/1) — keep soft-delete
* `created_at` (text ISO)
* `updated_at` (text ISO)

Unique: `(questionnaire_id, order_index)`

#### `test_session`

Represents one invitation/link for a user.

* `id` (integer pk)
* `test_definition_id` (text fk → test_definition.id)
* `test_definition_version` (int) — snapshot of version used
* `user_id` (int fk → app_user.id)
* `token` (text, unique) — the link secret (or token hash)
* `status` (text) — `CREATED | STARTED | COMPLETED | REVOKED`
* `created_at` (text ISO)
* `started_at` (text ISO, nullable)
* `completed_at` (text ISO, nullable)
* `revoked_at` (text ISO, nullable)

#### `item_response`

Stores user answers: value 0..5 per item.

* `id` (integer pk)
* `session_id` (int fk → test_session.id)
* `item_id` (int fk → item.id)
* `value` (int) — 0..5
* `created_at` (text ISO)

Unique: `(session_id, item_id)`

#### `session_result`

Computed totals when completed.

* `id` (integer pk)
* `session_id` (int fk → test_session.id, unique)
* `totals_json` (text) — JSON map eneatype → total score
* `ranking_json` (text) — JSON array sorted by score desc, e.g. `[{"eneatype":7,"score":78}, ...]`
* `created_at` (text ISO)

### 5.2 Migration notes

* Prefer soft deletes (`is_active=0`) on `item`.
* Sessions store `test_definition_version` so results remain interpretable if items change later.

## 6) CLI: Load JSON into D1 (no admin UI for it)

Because the admin is non-technical, loading test content is done via a Node command.

### Command

Example:

```bash
node scripts/load-test-definition.mjs \
  --db ./path/to/local-d1.sqlite \
  --json ./test-auto-gnosis.json \
  --activate
```

For Cloudflare, you’ll also support:

```bash
npx wrangler d1 execute <DB_NAME> --file migrations/0001_init.sql
node scripts/load-test-definition.mjs --wrangler --db-name <DB_NAME> --json ./test-auto-gnosis.json --activate
```

### Behavior

* Validates JSON structure (test id, 9 questionnaires, 20 items each, scale 0..5)
* Inserts a new `test_definition` row with `version = previous+1`
* Inserts questionnaires and items
* If `--activate` is set:

  * sets previous `test_definition.is_active=0`
  * sets new one `is_active=1`
* Should be **idempotent** per (test id + version) run, or at least safe:

  * Either refuse if same version already exists
  * Or provide `--force` to replace that version

### Output

* Logs inserted counts (questionnaires, items)
* Logs active test id/version

## 7) Endpoints — updated

### Public API

#### `GET /api/public/session/:token`

Returns:

* session status and basic user info (non-sensitive)
* active test definition metadata (scale, name)
* full list of items grouped by questionnaire
* if completed: `session_result` and optional responses (depending on UX choice)

Example response shape:

```json
{
  "session": { "status":"CREATED", "id": 123 },
  "test": {
    "id":"autognosis-eneagrama-9",
    "version": 3,
    "name":"...",
    "scale": { "min":0, "max":5, "labels": { "0":"...", "5":"..." } },
    "questionnaires":[
      { "eneatype":1, "title":"Cuestionario 1", "items":[{"id":11,"order":1,"text":"..."}] }
    ]
  },
  "result": null
}
```

#### `POST /api/public/session/:token/start`

* If status `CREATED` → set `STARTED`, set `started_at`
* If already started/completed → no-op

#### `POST /api/public/session/:token/submit`

Payload:

```json
{
  "answers": [
    { "itemId": 1234, "value": 0 },
    { "itemId": 1235, "value": 4 }
  ]
}
```

Rules:

* validate session exists and not revoked/completed
* validate itemIds belong to the session’s test definition version
* validate values are integers 0..5
* require all active items (180) unless you choose partial completion (v1 recommends **require all**)
* transactional insert/update responses
* compute totals by questionnaire (eneatype)
* write `session_result`
* mark `COMPLETED`

### Admin API (protected)

#### Users

* `GET /api/admin/users`
* `POST /api/admin/users`
* `GET /api/admin/users/:id`
* `PUT /api/admin/users/:id` (optional)
* `POST /api/admin/users/:id/session` → create new link

#### Sessions / results

* `GET /api/admin/sessions` (filters by status, search by user)
* `GET /api/admin/sessions/:id` (includes result + responses)
* `POST /api/admin/sessions/:id/revoke`
* `POST /api/admin/sessions/:id/reset` (optional: deletes responses/result and returns to CREATED)

#### Test content editing (admin can edit questions/items)

Because items are statements, admin editing is item-centric:

* `GET /api/admin/test`
  returns active test definition + questionnaires + items
* `PUT /api/admin/items/:id`
  body: `{ "text": "...", "isActive": true }`
* `POST /api/admin/questionnaires/:id/items` (optional; probably not needed v1)
* `POST /api/admin/test/reorder` (optional; likely skip v1)

> v1 recommended scope: allow editing item text and toggling active/inactive. Avoid adding/removing items initially.

## 8) UI Requirements — updated

### Public test page (`/t/:token`)

* Show test title and brief instructions
* Render 9 sections (Cuestionario 1..9)
* Each item has a 0..5 choice (radio group)
* Scale labels visible (0=No, Nunca … 5=Sí, Muy cierto)
* “Submit” button enabled only when all required items answered
* After submit: show totals per type + ranking

### Admin UI

* Users:

  * create user
  * create link (copy to clipboard)
* Sessions:

  * list sessions with status
  * view results (totals + ranking + optionally raw responses)
* Items editor:

  * list items by questionnaire
  * edit text inline
  * toggle active

## 9) Scoring & Results

On completion:

* Compute totals:

  * For each eneatype questionnaire: sum values of its 20 items
* Compute ranking:

  * sort eneatypes by total desc
  * tie-handling: keep stable order by eneatype asc (or include ties explicitly)

Persist:

* `session_result.totals_json`
* `session_result.ranking_json`

## 10) Security considerations

* Cloudflare Access protects admin routes and pages
* Token entropy: at least 128 bits
* Consider storing token hash in DB (SHA-256) and comparing hashes
* Rate limit `/submit` (basic per-IP) if needed

## 11) Repo Structure (proposed)

```
eneatest/
  functions/
    api/
      public/...
      admin/...
  src/
    pages/
      Admin/
      PublicTest/
    components/
    api/
  scripts/
    load-test-definition.mjs
  test-definitions/
    test-auto-gnosis.json
  migrations/
    0001_init.sql
  SPEC.md
```

## 12) Milestones — updated

### M1 — DB + loader

* migrations for updated schema
* Node CLI loads `test-auto-gnosis.json` into D1
* `GET /api/public/session/:token` returns test structure

### M2 — public take test

* UI rendering 9×20 items
* submit + scoring + result persistence

### M3 — admin core

* Access protection
* user CRUD (minimal)
* create session link
* sessions list + results view

### M4 — admin item editor

* edit item text + active toggle
* ensure completed sessions remain viewable


 
