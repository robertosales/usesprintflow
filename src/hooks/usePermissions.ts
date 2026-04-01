// Permissions matrix for RBAC
// Roles: admin, scrum_master, product_owner, developer, analyst, architect, member

export type AppRole = 'admin' | 'scrum_master' | 'product_owner' | 'developer' | 'analyst' | 'architect' | 'member' | 'qa_analyst';

export type Permission =
  // Planning
  | 'view_backlog'
  | 'create_backlog'
  | 'edit_backlog'
  | 'prioritize_backlog'
  | 'create_sprint'
  | 'edit_sprint'
  | 'delete_sprint'
  | 'create_epic'
  | 'edit_epic'
  | 'delete_epic'
  // Execution
  | 'view_kanban'
  | 'move_kanban'
  | 'manage_kanban'
  | 'update_tasks'
  | 'log_hours'
  | 'report_impediments'
  | 'manage_impediments'
  | 'view_dashboard'
  | 'comment_tasks'
  // Configuration
  | 'manage_teams'
  | 'manage_workflow'
  | 'manage_custom_fields'
  | 'manage_automations'
  | 'manage_developers'
  // User management
  | 'manage_users'
  | 'manage_roles';

const PERMISSIONS_MATRIX: Record<AppRole, Permission[]> = {
  admin: [
    'view_backlog', 'create_backlog', 'edit_backlog', 'prioritize_backlog',
    'create_sprint', 'edit_sprint', 'delete_sprint',
    'create_epic', 'edit_epic', 'delete_epic',
    'view_kanban', 'move_kanban', 'manage_kanban',
    'update_tasks', 'log_hours', 'report_impediments', 'manage_impediments',
    'view_dashboard', 'comment_tasks',
    'manage_teams', 'manage_workflow', 'manage_custom_fields', 'manage_automations', 'manage_developers',
    'manage_users', 'manage_roles',
  ],
  scrum_master: [
    'view_backlog',
    'create_sprint', 'edit_sprint', 'delete_sprint',
    'view_kanban', 'move_kanban', 'manage_kanban',
    'manage_impediments', 'report_impediments',
    'view_dashboard', 'comment_tasks', 'update_tasks', 'log_hours',
    'manage_teams', 'manage_developers',
  ],
  product_owner: [
    'view_backlog', 'create_backlog', 'edit_backlog', 'prioritize_backlog',
    'create_epic', 'edit_epic', 'delete_epic',
    'view_kanban',
    'view_dashboard', 'comment_tasks',
  ],
  developer: [
    'view_backlog',
    'view_kanban', 'move_kanban',
    'update_tasks', 'log_hours',
    'report_impediments',
    'comment_tasks',
  ],
  analyst: [
    'view_backlog', 'create_backlog', 'edit_backlog',
    'view_kanban',
    'comment_tasks',
  ],
  architect: [
    'view_backlog',
    'update_tasks',
    'comment_tasks',
    'view_kanban',
  ],
  qa_analyst: [
    'view_backlog', 'create_backlog', 'edit_backlog',
    'view_kanban',
    'comment_tasks',
  ],
  member: [
    'view_backlog',
    'view_kanban',
    'view_dashboard',
  ],
};

export function getPermissionsForRoles(roles: AppRole[]): Set<Permission> {
  const perms = new Set<Permission>();
  for (const role of roles) {
    const rolePerms = PERMISSIONS_MATRIX[role];
    if (rolePerms) rolePerms.forEach((p) => perms.add(p));
  }
  return perms;
}

export function getRoleLabel(role: AppRole): string {
  const labels: Record<AppRole, string> = {
    admin: 'Administrador',
    scrum_master: 'Scrum Master',
    product_owner: 'Product Owner',
    developer: 'Desenvolvedor',
    analyst: 'Analista de Requisitos',
    architect: 'Arquiteto',
    qa_analyst: 'Analista de QA',
    member: 'Membro',
  };
  return labels[role] || role;
}

export const ALL_ROLES: AppRole[] = ['admin', 'scrum_master', 'product_owner', 'developer', 'analyst', 'architect', 'qa_analyst', 'member'];
