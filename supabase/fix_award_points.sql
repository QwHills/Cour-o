-- Fix ambiguous column reference in award_points()
-- Copy-paste dans Supabase SQL Editor → Run

create or replace function public.award_points(
  p_user_id uuid,
  p_role text,
  p_type text,
  p_label text,
  p_points int,
  p_source_id uuid default null,
  p_status text default 'validated'
) returns uuid language plpgsql security definer as $$
declare
  v_existing_id uuid;
  v_new_id uuid;
begin
  -- Check idempotency: has this exact event already been awarded?
  select t.id into v_existing_id
  from public.points_transactions t
  where t.user_id = p_user_id
    and t.type = p_type
    and (t.source_id is not distinct from p_source_id);

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  -- Insert the transaction
  insert into public.points_transactions
    (user_id, role, type, source_id, label, points, status, validated_at)
  values
    (p_user_id, p_role, p_type, p_source_id, p_label, p_points, p_status,
     case when p_status = 'validated' then now() else null end)
  returning id into v_new_id;

  -- Upsert the balance — fully qualify all column refs to avoid ambiguity
  insert into public.user_points as up (user_id, role, total_points, updated_at)
  values (
    p_user_id,
    p_role,
    case when p_status = 'validated' then p_points else 0 end,
    now()
  )
  on conflict (user_id) do update
    set total_points = up.total_points
      + case when p_status = 'validated' then excluded.total_points else 0 end,
        updated_at = now();

  return v_new_id;
end;
$$;

grant execute on function public.award_points to authenticated;
