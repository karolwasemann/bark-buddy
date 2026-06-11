-- Migration: create find_matches() security-definer function
-- Returns matched users whose walking circles overlap ≥10% of the smaller circle.
-- Never exposes coordinates, radius, or overlap percentage.

create or replace function find_matches(requesting_user_id uuid)
returns table (
  profile_id uuid,
  display_name text,
  bio text,
  dog_name text,
  dog_breed text,
  dog_photo_path text,
  distance_bucket text
)
language sql
security definer
set search_path = public
stable
as $$
  with requester_pin as (
    select wp.location, wp.radius_m
    from walking_pins wp
    join dogs d on d.id = wp.dog_id
    where d.owner_id = requesting_user_id
    limit 1
  )
  select
    p.id as profile_id,
    p.display_name,
    p.bio,
    d.name as dog_name,
    d.breed as dog_breed,
    d.photo_path as dog_photo_path,
    case
      when ST_Distance(rp.location, wp.location) < 1000 then 'nearby'
      when ST_Distance(rp.location, wp.location) < 3000 then 'moderate'
      else 'far'
    end as distance_bucket
  from requester_pin rp
  cross join walking_pins wp
  join dogs d on d.id = wp.dog_id
  join profiles p on p.id = d.owner_id
  where d.owner_id <> requesting_user_id
    and ST_DWithin(rp.location, wp.location, rp.radius_m + wp.radius_m)
    and ST_Area(
          ST_Intersection(
            ST_Buffer(rp.location::geography, rp.radius_m)::geometry,
            ST_Buffer(wp.location::geography, wp.radius_m)::geometry
          )
        )
        /
        NULLIF(least(
          ST_Area(ST_Buffer(rp.location::geography, rp.radius_m)::geometry),
          ST_Area(ST_Buffer(wp.location::geography, wp.radius_m)::geometry)
        ), 0)
        >= 0.10
  order by ST_Distance(rp.location, wp.location) asc
  limit 50;
$$;

-- Allow authenticated users to call the function via RPC.
grant execute on function find_matches(uuid) to authenticated;
