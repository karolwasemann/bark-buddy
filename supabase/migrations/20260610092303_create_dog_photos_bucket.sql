-- Migration: create private dog-photos Storage bucket + owner-scoped RLS
-- The bucket is private (public = false). Each user may read/write only objects
-- under their own UID prefix: the first path segment must equal auth.uid().
-- No public read policy exists, so photos are never reachable via a public URL.

insert into storage.buckets (id, name, public)
values ('dog-photos', 'dog-photos', false)
on conflict (id) do nothing;

-- Non-obvious: authorize by matching the first folder segment of the object
-- path to the caller's uid, i.e. (storage.foldername(name))[1] = auth.uid()::text.

create policy "dog_photos_select_own"
  on storage.objects
  for select
  using (
    bucket_id = 'dog-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "dog_photos_insert_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'dog-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "dog_photos_update_own"
  on storage.objects
  for update
  using (
    bucket_id = 'dog-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'dog-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "dog_photos_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'dog-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
