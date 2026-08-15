<template>
  <view class="page">
    <view class="tabs">
      <view
        v-for="period in periods"
        :key="period.value"
        class="chip"
        :class="{ active: activePeriod === period.value }"
        @tap="selectPeriod(period.value)"
      >
        {{ period.label }}
      </view>
    </view>
    <view v-for="entry in entries" :key="entry.user.id" class="card">
      <text class="rank">{{ entry.rank }}</text>
      <view class="body">
        <text class="name">{{ entry.user.nickname }}</text>
        <text class="meta">完成 {{ entry.completedCount }} 单 · 按时率 {{ Math.round(entry.onTimeRate * 100) }}%</text>
      </view>
      <text class="xp">Lv.{{ entry.level }} · {{ entry.totalXp }} XP</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import type { LeaderboardEntry } from '@task-guild/shared';
import { request } from '../../api/client';

const periods = [
  { value: 'month', label: '本月' },
  { value: 'quarter', label: '本季' },
  { value: 'year', label: '本年' },
];
const activePeriod = ref('month');
const entries = ref<LeaderboardEntry[]>([]);

async function load() {
  entries.value = await request<LeaderboardEntry[]>({
    url: `/stats/leaderboard?period=${activePeriod.value}`,
  });
}

function selectPeriod(value: string) {
  activePeriod.value = value;
  void load();
}

onShow(() => {
  void load();
});
</script>

<style scoped>
.page {
  padding: var(--space-4);
}
.tabs {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}
.chip {
  padding: var(--space-1) var(--space-4);
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
  color: var(--color-ink-muted);
}
.chip.active {
  background: rgba(224, 170, 60, 0.16);
  color: #f2ce85;
}
.card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  margin-bottom: var(--space-3);
}
.rank {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--color-brass);
}
.body {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.name {
  font-weight: 700;
}
.meta,
.xp {
  color: var(--color-ink-muted);
  font-size: var(--font-xs);
}
.xp {
  color: var(--color-brass);
  font-weight: 700;
}
</style>

<style scoped>
.page {
  background:
    radial-gradient(circle at 50% 0%, rgba(192, 140, 46, 0.08), transparent 42%),
    var(--color-bg);
  min-height: 100vh;
}
.chip {
  background: rgba(255, 255, 255, 0.045);
}
.chip.active {
  background: rgba(224, 170, 60, 0.16);
  color: #f2ce85;
  border-color: rgba(224, 170, 60, 0.22);
  box-shadow: var(--shadow-sm);
}
.card {
  position: relative;
  background: var(--texture-paper);
  border: 1px solid var(--color-border);
  border-radius: 2px 14px 2px 14px;
  box-shadow: var(--shadow-sm);
}
.card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--color-brass), transparent 75%);
}
.rank {
  background: var(--texture-brass);
  color: #241a08;
  border: 1px solid rgba(224, 170, 60, 0.32);
  box-shadow: var(--shadow-sm);
  font-size: var(--font-sm);
}
.name {
  letter-spacing: 1px;
}
.xp {
  letter-spacing: 0.5px;
}
</style>
