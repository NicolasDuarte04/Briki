-- Ensure artifacts bucket exists and is private
insert into storage.buckets (id, name, public)
values ('artifacts', 'artifacts', false)
on conflict (id) do nothing;

-- TEMP uploads policy: allow authenticated users to insert/read/delete within temp/<uid>/ prefix
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'artifacts_temp_insert'
  ) then
    create policy "artifacts_temp_insert" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'artifacts'
        and split_part(name, '/', 1) = 'temp'
        and split_part(name, '/', 2) = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'artifacts_temp_select'
  ) then
    create policy "artifacts_temp_select" on storage.objects
      for select to authenticated
      using (
        bucket_id = 'artifacts'
        and split_part(name, '/', 1) = 'temp'
        and split_part(name, '/', 2) = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'artifacts_temp_delete'
  ) then
    create policy "artifacts_temp_delete" on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'artifacts'
        and split_part(name, '/', 1) = 'temp'
        and split_part(name, '/', 2) = auth.uid()::text
      );
  end if;
end$$;

-- ORG uploads policy: allow authenticated users who are members of the org in path '<org_id>/...' 
-- Note: org_id comes as first path segment (UUID string)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'artifacts_org_insert'
  ) then
    create policy "artifacts_org_insert" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'artifacts'
        and exists (
          select 1 from public.org_members m
          where m.user_id = auth.uid()
            and m.org_id::text = split_part(name, '/', 1)
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'artifacts_org_select'
  ) then
    create policy "artifacts_org_select" on storage.objects
      for select to authenticated
      using (
        bucket_id = 'artifacts'
        and (
          (split_part(name, '/', 1) = 'temp' and split_part(name, '/', 2) = auth.uid()::text)
          or exists (
            select 1 from public.org_members m
            where m.user_id = auth.uid()
              and m.org_id::text = split_part(name, '/', 1)
          )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'artifacts_org_delete'
  ) then
    create policy "artifacts_org_delete" on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'artifacts'
        and exists (
          select 1 from public.org_members m
          where m.user_id = auth.uid()
            and m.org_id::text = split_part(name, '/', 1)
        )
      );
  end if;
end$$;



