import { query } from './db';

export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';
export type ProjectRole = 'admin' | 'member' | 'viewer';
export type BoardRole = 'admin' | 'member' | 'viewer';

export async function getOrgRole(memberId: string, workspaceId: string): Promise<OrgRole | null> {
  const result = await query(
    `SELECT role FROM org_roles WHERE member_id = $1 AND workspace_id = $2`,
    [memberId, workspaceId]
  );
  return (result.rows[0]?.role as OrgRole) || null;
}

export async function getProjectRole(memberId: string, projectId: string): Promise<ProjectRole | null> {
  const result = await query(
    `SELECT role FROM project_roles WHERE member_id = $1 AND project_id = $2`,
    [memberId, projectId]
  );
  return (result.rows[0]?.role as ProjectRole) || null;
}

export async function getBoardRole(memberId: string, boardId: string): Promise<BoardRole | null> {
  const result = await query(
    `SELECT role FROM board_roles WHERE member_id = $1 AND board_id = $2`,
    [memberId, boardId]
  );
  return (result.rows[0]?.role as BoardRole) || null;
}

export async function canAccess(
  memberId: string,
  level: 'org' | 'project' | 'board',
  id: string,
  minRole: string,
  options?: { workspaceId?: string; projectId?: string }
): Promise<boolean> {
  const roleHierarchy: Record<string, number> = { owner: 4, admin: 3, member: 2, viewer: 1 };
  let role: string | null = null;

  if (level === 'org') {
    role = await getOrgRole(memberId, id);
  }

  if (level === 'project') {
    role = await getProjectRole(memberId, id);
    // Inherit from org if no project role
    if (!role && options?.workspaceId) {
      role = await getOrgRole(memberId, options.workspaceId);
    }
  }

  if (level === 'board') {
    role = await getBoardRole(memberId, id);
    // Inherit from project if no board role
    if (!role && options?.projectId) {
      role = await getProjectRole(memberId, options.projectId);
    }
    // Inherit from org if still no role
    if (!role && options?.workspaceId) {
      role = await getOrgRole(memberId, options.workspaceId);
    }
  }

  if (!role) return false;
  return (roleHierarchy[role] || 0) >= (roleHierarchy[minRole] || 0);
}
