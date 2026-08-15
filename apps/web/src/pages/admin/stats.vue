<template>
  <view class="page">
    <view class="page-head">
      <text class="page-title">员工统计</text>
      <text class="export-link" @tap="exportCsv">导出 CSV</text>
    </view>
    <view v-for="row in rows" :key="row.user.id" class="card">
      <view class="head">
        <text class="name">{{ row.user.nickname }}</text>
        <text class="level">Lv.{{ row.level }}</text>
      </view>
      <view class="grid">
        <view class="cell"><text class="num">{{ row.activeLoad }}</text><text class="label">在办负载</text></view>
        <view class="cell"><text class="num">{{ row.completedCount }}</text><text class="label">完成</text></view>
        <view class="cell"><text class="num">{{ Math.round(row.onTimeRate * 100) }}%</text><text class="label">按时率</text></view>
        <view class="cell"><text class="num">{{ row.overdueCount }}</text><text class="label">逾期</text></view>
        <view class="cell"><text class="num">{{ row.totalXp }}</text><text class="label">经验</text></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import type { MemberStatsRow } from '@task-guild/shared';
import { getAccessToken, PUBLIC_ORIGIN, request } from '../../api/client';

const rows = ref<MemberStatsRow[]>([]);

async function load() {
  rows.value = await request<MemberStatsRow[]>({ url: '/stats/members' });
}

function exportCsv() {
  uni.downloadFile({
    url: `${PUBLIC_ORIGIN}/api/v1/reports/export-tasks`,
    header: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
    success: (response) => {
      if (response.statusCode >= 200 && response.statusCode < 300) {
        // #ifdef H5
        window.open(response.tempFilePath, '_blank');
        // #endif
        // #ifndef H5
        uni.openDocument({ filePath: response.tempFilePath, showMenu: true });
        // #endif
      } else {
        uni.showToast({ title: '导出失败', icon: 'none' });
      }
    },
    fail: () => {
      uni.showToast({ title: '导出失败，请稍后重试', icon: 'none' });
    },
  });
}

onShow(() => {
  void load();
});
</script>

<style scoped>
.page {
  padding: var(--space-4);
}
.page-title {
  font-family: var(--font-display);
  font-size: var(--font-lg);
  font-weight: 700;
}
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.export-link {
  color: var(--color-brass);
  font-size: var(--font-sm);
}
.card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-top: var(--space-3);
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.name {
  font-weight: 700;
}
.level {
  color: var(--color-brass);
  font-weight: 700;
}
.grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  margin-top: var(--space-3);
}
.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.num {
  font-family: var(--font-display);
  color: var(--color-brass);
}
.label {
  color: var(--color-ink-muted);
  font-size: var(--font-xs);
}
</style>

<style scoped>
.page {
  background:
    radial-gradient(circle at 50% 0%, rgba(192, 140, 46, 0.08), transparent 42%),
    var(--color-bg);
  min-height: 100vh;
}
.page-title {
  letter-spacing: 3px;
  color: var(--color-leather);
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
.name {
  letter-spacing: 1px;
}
.level {
  font-family: var(--font-display);
}
</style>
