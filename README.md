# ITDVoIP CRM

Outbound pipeline for ITDVoIP hosted PBX. Three separate pieces:

| Piece | Where it runs | What it does |
| --- | --- | --- |
| The agent | A Claude scheduled task, in Anthropic's cloud | Wakes daily, researches, writes drafts into Supabase |
| This app | Vercel | Shows the queue, lets you approve and send, keeps the history |
| Supabase | Supabase (us-east-1) | The database both of them talk to |

Your computer is only a browser. The agent runs whether or not it is on.

## Setup

1. **Supabase project** — create one, then apply the migration:
   ```
   supabase/migrations/0001_init.sql
   ```
   Paste it into the SQL editor, or `supabase db push` if you use the CLI.

2. **Create your user** — Supabase → Authentication → Users → Add user.
   There is no public sign-up; this is an internal tool.

3. **Environment** — copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   The service role key is **not** used by this app. It belongs only to the
   agent, and never in Vercel's public env vars.

4. **Run it**
   ```
   npm install
   npm run dev
   ```

5. **Deploy** — push to GitHub, import into Vercel, set the same two env vars.

## What the schema enforces, so the prompt does not have to

Rules that matter are in the database, not only in the agent's instructions:

- **Four touches, then stop.** When a draft is marked sent, a trigger bumps
  `touch_count`, logs a touch, and sets `do_not_contact` at four.
- **Do-not-contact is honoured on insert.** Queueing a draft for someone on
  the list raises an exception. The agent cannot work around it.
- **Every wire center needs a `source_url`.** A date with no filing behind it
  cannot be stored, so it cannot end up in an email.
- **Prospects are unique on company + ZIP**, so the agent cannot add the same
  firm twice across runs.

The draft review screen marks a draft in red when the prospect has no
verifiable fact or no source recorded. Do not send those.

## How the agent writes here

The scheduled task talks to Supabase over the REST API with the service role
key, which bypasses RLS. It should, on each run:

1. **Read first, to avoid repeating itself**
   - `GET /rest/v1/wire_centers?worked=eq.false&order=discontinue_date`
   - `GET /rest/v1/followups_due`
   - `GET /rest/v1/prospects?select=company,zip` (to deduplicate)
2. **Write what it found**
   - `POST /rest/v1/wire_centers` — new filings, always with `source_url`
   - `POST /rest/v1/prospects` — new companies, with `trigger_detail` and
     `trigger_source_url` filled in. No fact, no prospect.
   - `POST /rest/v1/drafts` — one per prospect, `status: "pending"`
   - `POST /rest/v1/agent_runs` — what it did, and anything needing a decision

Headers:
```
apikey: <service_role_key>
Authorization: Bearer <service_role_key>
Content-Type: application/json
Prefer: return=representation
```

## Phase 2: sending from the app

Phase 1 is deliberately manual — copy the body, send from Outlook, mark it
sent. That is enough while the message is still being proven, and it needs no
mail infrastructure.

When volume justifies it, sending moves into the app through the **Microsoft
Graph API**: an app registration in the outreach tenant, OAuth client
credentials, and `POST /users/{mailbox}/sendMail`. Reply detection runs the
same way — poll or subscribe to the mailbox, match `internetMessageId` against
`drafts.message_id`, and set the prospect to `replied`. No SMTP passwords
anywhere.

The app registration has to be done by a tenant admin; it cannot be scripted
from here.
