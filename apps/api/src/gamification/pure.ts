import { DEFAULT_XP_RULES, type XpRules } from '@task-guild/shared';

export interface XpBreakdownRow {
  reason: string;
  amount: number;
}

export interface XpBreakdown {
  rows: XpBreakdownRow[];
  positive: number;
  net: number;
}

export function computeXpBreakdown(input: {
  base: number;
  isUrgent: boolean;
  onTime: boolean;
  early: boolean;
  late: boolean;
  rejectedCount: number;
  rules?: XpRules;
}): XpBreakdown {
  const rules = { ...DEFAULT_XP_RULES, ...(input.rules ?? {}) };
  const rows: XpBreakdownRow[] = [];
  let positive = 0;
  let net = 0;
  rows.push({ reason: 'task_complete', amount: input.base });
  positive += input.base;
  net += input.base;
  if (input.isUrgent) {
    const bonus = Math.round(input.base * (rules.urgentMultiplier - 1));
    rows.push({ reason: 'urgent_bonus', amount: bonus });
    positive += bonus;
    net += bonus;
  }
  if (input.onTime) {
    const bonus = Math.round(input.base * rules.onTimeBonusRate);
    rows.push({ reason: 'on_time_bonus', amount: bonus });
    positive += bonus;
    net += bonus;
  }
  if (input.early) {
    const bonus = Math.round(input.base * rules.earlyBonusRate);
    rows.push({ reason: 'early_bonus', amount: bonus });
    positive += bonus;
    net += bonus;
  }
  if (input.late) {
    const penalty = -Math.round(input.base * rules.latePenaltyRate);
    rows.push({ reason: 'late_penalty', amount: penalty });
    net += penalty;
  }
  if (input.rejectedCount > 0) {
    const penalty = -Math.round(
      input.base * rules.rejectPenaltyRate * input.rejectedCount,
    );
    rows.push({ reason: 'reject_penalty', amount: penalty });
    net += penalty;
  }
  return { rows, positive, net: Math.max(net, rules.minXp) };
}

export function computeLevelForXp(
  totalXp: number,
  thresholds: { level: number; xpThreshold: number }[],
): number {
  let result = 1;
  for (const item of thresholds) {
    if (totalXp >= item.xpThreshold) {
      result = item.level;
    }
  }
  return result;
}

export function isoWeekKey(date: Date): string {
  const target = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNumber = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  const week =
    1 +
    Math.round(
      (target.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000),
    );
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function previousWeekKey(current: string): string {
  const match = /^(\d{4})-W(\d{2})$/.exec(current);
  if (!match) {
    return current;
  }
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week > 1) {
    return `${year}-W${String(week - 1).padStart(2, '0')}`;
  }
  return `${year - 1}-W52`;
}
