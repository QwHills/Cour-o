// Organizations service — Supabase-backed CRUD for studios/schools and their
// members (admin, teacher, staff). Mirrors the pattern of teachers.service.ts.

import { supabase } from './supabase/client';
import {
  Organization,
  OrganizationKind,
  OrganizationMember,
  OrganizationMemberRole,
} from '../types/domain';

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }

const orgCache = new Map<string, Organization>();
const memberCache = new Map<string, OrganizationMember>();

function rowToOrg(r: any): Organization {
  return {
    id: r.id,
    name: r.name,
    kind: r.kind as OrganizationKind,
    description: r.description ?? '',
    address: r.address ?? undefined,
    latitude: r.latitude ?? undefined,
    longitude: r.longitude ?? undefined,
    logoUrl: r.logo_url ?? undefined,
    email: r.email ?? undefined,
    phone: r.phone ?? undefined,
    website: r.website ?? undefined,
    legalName: r.legal_name ?? undefined,
    siret: r.siret ?? undefined,
    vatNumber: r.vat_number ?? undefined,
    stripeAccountId: r.stripe_account_id ?? undefined,
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}

function rowToMember(r: any): OrganizationMember {
  return {
    id: r.id,
    organizationId: r.organization_id,
    userId: r.user_id,
    teacherId: r.teacher_id ?? undefined,
    role: r.role as OrganizationMemberRole,
    invitedAt: r.invited_at,
    joinedAt: r.joined_at ?? undefined,
  };
}

export const organizationsService = {
  // Hydrate cache with all orgs the user can see (RLS-filtered).
  async load(): Promise<void> {
    const [{ data: orgs, error: e1 }, { data: members, error: e2 }] = await Promise.all([
      supabase.from('organizations').select('*'),
      supabase.from('organization_members').select('*'),
    ]);
    if (e1) { console.warn('load organizations:', e1.message); return; }
    if (e2) { console.warn('load org members:', e2.message); return; }
    orgCache.clear();
    memberCache.clear();
    (orgs ?? []).forEach((r: any) => orgCache.set(r.id, rowToOrg(r)));
    (members ?? []).forEach((r: any) => memberCache.set(r.id, rowToMember(r)));
    notify();
  },

  listAll(): Organization[] {
    return Array.from(orgCache.values());
  },

  getById(id: string): Organization | undefined {
    return orgCache.get(id);
  },

  // Organizations the given user is a member of (any role).
  listMembershipsFor(userId: string): Array<{ org: Organization; role: OrganizationMemberRole }> {
    return Array.from(memberCache.values())
      .filter((m) => m.userId === userId)
      .map((m) => {
        const org = orgCache.get(m.organizationId);
        return org ? { org, role: m.role } : null;
      })
      .filter((x): x is { org: Organization; role: OrganizationMemberRole } => !!x);
  },

  listMembers(organizationId: string): OrganizationMember[] {
    return Array.from(memberCache.values()).filter((m) => m.organizationId === organizationId);
  },

  async create(input: {
    name: string;
    kind: OrganizationKind;
    description?: string;
    address?: string;
    email?: string;
    phone?: string;
    website?: string;
    createdBy: string;
  }): Promise<Organization> {
    const { data, error } = await supabase
      .from('organizations')
      .insert({
        name: input.name,
        kind: input.kind,
        description: input.description ?? '',
        address: input.address ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        website: input.website ?? null,
        created_by: input.createdBy,
      })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Création structure échouée');

    const org = rowToOrg(data);
    orgCache.set(org.id, org);

    // Auto-add the creator as admin.
    await this.addMember(org.id, input.createdBy, 'admin');

    notify();
    return org;
  },

  async update(id: string, patch: Partial<Omit<Organization, 'id' | 'createdBy' | 'createdAt'>>): Promise<void> {
    const payload: any = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.kind !== undefined) payload.kind = patch.kind;
    if (patch.description !== undefined) payload.description = patch.description;
    if (patch.address !== undefined) payload.address = patch.address;
    if (patch.logoUrl !== undefined) payload.logo_url = patch.logoUrl;
    if (patch.email !== undefined) payload.email = patch.email;
    if (patch.phone !== undefined) payload.phone = patch.phone;
    if (patch.website !== undefined) payload.website = patch.website;
    if (patch.legalName !== undefined) payload.legal_name = patch.legalName;
    if (patch.siret !== undefined) payload.siret = patch.siret;

    const { data, error } = await supabase
      .from('organizations')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Mise à jour échouée');
    orgCache.set(data.id, rowToOrg(data));
    notify();
  },

  async addMember(
    organizationId: string,
    userId: string,
    role: OrganizationMemberRole,
    teacherId?: string,
  ): Promise<OrganizationMember> {
    const { data, error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        teacher_id: teacherId ?? null,
        role,
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? "Ajout du membre échoué");
    const m = rowToMember(data);
    memberCache.set(m.id, m);
    notify();
    return m;
  },

  // Invite an existing Koureo user by email. Wraps the Postgres RPC which
  // handles admin authorization, user lookup, teacher_id resolution and
  // idempotent upsert of the member row.
  async inviteByEmail(
    organizationId: string,
    email: string,
    role: OrganizationMemberRole,
  ): Promise<OrganizationMember> {
    const { data, error } = await supabase.rpc('invite_org_member_by_email', {
      p_org_id: organizationId,
      p_email: email,
      p_role: role,
    });
    if (error || !data) throw new Error(error?.message ?? "Invitation échouée");
    const row = Array.isArray(data) ? data[0] : data;
    const m = rowToMember(row);
    memberCache.set(m.id, m);
    notify();
    return m;
  },

  // For the invited user: accept a pending invitation (sets joined_at).
  async acceptInvitation(memberId: string): Promise<OrganizationMember> {
    const { data, error } = await supabase.rpc('accept_org_invitation', {
      p_member_id: memberId,
    });
    if (error || !data) throw new Error(error?.message ?? "Acceptation échouée");
    const row = Array.isArray(data) ? data[0] : data;
    const m = rowToMember(row);
    memberCache.set(m.id, m);
    notify();
    return m;
  },

  async removeMember(memberId: string): Promise<void> {
    const { error } = await supabase.from('organization_members').delete().eq('id', memberId);
    if (error) throw new Error(error.message);
    memberCache.delete(memberId);
    notify();
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
