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

update public.profiles as profile
set
  first_name = coalesce(
    nullif(profile.first_name,''),
    nullif(auth_user.raw_user_meta_data->>'given_name',''),
    split_part(coalesce(auth_user.raw_user_meta_data->>'full_name',auth_user.email,''),' ',1)
  ),
  last_name = coalesce(
    nullif(profile.last_name,''),
    nullif(auth_user.raw_user_meta_data->>'family_name',''),
    ''
  ),
  updated_at = now()
from auth.users as auth_user
where profile.id = auth_user.id
  and (profile.first_name = '' or profile.last_name = '');
