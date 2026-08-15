export const DIFFICULTIES = ['D', 'C', 'B', 'A', 'S'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const ACCEPT_MODES = ['bounty', 'assigned'] as const;
export type AcceptMode = (typeof ACCEPT_MODES)[number];

export const TASK_STATUSES = [
  'draft',
  'open',
  'in_progress',
  'pending_review',
  'completed',
  'cancelled',
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const ASSIGNMENT_STATUSES = [
  'accepted',
  'in_progress',
  'submitted',
  'completed',
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const ATTACHMENT_AREAS = ['source', 'process', 'result'] as const;
export type AttachmentArea = (typeof ATTACHMENT_AREAS)[number];

export const TASK_EVENT_TYPES = [
  'created',
  'accepted',
  'progress',
  'submitted',
  'approved',
  'rejected',
  'extension_requested',
  'extension_decided',
  'cancelled',
  'reminder',
] as const;
export type TaskEventType = (typeof TASK_EVENT_TYPES)[number];

export const XP_REASONS = [
  'task_complete',
  'urgent_bonus',
  'on_time_bonus',
  'early_bonus',
  'late_penalty',
  'reject_penalty',
  'manual',
] as const;
export type XpReason = (typeof XP_REASONS)[number];

export const NOTIFICATION_TYPES = [
  'assign',
  'review_result',
  'deadline_warning',
  'xp_award',
  'title_award',
  'system',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const TITLE_CONDITIONS = [
  'first_complete',
  'streak',
  'firefighting',
  'perfect',
  'high_yield',
  'level_reach',
] as const;
export type TitleCondition = (typeof TITLE_CONDITIONS)[number];

export const ROLES = {
  MEMBER: 1,
  MANAGER: 2,
  ADMIN: 4,
} as const;
export type RoleMask = number;

export const ROLE_NAMES: Record<number, string> = {
  1: '冒险者',
  2: '发布官',
  4: '管理员',
};

export function hasRole(mask: RoleMask, role: keyof typeof ROLES): boolean {
  return (mask & ROLES[role]) === ROLES[role];
}

export function isManagerOrAbove(mask: RoleMask): boolean {
  return hasRole(mask, 'MANAGER') || hasRole(mask, 'ADMIN');
}
