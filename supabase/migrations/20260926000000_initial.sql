create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  role text not null default 'USER' check (role in ('USER', 'ADMIN')),
  credit_balance numeric(12,2) not null default 100 check (credit_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null,
  monthly_price_cents integer not null, yearly_price_cents integer not null,
  monthly_credits numeric(12,2) not null, active boolean not null default true
);
create table public.credit_packs (
  id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null,
  price_cents integer not null, credits numeric(12,2) not null, active boolean not null default true
);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.plans(id), interval text not null check (interval in ('MONTHLY','YEARLY')),
  status text not null default 'ACTIVE', current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null, cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index one_active_subscription on public.subscriptions(user_id) where status = 'ACTIVE';

create table public.model_definitions (
  id uuid primary key default gen_random_uuid(), slug text unique not null, display_name text not null,
  media_type text not null check (media_type in ('IMAGE','VIDEO')), capabilities jsonb not null,
  active boolean not null default true
);
create table public.generation_prices (
  id uuid primary key default gen_random_uuid(), model_id uuid not null references public.model_definitions(id) on delete cascade,
  duration integer, resolution text, unit_cost numeric(12,2) not null,
  unique nulls not distinct(model_id, duration, resolution)
);
create table public.uploads (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  object_path text unique not null, filename text not null, content_type text not null, size integer not null,
  status text not null default 'PENDING', created_at timestamptz not null default now()
);
create table public.generations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  model_id uuid references public.model_definitions(id), media_type text not null check (media_type in ('IMAGE','VIDEO')),
  status text not null default 'SUCCEEDED', prompt text not null, request_snapshot jsonb not null default '{}'::jsonb,
  idempotency_key text not null, created_at timestamptz not null default now(), completed_at timestamptz,
  unique(user_id, idempotency_key)
);
create table public.assets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  generation_id uuid references public.generations(id) on delete cascade, media_type text not null,
  preview_url text not null, content_type text not null, created_at timestamptz not null default now(), deleted_at timestamptz
);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,email,first_name,last_name)
  values(
    new.id,
    coalesce(new.email,''),
    coalesce(nullif(new.raw_user_meta_data->>'first_name',''),nullif(new.raw_user_meta_data->>'given_name',''),split_part(coalesce(new.raw_user_meta_data->>'full_name',new.email,''),' ',1)),
    coalesce(nullif(new.raw_user_meta_data->>'last_name',''),nullif(new.raw_user_meta_data->>'family_name',''),'')
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.get_credit_balance() returns numeric language sql stable security invoker
as $$ select credit_balance from public.profiles where id = auth.uid() $$;

create or replace function public.mock_subscribe(plan_slug text, billing_interval text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare selected public.plans; created_subscription public.subscriptions;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into selected from public.plans where slug=plan_slug and active;
  if selected.id is null then raise exception 'Plan not found'; end if;
  update public.subscriptions set status='CANCELLED' where user_id=auth.uid() and status='ACTIVE';
  insert into public.subscriptions(user_id,plan_id,interval,current_period_end)
  values(auth.uid(),selected.id,billing_interval,now() + case when billing_interval='YEARLY' then interval '1 year' else interval '1 month' end) returning * into created_subscription;
  update public.profiles set credit_balance=credit_balance+selected.monthly_credits where id=auth.uid();
  return to_jsonb(created_subscription);
end $$;

create or replace function public.mock_top_up(pack_slug text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare selected public.credit_packs;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into selected from public.credit_packs where slug=pack_slug and active;
  if selected.id is null then raise exception 'Credit pack not found'; end if;
  update public.profiles set credit_balance=credit_balance+selected.credits where id=auth.uid();
  return jsonb_build_object('credits',selected.credits);
end $$;

create or replace function public.cancel_subscription() returns jsonb language plpgsql security definer set search_path = '' as $$
declare cancelled public.subscriptions;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.subscriptions set cancel_at_period_end=true,updated_at=now()
  where user_id=auth.uid() and status='ACTIVE' returning * into cancelled;
  return to_jsonb(cancelled);
end $$;

create or replace function public.create_mock_generation(request jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare selected public.model_definitions; cost numeric; generation_id uuid; asset_id uuid; kind text; preview text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into selected from public.model_definitions where slug=request->>'model' and active;
  if selected.id is null then raise exception 'Model not found'; end if;
  select unit_cost * greatest(coalesce((request->>'count')::int,1),1) into cost from public.generation_prices
    where model_id=selected.id and (duration is null or duration=coalesce((request->>'duration')::int,duration))
    and (resolution is null or resolution=coalesce(request->>'resolution',resolution)) limit 1;
  update public.profiles set credit_balance=credit_balance-coalesce(cost,0) where id=auth.uid() and credit_balance>=coalesce(cost,0);
  if not found then raise exception 'Not enough credits' using errcode='P0001'; end if;
  kind := selected.media_type;
  preview := case when kind='VIDEO' then '/dashboard/Generate_video_from_image_1080p_20260921161352.mp4' else '/Female_model_posing_in_architecture_20260921034158.jpeg' end;
  insert into public.generations(user_id,model_id,media_type,status,prompt,request_snapshot,idempotency_key,completed_at)
  values(auth.uid(),selected.id,kind,'SUCCEEDED',request->>'prompt',request,coalesce(request->>'idempotencyKey',gen_random_uuid()::text),now()) returning id into generation_id;
  insert into public.assets(user_id,generation_id,media_type,preview_url,content_type)
  values(auth.uid(),generation_id,kind,preview,case when kind='VIDEO' then 'video/mp4' else 'image/jpeg' end) returning id into asset_id;
  return jsonb_build_object('id',generation_id,'status','SUCCEEDED','assets',jsonb_build_array(jsonb_build_object('id',asset_id)));
end $$;

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.credit_packs enable row level security;
alter table public.subscriptions enable row level security;
alter table public.model_definitions enable row level security;
alter table public.generation_prices enable row level security;
alter table public.uploads enable row level security;
alter table public.generations enable row level security;
alter table public.assets enable row level security;

create policy "own profile" on public.profiles for select to authenticated using ((select auth.uid())=id);
create policy "update own profile" on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy "public plans" on public.plans for select to anon,authenticated using (active);
create policy "public packs" on public.credit_packs for select to anon,authenticated using (active);
create policy "public models" on public.model_definitions for select to anon,authenticated using (active);
create policy "public prices" on public.generation_prices for select to anon,authenticated using (true);
create policy "own subscriptions" on public.subscriptions for select to authenticated using ((select auth.uid())=user_id);
create policy "own uploads" on public.uploads for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "own generations" on public.generations for select to authenticated using ((select auth.uid())=user_id);
create policy "own assets" on public.assets for select to authenticated using ((select auth.uid())=user_id);

insert into storage.buckets(id,name,public,file_size_limit) values('references','references',false,52428800) on conflict(id) do nothing;
create policy "upload own references" on storage.objects for insert to authenticated with check (bucket_id='references' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "read own references" on storage.objects for select to authenticated using (bucket_id='references' and (storage.foldername(name))[1]=(select auth.uid())::text);

revoke all on table public.profiles,public.plans,public.credit_packs,public.subscriptions,public.model_definitions,public.generation_prices,public.uploads,public.generations,public.assets from anon,authenticated;
grant select on public.plans,public.credit_packs,public.model_definitions,public.generation_prices to anon,authenticated;
grant select on public.profiles,public.subscriptions,public.uploads,public.generations,public.assets to authenticated;
grant update(first_name,last_name) on public.profiles to authenticated;
grant insert on public.uploads to authenticated;
grant update(status) on public.uploads to authenticated;
revoke all on function public.get_credit_balance(),public.mock_subscribe(text,text),public.mock_top_up(text),public.cancel_subscription(),public.create_mock_generation(jsonb) from public;
grant execute on function public.get_credit_balance(),public.mock_subscribe(text,text),public.mock_top_up(text),public.cancel_subscription(),public.create_mock_generation(jsonb) to authenticated;

insert into public.plans(slug,name,monthly_price_cents,yearly_price_cents,monthly_credits) values
('creator','Creator',2900,26400,600),('studio','Studio',7900,74400,2500) on conflict(slug) do nothing;
insert into public.credit_packs(slug,name,price_cents,credits) values
('boost-100','100 credit boost',500,100),('boost-500','500 credit boost',2000,500) on conflict(slug) do nothing;
insert into public.model_definitions(slug,display_name,media_type,capabilities) values
('imagen-4-fast','Imagen 4 Fast','IMAGE','{"aspectRatios":["16:9","9:16"],"resolutions":["1K","2K"],"qualities":["High"],"maxCount":4,"references":true}'),
('veo-3-1-fast','Veo 3.1 Fast','VIDEO','{"aspectRatios":["16:9","9:16"],"resolutions":["720p","1080p"],"durations":[4,6,8],"maxCount":1,"references":true}') on conflict(slug) do nothing;
insert into public.generation_prices(model_id,duration,resolution,unit_cost)
select id,null::integer,'1K'::text,6.5::numeric from public.model_definitions where slug='imagen-4-fast' union all
select id,null::integer,'2K'::text,6.5::numeric from public.model_definitions where slug='imagen-4-fast' union all
select id,duration,resolution,(case duration when 4 then 60 when 6 then 90 else 120 end)*(case when resolution='1080p' then 1.25 else 1 end)
from public.model_definitions cross join (values(4),(6),(8)) d(duration) cross join (values('720p'),('1080p')) r(resolution) where slug='veo-3-1-fast'
on conflict do nothing;
