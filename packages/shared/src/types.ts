import type {
  AcceptMode,
  AssignmentStatus,
  AttachmentArea,
  Difficulty,
  NotificationType,
  TaskStatus,
  TitleCondition,
  XpReason,
} from './enums';

export interface JwtPayload {
  sub: string;
  username: string;
  roleMask: number;
  type: 'access' | 'refresh';
}

export interface UserPublic {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string | null;
  departmentId: string | null;
  roleMask: number;
}

export interface TaskCard {
  id: string;
  taskNo: string;
  title: string;
  categoryName: string | null;
  difficulty: Difficulty;
  xpReward: number;
  deadlineAt: string;
  acceptMode: AcceptMode;
  isUrgent: boolean;
  status: TaskStatus;
  acceptCount: number;
  maxMembers: number;
  overdue: boolean;
  publishedAt: string | null;
}

export interface TimelineEventView {
  id: string;
  type: string;
  content: string | null;
  progressPercent: number | null;
  authorName: string | null;
  createdAt: string;
}

export interface AttachmentView {
  id: string;
  area: AttachmentArea;
  logicalName: string;
  version: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploaderName: string | null;
  createdAt: string;
}

export interface AssignmentView {
  userId: string;
  userNickname: string;
  userAvatarUrl: string | null;
  departmentName: string | null;
  role: 'member' | 'captain';
  status: AssignmentStatus;
  progressPercent: number;
  joinedAt: string;
  submittedAt: string | null;
  completedAt: string | null;
  xpAwarded: number | null;
}

export interface NotificationView {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardOverview {
  total: number;
  open: number;
  inProgress: number;
  pendingReview: number;
  overdue: number;
  completedThisWeek: number;
  completedThisMonth: number;
}

export interface DistributionPoint {
  key: string;
  count: number;
}

export interface TrendPoint {
  date: string;
  completed: number;
  created: number;
}

export interface MemberStatsRow {
  user: UserPublic;
  activeLoad: number;
  completedCount: number;
  onTimeRate: number;
  overdueCount: number;
  totalXp: number;
  level: number;
}

export interface LeaderboardEntry {
  rank: number;
  user: UserPublic;
  completedCount: number;
  onTimeRate: number;
  totalXp: number;
  points: number;
  level: number;
}

export interface LevelInfo {
  level: number;
  name: string;
  xpThreshold: number;
  icon: string | null;
  frame: string | null;
}

export interface TitleInfo {
  id: string;
  code: string;
  name: string;
  description: string;
  conditionType: TitleCondition;
  conditionValue: number;
  pointsReward: number;
}

export interface XpLedgerRow {
  id: string;
  amount: number;
  reason: XpReason;
  refTaskId: string | null;
  createdAt: string;
}

export interface MyStats {
  totalXp: number;
  level: number;
  levelName: string;
  points: number;
  acceptedCount: number;
  completedCount: number;
  onTimeCount: number;
  overdueCount: number;
  rejectedCount: number;
  streakWeeks: number;
  completionRate: number;
  onTimeRate: number;
  averageCompletionSeconds: number | null;
}
