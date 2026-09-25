alter table public.generations
  add column if not exists provider text,
  add column if not exists provider_project_id text,
  add column if not exists provider_credits numeric(12,2),
  add column if not exists error_message text;

create unique index if not exists generations_provider_project_id_idx
  on public.generations(provider, provider_project_id)
  where provider_project_id is not null;

insert into storage.buckets(id,name,public,file_size_limit)
values('generated-assets','generated-assets',false,104857600)
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit;

create or replace function public.start_generation(request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected public.model_definitions;
  requested_count integer := greatest(coalesce((request->>'count')::integer,1),1);
  cost numeric;
  created public.generations;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into selected
  from public.model_definitions
  where slug=request->>'model' and active;
  if selected.id is null then raise exception 'Model not found'; end if;

  select unit_cost * requested_count into cost
  from public.generation_prices
  where model_id=selected.id
    and (duration is null or duration=coalesce((request->>'duration')::integer,duration))
    and (resolution is null or lower(resolution)=lower(coalesce(request->>'resolution',resolution)))
  limit 1;
  if cost is null then raise exception 'Unsupported generation settings'; end if;

  update public.profiles
  set credit_balance=credit_balance-cost,updated_at=now()
  where id=auth.uid() and credit_balance>=cost;
  if not found then raise exception 'Not enough credits' using errcode='P0001'; end if;

  insert into public.generations(
    user_id,model_id,media_type,status,prompt,request_snapshot,idempotency_key,provider
  ) values (
    auth.uid(),selected.id,selected.media_type,'PROCESSING',request->>'prompt',request,
    coalesce(request->>'idempotencyKey',gen_random_uuid()::text),'MAGIC_HOUR'
  ) returning * into created;

  return jsonb_build_object('id',created.id,'status',created.status,'cost',cost);
exception
  when unique_violation then
    select * into created from public.generations
    where user_id=auth.uid() and idempotency_key=request->>'idempotencyKey';
    return jsonb_build_object('id',created.id,'status',created.status);
end $$;

create or replace function public.refund_failed_generation(generation_uuid uuid, failure_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  job public.generations;
  refund numeric;
begin
  select * into job from public.generations
  where id=generation_uuid and user_id=auth.uid() for update;
  if job.id is null or job.status <> 'PROCESSING' then return; end if;

  select unit_cost * greatest(coalesce((job.request_snapshot->>'count')::integer,1),1)
  into refund
  from public.generation_prices
  where model_id=job.model_id
    and (duration is null or duration=coalesce((job.request_snapshot->>'duration')::integer,duration))
    and (resolution is null or lower(resolution)=lower(coalesce(job.request_snapshot->>'resolution',resolution)))
  limit 1;

  update public.generations set status='FAILED',error_message=failure_message,completed_at=now()
  where id=job.id;
  update public.profiles set credit_balance=credit_balance+coalesce(refund,0),updated_at=now()
  where id=auth.uid();
end $$;

revoke all on function public.start_generation(jsonb),public.refund_failed_generation(uuid,text) from public;
grant execute on function public.start_generation(jsonb),public.refund_failed_generation(uuid,text) to authenticated;

update public.model_definitions
set display_name='Flux Schnell',
    capabilities='{"aspectRatios":["16:9","9:16","1:1"],"resolutions":["640px","1K"],"qualities":["High"],"maxCount":4,"references":false}'::jsonb
where slug='imagen-4-fast';

delete from public.generation_prices
where model_id=(select id from public.model_definitions where slug='imagen-4-fast');
insert into public.generation_prices(model_id,duration,resolution,unit_cost)
select id,null::integer,resolution,5::numeric
from public.model_definitions
cross join (values('640px'),('1K')) r(resolution)
where slug='imagen-4-fast';

update public.model_definitions
set display_name='LTX 2.5',
    capabilities='{"aspectRatios":["16:9","9:16","1:1"],"resolutions":["480p"],"durations":[4,6,8],"maxCount":1,"references":false}'::jsonb
where slug='veo-3-1-fast';

delete from public.generation_prices
where model_id=(select id from public.model_definitions where slug='veo-3-1-fast');
insert into public.generation_prices(model_id,duration,resolution,unit_cost)
select id,duration,'480p',duration*30
from public.model_definitions
cross join (values(4),(6),(8)) d(duration)
where slug='veo-3-1-fast';
