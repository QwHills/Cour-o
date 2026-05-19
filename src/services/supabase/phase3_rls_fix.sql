-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║  KOUREO — Fix RLS récursion infinie (organizations + users)              ║
-- ║                                                                           ║
-- ║  À exécuter UNE FOIS dans le SQL Editor. Idempotent.                    ║
-- ║                                                                           ║
-- ║  Pourquoi : les policies `org_members_read`, `org_members_admin_write`   ║
-- ║  et `users_readable_by_org_peers` contiennent un subquery sur            ║
-- ║  organization_members qui déclenche récursivement leur propre policy.    ║
-- ║  Résultat : erreur 42P17 "infinite recursion detected in policy", toute  ║
-- ║  lecture de public.users échoue, et les profs atterrissent en UserTabs.  ║
-- ║                                                                           ║
-- ║  Fix : encapsuler les lookups dans des fonctions SECURITY DEFINER qui    ║
-- ║  bypass RLS, puis réécrire les policies pour les utiliser.               ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

-- Helper : orgs dont l'utilisateur courant est membre (n'importe quel rôle).
create or replace function public.my_organization_ids()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select organization_id
  from public.organization_members
  where user_id = auth.uid();
$$;

-- Helper : orgs où l'utilisateur courant est admin actif.
create or replace function public.my_admin_organization_ids()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select organization_id
  from public.organization_members
  where user_id = auth.uid()
    and role = 'admin'
    and joined_at is not null;
$$;

-- ═════════════════════════════════════════════════════════════════════════
-- Réécriture des policies sans subquery récursif
-- ═════════════════════════════════════════════════════════════════════════

-- organizations : admin write via helper
drop policy if exists "organizations_admin_write" on public.organizations;
create policy "organizations_admin_write" on public.organizations for all using (
  id in (select public.my_admin_organization_ids())
  or created_by = auth.uid()
);

-- organization_members : self + peers read, admin manage (tous via helpers)
drop policy if exists "org_members_read" on public.organization_members;
create policy "org_members_read" on public.organization_members for select using (
  user_id = auth.uid()
  or organization_id in (select public.my_organization_ids())
);

drop policy if exists "org_members_admin_write" on public.organization_members;
create policy "org_members_admin_write" on public.organization_members for all using (
  organization_id in (select public.my_admin_organization_ids())
);

-- La policy "org_members_accept_own" (user accepte son invitation) reste
-- inchangée — pas de subquery, pas de récursion.

-- users : self + peers d'une même org (via helper)
drop policy if exists "users_readable_by_org_peers" on public.users;
create policy "users_readable_by_org_peers" on public.users for select using (
  id = auth.uid()
  or id in (
    select user_id
    from public.organization_members
    where organization_id in (select public.my_organization_ids())
  )
);

-- ═════════════════════════════════════════════════════════════════════════
-- Vérification
-- ═════════════════════════════════════════════════════════════════════════
-- Les 2 requêtes suivantes devraient fonctionner sans récursion :
--
--   select id, email, role from public.users where id = auth.uid();
--   select count(*) from public.organization_members;
--
-- Depuis le SQL Editor (rôle postgres), RLS ne s'applique pas, mais depuis
-- l'app (rôle authenticated), ça doit passer proprement.
