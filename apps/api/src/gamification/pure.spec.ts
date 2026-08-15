import {
  computeLevelForXp,
  computeXpBreakdown,
  isoWeekKey,
  previousWeekKey,
} from './pure';
import { DEFAULT_LEVELS, DEFAULT_XP_RULES } from '@task-guild/shared';

describe('computeXpBreakdown', () => {
  it('计算 S 级紧急且提前 24h 的加成（450 XP）', () => {
    const result = computeXpBreakdown({
      base: 250,
      isUrgent: true,
      onTime: true,
      early: true,
      late: false,
      rejectedCount: 0,
    });
    expect(result.net).toBe(450);
    expect(result.positive).toBe(450);
    expect(result.rows).toEqual(
      expect.arrayContaining([
        { reason: 'urgent_bonus', amount: 125 },
        { reason: 'on_time_bonus', amount: 50 },
        { reason: 'early_bonus', amount: 25 },
      ]),
    );
  });

  it('计算 S 级紧急且逾期（350 XP，正向 375）', () => {
    const result = computeXpBreakdown({
      base: 250,
      isUrgent: true,
      onTime: false,
      early: false,
      late: true,
      rejectedCount: 0,
    });
    expect(result.net).toBe(350);
    expect(result.positive).toBe(375);
  });

  it('扣除每次驳回 5% 的惩罚', () => {
    const result = computeXpBreakdown({
      base: 100,
      isUrgent: false,
      onTime: true,
      early: false,
      late: false,
      rejectedCount: 2,
    });
    expect(result.net).toBe(110);
  });

  it('扣减后总额不低于 minXp', () => {
    const result = computeXpBreakdown({
      base: 5,
      isUrgent: false,
      onTime: false,
      early: false,
      late: true,
      rejectedCount: 20,
      rules: { ...DEFAULT_XP_RULES, minXp: 0 },
    });
    expect(result.net).toBe(0);
  });
});

describe('computeLevelForXp', () => {
  const thresholds = DEFAULT_LEVELS.map((item) => ({
    level: item.level,
    xpThreshold: item.xpThreshold,
  }));

  it.each([
    [0, 1],
    [99, 1],
    [100, 2],
    [799, 3],
    [800, 4],
    [12000, 7],
  ])('经验 %i 对应等级 %i', (xp, level) => {
    expect(computeLevelForXp(xp, thresholds)).toBe(level);
  });
});

describe('isoWeekKey', () => {
  it('2026-01-01 是 ISO 第 1 周', () => {
    expect(isoWeekKey(new Date('2026-01-01T00:00:00Z'))).toBe('2026-W01');
  });

  it('previousWeekKey 处理跨年与常规回退', () => {
    expect(previousWeekKey('2026-W05')).toBe('2026-W04');
    expect(previousWeekKey('2026-W01')).toBe('2025-W52');
  });
});
