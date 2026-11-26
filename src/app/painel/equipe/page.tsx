import type { Metadata } from "next";
import { MANAGEMENT_ROLES } from "@/lib/roles";
import { InviteModal } from "@/components/team/invite-modal";
import { TeamManager } from "@/components/team/team-manager";
import { PageHeader } from "@/components/ui";
import { assignableRoles } from "@/lib/team";
import { appUrl } from "@/server/app-url";
import { requireMember } from "@/server/auth";
import { getPendingInvites, getTeamMembers } from "@/server/queries/team";

export const metadata: Metadata = { title: "Equipe" };

/** Equipe: members with role/remove (role matrix), invite links and pending invites. OWNER/MANAGER. */
export default async function EquipePage() {
  const { user, restaurantId, role } = await requireMember(MANAGEMENT_ROLES);
  const [members, invites, url] = await Promise.all([
    getTeamMembers(restaurantId),
    getPendingInvites(restaurantId, role),
    appUrl(),
  ]);

  return (
    <div className="flex flex-col gap-5.5">
      <PageHeader
        title="Equipe"
        description="Quem acessa o painel, a cozinha e as entregas do seu restaurante."
        actions={<InviteModal roles={assignableRoles(role)} />}
      />
      <TeamManager
        members={members}
        invites={invites}
        currentUserId={user.id}
        actorRole={role}
        appUrl={url}
        nowIso={new Date().toISOString()}
      />
    </div>
  );
}
