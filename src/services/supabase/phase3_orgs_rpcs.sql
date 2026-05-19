-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║  KOUREO — Phase 3 complément : RPC d'invitation + policy lecture users  ║
-- ║  À exécuter dans le SQL Editor APRÈS organizations_migration.sql.        ║
-- ║  Idempotent.                                                             ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

-- Les admins de l'org doivent pouvoir voir le nom/email des membres qu'ils
-- invitent et gèrent. Cette policy ouvre la lecture de public.users pour les
-- pairs d'une même organisation (soi-même + les autres membres de mes orgs).
drop policy if exists "users_readable_by_org_peers" on public.users;
create policy "users_readable_by_org_peers" on public.users for select using (
  id = auth.uid()
  or id in (
    select om.user_id from public.organization_members om
    where om.organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid()
    )
  )
);

-- RPC : un admin invite un user existant par email. L'utilisateur doit déjà
-- avoir un compte Koureo. Si le rôle invité est 'teacher', on tente de
-- résoudre son teacher_profiles.id pour lier proprement.
create or replace function public.invite_org_member_by_email(
  p_org_id uuid,
  p_email text,
  p_role text
) returns public.organization_members as $$
declare
  target_user_id uuid;
  target_teacher_id uuid;
  existing_id uuid;
  result public.organization_members;
begin
  -- Garde d'entrée : seuls les admins de l'org peuvent inviter.
  if not exists (
    select 1 from public.organization_members
    where organization_id = p_org_id
      and user_id = auth.uid()
      and role = 'admin'
      and joined_at is not null
  ) then
    raise exception 'Seuls les admins de la structure peuvent inviter des membres.';
  end if;

  if p_role not in ('admin', 'teacher', 'staff') then
    raise exception 'Rôle invalide (doit être admin, teacher ou staff).';
  end if;

  -- Résolution de la cible.
  select id into target_user_id from public.users where email = lower(trim(p_email));
  if target_user_id is null then
    raise exception 'Aucun utilisateur Koureo avec cet email. Demande-lui de créer un compte d''abord.';
  end if;

  -- Évite le doublon (soft upsert : si déjà présent, on retourne l'existant).
  select id into existing_id from public.organization_members
  where organization_id = p_org_id and user_id = target_user_id;
  if existing_id is not null then
    select * into result from public.organization_members where id = existing_id;
    return result;
  end if;

  -- Lien teacher_id optionnel si le rôle est 'teacher' et que le user a un
  -- teacher_profile existant (cas d'un prof indépendant qui rejoint aussi
  -- une structure).
  if p_role = 'teacher' then
    select id into target_teacher_id
    from public.teacher_profiles
    where user_id = target_user_id
    limit 1;
  end if;

  insert into public.organization_members (
    organization_id, user_id, teacher_id, role, invited_at
  ) values (
    p_org_id, target_user_id, target_teacher_id, p_role, now()
  ) returning * into result;

  return result;
end;
$$ language plpgsql security definer;

-- RPC : un invité accepte son invitation. Techniquement équivaut à une
-- UPDATE sur sa propre ligne mais c'est plus explicite et on peut y ajouter
-- des side effects plus tard (welcome email, notification au prof…).
create or replace function public.accept_org_invitation(p_member_id uuid)
returns public.organization_members as $$
declare
  result public.organization_members;
begin
  update public.organization_members
  set joined_at = now()
  where id = p_member_id
    and user_id = auth.uid()
    and joined_at is null
  returning * into result;

  if result is null then
    raise exception 'Invitation introuvable ou déjà acceptée.';
  end if;

  return result;
end;
$$ language plpgsql security definer;
