<template>
  <view class="page">
    <text class="page-title">系统设置</text>

    <view class="section">
      <text class="section-title">经验规则</text>
      <view v-for="field in ruleFields" :key="field.key" class="row">
        <text class="label">{{ field.label }}</text>
        <input
          v-model.number="rules[field.key]"
          class="field"
          type="digit"
        />
      </view>
      <button class="btn primary" @tap="saveRules">保存规则</button>
    </view>

    <view class="section">
      <text class="section-title">等级</text>
      <view v-for="level in levels" :key="level.level" class="row">
        <text>Lv.{{ level.level }} {{ level.name }}</text>
        <text class="muted">{{ level.xpThreshold }} XP</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">称号</text>
      <view v-for="title in titles" :key="title.code" class="row">
        <text>{{ title.name }} · {{ title.description }}</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">手工调分</text>
      <input v-model="adjust.userId" class="field" placeholder="成员 ID" />
      <input v-model.number="adjust.amount" class="field" type="number" placeholder="经验（可负）" />
      <input v-model="adjust.reason" class="field" placeholder="原因" />
      <button class="btn primary" @tap="adjustXp">执行调分</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import type { LevelInfo, TitleInfo, XpRules } from '@task-guild/shared';
import { request } from '../../api/client';

const ruleFields = [
  { key: 'urgentMultiplier', label: '紧急倍率' },
  { key: 'onTimeBonusRate', label: '按时加成' },
  { key: 'earlyBonusRate', label: '提前加成' },
  { key: 'earlyThresholdHours', label: '提前小时数' },
  { key: 'latePenaltyRate', label: '逾期扣减' },
  { key: 'rejectPenaltyRate', label: '驳回扣减' },
  { key: 'minXp', label: '下限' },
  { key: 'titlePointsReward', label: '称号积分' },
] as const;

const rules = reactive<Record<string, number>>({});
const levels = ref<LevelInfo[]>([]);
const titles = ref<TitleInfo[]>([]);
const adjust = reactive({ userId: '', amount: 0, reason: '' });

const rulesTyped = computed(() => rules as unknown as XpRules);

async function load() {
  const result = await request<XpRules>({ url: '/configs/xp-rules' });
  Object.assign(rules, result);
  levels.value = await request<LevelInfo[]>({ url: '/gamification/levels' });
  titles.value = await request<TitleInfo[]>({ url: '/gamification/titles' });
}

async function saveRules() {
  await request({ url: '/configs/xp-rules', method: 'PUT', data: rulesTyped.value });
  uni.showToast({ title: '已保存', icon: 'success' });
}

async function adjustXp() {
  if (!adjust.userId || !adjust.amount || !adjust.reason) {
    uni.showToast({ title: '请完整填写', icon: 'none' });
    return;
  }
  await request({
    url: '/xp/manual-adjust',
    method: 'POST',
    data: adjust,
  });
  adjust.userId = '';
  adjust.amount = 0;
  adjust.reason = '';
  uni.showToast({ title: '已调整', icon: 'success' });
}

onShow(() => {
  void load();
});
</script>

<style scoped>
.page {
  padding: var(--space-4);
  padding-bottom: var(--space-7);
}
.page-title {
  font-family: var(--font-display);
  font-size: var(--font-lg);
  font-weight: 700;
}
.section {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-top: var(--space-4);
}
.section-title {
  font-family: var(--font-display);
  font-weight: 700;
  display: block;
  margin-bottom: var(--space-3);
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
  border-bottom: 1px dashed var(--color-border);
}
.label {
  color: var(--color-ink-muted);
}
.field {
  width: 120px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  padding: var(--space-2);
}
.muted {
  color: var(--color-ink-muted);
  font-size: var(--font-xs);
}
.btn {
  margin-top: var(--space-3);
  border-radius: var(--radius-md);
  font-weight: 600;
}
.btn.primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
}
</style>

<style scoped>
.page {
  background:
    radial-gradient(circle at 50% 0%, rgba(192, 140, 46, 0.08), transparent 42%),
    var(--color-bg);
}
.page-title {
  letter-spacing: 3px;
  color: var(--color-leather);
}
.section {
  position: relative;
  background: var(--texture-paper);
  border: 1px solid var(--color-border);
  border-radius: 2px 14px 2px 14px;
  box-shadow: var(--shadow-sm);
  padding: var(--space-5);
}
.section::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--color-brass), transparent 70%);
}
.section-title {
  letter-spacing: 2px;
  color: var(--color-leather);
}
.field {
  background: rgba(255, 255, 255, 0.055);
  border-color: rgba(148, 163, 190, 0.20);
  backdrop-filter: blur(14px) saturate(130%);
}
.btn.primary {
  background: var(--texture-brass);
  border: 1px solid #7e5818;
}
</style>
