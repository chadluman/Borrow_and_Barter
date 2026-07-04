# Supabase Storage setup for listing images

To make uploaded listing photos persist and be viewable by all users, create a public storage bucket in Supabase.

## 1. Create the bucket

1. Open your Supabase project.
2. Go to Storage.
3. Click Create bucket.
4. Name it: listings
5. Set it to Public.

## 2. Add a public policy

In Storage > Policies, add a policy for the listings bucket.

### Option A: Create from template

1. Choose Create policy from template.
2. Select Public access.
3. Apply it to the listings bucket.

### Option B: Create policy from scratch

Use these values:

- Policy name: public-read-listings
- Policy type: Select
- Target: bucket
- Target roles: public (`anon` and `authenticated`)
- Policy definition: `id = 'listings'`

This gives public read access to files in the listings bucket.

If you want to allow uploads too, be sure to create the upload policy under `storage.objects` rather than the bucket itself:

- Policy name: public-upload-listings
- Policy type: Insert
- Target: object
- Target roles: authenticated
- Policy definition: `bucket_id = 'listings'`

That object policy allows uploads into the listings bucket. If you only create a bucket-level policy for upload, file upload may still fail.

### Option C: Create policies with SQL

If you prefer the SQL editor, run one or more of these statements:

```sql
create policy "public-read-listings" on storage.buckets
  for select using (id = 'listings');

create policy "public-read-objects-listings" on storage.objects
  for select using (bucket_id = 'listings');

create policy "public-upload-listings" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listings'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'gif')
    and coalesce((metadata ->> 'size')::bigint, 0) <= 5242880
  );

create policy "users-delete-own-listing-images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'listings'
    and owner_id = auth.uid()::text
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

The `storage.objects` policies are the ones that actually control file downloads and uploads, so they are required for the app upload flow.

These policies give public access to bucket metadata, object reads, and optional object uploads.

## 3. Create the listings table and apply the schema

If you see `Could not find the table 'public.listings' in the schema cache`, it means the database table has not been created yet.

Open the Supabase SQL editor and run the SQL statements from `supabase-schema.sql`.
This will create the `public.listings` table with the required columns:

- `owner_id`
- `owner_name`
- `image_url`
- `image_urls`
- `location`
- `availability`

If the table was created already but the UI still says it is missing, refresh the schema cache in the Supabase dashboard or reload the project.

### Database policy SQL for listings

If you want to apply the table policies directly, run this SQL in the SQL editor:

```sql
alter table public.listings enable row level security;

grant usage on schema public to anon, authenticated;
grant select on table public.listings to anon, authenticated;
grant insert on table public.listings to authenticated;
grant usage, select on sequence public.listings_id_seq to authenticated;

create policy "Allow public read access to listings" on public.listings for select using (true);
create policy "Allow public insert access to listings" on public.listings
  for insert to authenticated with check (owner_id = auth.uid());
```

Private messages, favorites, and reservations require participant-specific policies. Run the complete `supabase-schema.sql` file instead of creating public message policies; public message reads would expose conversations to every visitor.

## 4. Test

After the bucket is created, upload a photo from the create listing page. The image should appear on the listing detail page and remain visible after refresh.
