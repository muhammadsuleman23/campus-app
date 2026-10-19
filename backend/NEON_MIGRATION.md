# MongoDB → Neon (Postgres) Migration

Your backend now uses **Neon Postgres** instead of MongoDB/Mongoose.

## What changed
- Removed `mongoose`; added `@neondatabase/serverless`.
- `config/db.js` — Neon connection (`sql` tagged-template query function).
- `config/schema.sql` — full Postgres schema (10 tables).
- `config/initDb.js` — one-time script to create the tables.
- All 9 models rewritten to run SQL but keep the **same method names**
  (`find`, `findById`, `create`, `new Model().save()`, `deleteOne`) and return
  the same `_id` / camelCase / populated shape, so the controllers and the
  frontend did not need changes — except the chat & message controllers, which
  were rewritten to use direct SQL (their Mongo queries used `$elemMatch`,
  nested `populate`, etc.).
- `server.js` now pings Neon instead of connecting to Mongo.

## Setup steps
1. Create a project at https://neon.tech and copy the **pooled** connection string.
2. Put it in `backend/.env` as `DATABASE_URL=...` (file already scaffolded).
   Also set real `JWT_SECRET`, `OPENAI_API_KEY`, `GEMINI_API_KEY`.
3. Install deps:  `npm install`
4. Create the tables:  `npm run init-db`
5. Start:  `npm run dev`

## Notes / IDs
- IDs are now UUID strings (e.g. `"3f2c..."`) instead of Mongo ObjectIds.
  The API still returns them as `_id`, so the frontend is unaffected.
- `images`, `tags`, `reviews` are stored as JSONB arrays.
- `chat.users` (a Mongo array) is now a `chat_users` join table.

## Migrating existing Mongo data (optional)
Your old data is NOT copied automatically. If you need it:
- Export each Mongo collection to JSON (`mongoexport`).
- Insert into the matching Postgres table, mapping `_id`→`id`,
  `createdAt`→`created_at`, the `users` array → `chat_users` rows, etc.
Ask if you want a ready-made import script.

## Security
The original `.env` in your zip contained live MongoDB credentials and API
keys. Rotate the OpenAI/Gemini keys, the JWT secret, and the DB password —
they were exposed.
