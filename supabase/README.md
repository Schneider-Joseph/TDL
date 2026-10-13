# Supabase setup for TDL cloud sync

This folder prepares the database and security rules for syncing tasks between browsers. The current app still uses browser local storage; cloud sync is **not enabled yet**.

## Why Supabase

TDL can start on Supabase's free tier: hosted Postgres plus authentication, with no server to maintain. Free-tier quotas and terms can change, so check the current plan before relying on it long-term.

## Setup

1. Create a Supabase project at https://supabase.com/dashboard.
2. Open SQL Editor → New query.
3. Paste the contents of schema.sql and run it.
4. In Authentication → URL Configuration, set the site URL to the eventual TDL web address. You can revisit this when GitHub Pages is enabled.
5. Keep the project URL and publishable key available for the later browser integration step. These are designed for client use when database Row Level Security is configured. Never put a database password, secret key, or legacy service_role key in browser code or GitHub.
6. Do not import personal task data until the client sync implementation is added and tested.

## What the schema protects

- Every row has a user_id linked to Supabase Auth.
- Row Level Security is enabled and policies require the signed-in user's ID to match user_id for read, insert, update, and delete.
- Unauthenticated (anon) table privileges are revoked.
- Constraints match TDL's current categories, priorities, title and notes limits.
- Task IDs remain text to support existing TDL IDs and backup imports. created_at and updated_at are Unix epoch milliseconds, matching the current browser app.

## Next implementation

1. Add sign-in/sign-out UI and load the Supabase browser client.
2. Add a migration path for existing local tasks, with explicit user confirmation.
3. Implement authenticated CRUD and conflict handling; preserve local data if sync fails.
4. Test isolation with two accounts before treating cloud sync as ready.

Until those steps are complete, continue using TDL's Export backup feature. The SQL file is a database foundation, not a working sync feature by itself.
