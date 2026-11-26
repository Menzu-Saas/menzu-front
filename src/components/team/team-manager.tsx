"use client";

import { MailPlus, Trash2, Users } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import {
  Badge,
  ConfirmationDialog,
  DataTable,
  EmptyState,
  IconButton,
  notify,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type DataTableColumn,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import type { MemberRole } from "@/lib/order-status";
import { assignableRoles, canManageRole, inviteUrl, ROLE_BADGE_TONE, ROLE_LABEL } from "@/lib/team";
import { changeMemberRoleAction, removeMemberAction, revokeInviteAction } from "@/server/actions/team";
import type { PendingInvite, TeamMember } from "@/server/queries/team";
import { CopyButton } from "./copy-button";
import { useRestaurantId } from "@/components/admin/current-restaurant";
import { safely } from "@/components/admin/safely";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

function RoleBadge({ role }: { role: MemberRole }) {
  return (
    <Badge tone={ROLE_BADGE_TONE[role]} size="sm" className="uppercase">
      {ROLE_LABEL[role]}
    </Badge>
  );
}

export interface TeamManagerProps {
  members: TeamMember[];
  invites: PendingInvite[];
  currentUserId: string;
  actorRole: MemberRole;
  appUrl: string;
  courierUrl?: string;
  nowIso: string;
}

/** Members table (role select / remove by the role matrix) and pending invites (copy link / revoke). */
export function TeamManager({ members, invites, currentUserId, actorRole, appUrl, courierUrl, nowIso }: TeamManagerProps) {
  const rid = useRestaurantId();
  const [optimisticMembers, setRole] = useOptimistic(members, (list, next: { userId: string; role: MemberRole }) =>
    list.map((m) => (m.user_id === next.userId ? { ...m, role: next.role } : m)),
  );
  const [, startTransition] = useTransition();
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const [revoking, setRevoking] = useState<PendingInvite | null>(null);
  const roles = assignableRoles(actorRole);
  const now = new Date(nowIso).getTime();

  function changeRole(member: TeamMember, role: MemberRole) {
    if (role === member.role) return;
    startTransition(safely(async () => {
      setRole({ userId: member.user_id, role });
      const result = await changeMemberRoleAction(rid, member.user_id, role);
      if (result.ok) notify.success(`${member.full_name ?? member.email} agora é ${ROLE_LABEL[role].toLowerCase()}.`);
      else notify.error(result.error);
    }));
  }

  const columns: DataTableColumn<TeamMember>[] = [
    {
      key: "name",
      header: "Nome",
      sortable: true,
      sortValue: (m) => m.full_name ?? m.email,
      hideLabelOnMobile: true,
      cell: (m) => {
        const name = m.full_name || m.email || "Sem nome";
        return (
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-brand-soft-border bg-brand-soft text-caption font-extrabold text-brand"
            >
              {initials(name)}
            </span>
            <div className="min-w-0 text-left">
              <p className="truncate text-body-sm font-bold text-ink">
                {name}
                {m.user_id === currentUserId && <span className="font-semibold text-ink-muted"> · você</span>}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "email",
      header: "E-mail",
      sortable: true,
      className: "hidden md:table-cell",
      cell: (m) => <span className="text-ink-secondary">{m.email}</span>,
    },
    {
      key: "role",
      header: "Papel",
      sortable: true,
      cell: (m) => {
        const editable = m.user_id !== currentUserId && canManageRole(actorRole, m.role);
        if (!editable) return <RoleBadge role={m.role} />;
        return (
          <Select value={m.role} onValueChange={(v) => changeRole(m, v as MemberRole)}>
            <SelectTrigger aria-label={`Papel de ${m.full_name ?? m.email}`} className="h-9 w-40 rounded-md text-body-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },
    {
      key: "created_at",
      header: "Desde",
      sortable: true,
      className: "hidden lg:table-cell whitespace-nowrap",
      cell: (m) => <span className="text-ink-secondary">{dateFmt.format(new Date(m.created_at))}</span>,
    },
    {
      key: "actions",
      header: <span className="sr-only">Ações</span>,
      hideLabelOnMobile: true,
      className: "w-12 text-right",
      cell: (m) =>
        m.user_id !== currentUserId && canManageRole(actorRole, m.role) ? (
          <div className="flex justify-end">
            <IconButton
              label={`Remover ${m.full_name ?? m.email}`}
              icon={Trash2}
              size={34}
              variant="outline"
              className="text-danger"
              onClick={() => setRemoving(m)}
            />
          </div>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-5.5">
      <section aria-labelledby="members-title" className="flex flex-col gap-3.5 rounded-4xl border border-line bg-surface p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="members-title" className="text-item font-extrabold text-ink">
            Membros
          </h2>
          <p className="text-caption font-semibold text-ink-muted">
            {optimisticMembers.length} {optimisticMembers.length === 1 ? "pessoa" : "pessoas"}
          </p>
        </div>
        <DataTable
          columns={columns}
          rows={optimisticMembers}
          getRowId={(m) => m.user_id}
          caption="Membros da equipe"
          empty={<EmptyState icon={Users} title="Nenhum membro" />}
        />
      </section>

      <section aria-labelledby="invites-title" className="flex flex-col gap-3.5 rounded-4xl border border-line bg-surface p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="invites-title" className="text-item font-extrabold text-ink">
            Convites pendentes
          </h2>
          <p className="text-caption font-semibold text-ink-muted">{invites.length}</p>
        </div>
        {invites.length === 0 ? (
          <EmptyState
            icon={MailPlus}
            title="Nenhum convite pendente"
            description="Use “Convidar membro” para gerar um link de convite."
            className="py-6"
          />
        ) : (
          <ul className="flex flex-col">
            {invites.map((invite) => {
              const expired = new Date(invite.expires_at).getTime() <= now;
              const manageable = canManageRole(actorRole, invite.role);
              const inviteOrigin = invite.role === "DELIVERY" ? courierUrl : appUrl;
              return (
                <li
                  key={invite.id}
                  className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-t border-line py-3 first:border-t-0"
                >
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="truncate text-body-sm font-bold text-ink">{invite.email}</p>
                    <p className={cn("text-caption", expired ? "font-semibold text-danger" : "text-ink-muted")}>
                      {expired ? "Expirado em " : "Expira em "}
                      {dateFmt.format(new Date(invite.expires_at))}
                    </p>
                  </div>
                  <RoleBadge role={invite.role} />
                  {manageable && (
                    <div className="flex items-center gap-2">
                      {!expired && invite.token && inviteOrigin && <CopyButton value={inviteUrl(inviteOrigin, invite.token)} />}
                      <IconButton
                        label={`Revogar convite de ${invite.email}`}
                        icon={Trash2}
                        size={34}
                        variant="outline"
                        className="text-danger"
                        onClick={() => setRevoking(invite)}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmationDialog
        open={removing != null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remover membro?"
        description={`${removing?.full_name ?? removing?.email ?? ""} perde o acesso ao restaurante imediatamente.`}
        confirmLabel="Remover"
        tone="danger"
        onConfirm={async () => {
          if (!removing) return;
          const result = await removeMemberAction(rid, removing.user_id);
          if (!result.ok) {
            notify.error(result.error);
            throw new Error(result.error);
          }
          notify.success("Membro removido.");
        }}
      />
      <ConfirmationDialog
        open={revoking != null}
        onOpenChange={(open) => !open && setRevoking(null)}
        title="Revogar convite?"
        description={`O link enviado para ${revoking?.email ?? ""} deixa de funcionar.`}
        confirmLabel="Revogar"
        tone="danger"
        onConfirm={async () => {
          if (!revoking) return;
          const result = await revokeInviteAction(rid, revoking.id);
          if (!result.ok) {
            notify.error(result.error);
            throw new Error(result.error);
          }
          notify.success("Convite revogado.");
        }}
      />
    </div>
  );
}
