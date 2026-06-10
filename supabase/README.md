# Supabase migrations

Versioned SQL migrations for the BarkBuddy database. These are the first
persisted-data migrations in the project and define the schema, Storage, and
RLS conventions later slices inherit.

## How to apply

Migrations run against the **hosted** Supabase project (no local stack).

```bash
# 1. Link this repo to the hosted project once (uses the project ref).
npx supabase link --project-ref <your-project-ref>

# 2. Push all pending migrations in supabase/migrations/ to the hosted DB.
npx supabase db push
```

## Migrations

- `*_create_profiles.sql` — owner profile, 1:1 with `auth.users`, owner-scoped RLS.
- `*_create_dogs.sql` — one dog per owner (`owner_id` unique), optional `photo_path`, owner-scoped RLS.
- `*_create_dog_photos_bucket.sql` — private `dog-photos` bucket; RLS authorizes by matching the first path segment to `auth.uid()`. No public read policy.

All migrations are non-destructive (new tables/bucket only).
