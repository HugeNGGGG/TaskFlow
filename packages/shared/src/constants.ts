import type { Difficulty } from './enums';

export const DIFFICULTY_XP: Record<Difficulty, number> = {
  D: 20,
  C: 40,
  B: 80,
  A: 150,
  S: 250,
};

export interface LevelSeed {
  level: number;
  name: string;
  xpThreshold: number;
}

export const DEFAULT_LEVELS: LevelSeed[] = [
  { level: 1, name: '见习', xpThreshold: 0 },
  { level: 2, name: '初级', xpThreshold: 100 },
  { level: 3, name: '中级', xpThreshold: 300 },
  { level: 4, name: '高级', xpThreshold: 800 },
  { level: 5, name: '精英', xpThreshold: 2000 },
  { level: 6, name: '大师', xpThreshold: 5000 },
  { level: 7, name: '传说', xpThreshold: 12000 },
];

export interface XpRules {
  urgentMultiplier: number;
  onTimeBonusRate: number;
  earlyBonusRate: number;
  earlyThresholdHours: number;
  latePenaltyRate: number;
  rejectPenaltyRate: number;
  minXp: number;
  titlePointsReward: number;
}

export const DEFAULT_XP_RULES: XpRules = {
  urgentMultiplier: 1.5,
  onTimeBonusRate: 0.2,
  earlyBonusRate: 0.1,
  earlyThresholdHours: 24,
  latePenaltyRate: 0.1,
  rejectPenaltyRate: 0.05,
  minXp: 0,
  titlePointsReward: 10,
};

export interface TitleSeed {
  code: string;
  name: string;
  description: string;
  conditionType: 'first_complete' | 'streak' | 'firefighting' | 'perfect' | 'high_yield' | 'level_reach';
  conditionValue: number;
}

export const DEFAULT_TITLES: TitleSeed[] = [
  { code: 'first_order', name: '初出茅庐', description: '完成第一单委托', conditionType: 'first_complete', conditionValue: 1 },
  { code: 'streak_3', name: '三连击', description: '连续 3 周每周至少完成一单', conditionType: 'streak', conditionValue: 3 },
  { code: 'streak_5', name: '五连击', description: '连续 5 周每周至少完成一单', conditionType: 'streak', conditionValue: 5 },
  { code: 'firefighter', name: '救火队员', description: '接取紧急委托且距截止不足 24 小时并按时完成', conditionType: 'firefighting', conditionValue: 1 },
  { code: 'perfect_delivery', name: '完美交付', description: '连续 5 单按时且零驳回', conditionType: 'perfect', conditionValue: 5 },
  { code: 'high_yield', name: '高产之星', description: '自然月内完成 8 单', conditionType: 'high_yield', conditionValue: 8 },
  { code: 'senior_adventurer', name: '高级冒险者', description: '达到 L4 高级', conditionType: 'level_reach', conditionValue: 4 },
  { code: 'legend', name: '传说冒险者', description: '达到 L7 传说', conditionType: 'level_reach', conditionValue: 7 },
];

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 100;
