<template>
  <view class="records-page">
    <text class="title">考勤记录</text>

    <view class="section">
      <text class="section-title">工作时段</text>
      <view v-for="session in sessions" :key="session.id" class="record-card">
        <text class="record-title">{{ session.date }}</text>
        <text class="record-meta">
          {{ formatTime(session.startTime) }} → {{ session.endTime ? formatTime(session.endTime) : '未下班' }}
        </text>
        <text class="record-meta">{{ formatMinutes(session.durationMinutes) }} · {{ session.status }}</text>
      </view>
      <text v-if="sessions.length === 0" class="empty">暂无工作时段。</text>
    </view>

    <view class="section">
      <text class="section-title">补卡申请</text>
      <view v-for="correction in corrections" :key="correction.id" class="record-card">
        <text class="record-title">{{ correction.date }} · {{ correction.type === 'IN' ? '补上班卡' : '补下班卡' }}</text>
        <text class="record-meta">{{ correction.status }} · {{ correction.reason }}</text>
      </view>
      <text v-if="corrections.length === 0" class="empty">暂无补卡申请。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request } from '../../api/client';

interface SessionRow {
  id: string;
  date: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  status: string;
}

interface CorrectionRow {
  id: string;
  date: string;
  type: 'IN' | 'OUT';
  status: string;
  reason: string;
}

const sessions = ref<SessionRow[]>([]);
const corrections = ref<CorrectionRow[]>([]);

async function load() {
  const month = new Date().toISOString().slice(0, 7);
  const result = await request<{ sessions: SessionRow[] }>({
    url: `/attendance/sessions?month=${month}`,
  });
  sessions.value = result.sessions;
  corrections.value = await request<CorrectionRow[]>({
    url: '/attendance/corrections',
  });
}

function formatTime(value: string): string {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatMinutes(value: number | null): string {
  if (value == null) return '0 分钟';
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return hours > 0 ? `${hours} 小时 ${minutes} 分钟` : `${minutes} 分钟`;
}

onShow(() => {
  void load();
});
</script>

<style scoped>
.records-page {
  min-height: 100vh;
  padding: 22px 20px 40px;
  background:
    radial-gradient(circle at 72% -8%, rgba(224, 170, 60, 0.18), transparent 34%),
    radial-gradient(circle at 8% 108%, rgba(75, 195, 210, 0.14), transparent 32%),
    linear-gradient(145deg, #0e1118 0%, #121723 58%, #0c1017 100%);
}
.title {
  display: block;
  font-family: var(--font-display);
  font-size: 28px;
  margin-bottom: 16px;
}
.section {
  margin-top: 16px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(24, 29, 40, 0.44);
  border: 1px solid rgba(255, 255, 255, 0.09);
  backdrop-filter: blur(20px) saturate(130%);
}
.section-title {
  display: block;
  margin-bottom: 13px;
  font-family: var(--font-display);
  font-size: 18px;
  color: #f2ce85;
}
.record-card {
  padding: 13px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.record-title {
  display: block;
  color: #eef1f8;
  font-weight: 700;
}
.record-meta {
  display: block;
  margin-top: 6px;
  color: #8d98ad;
  font-size: 13px;
}
.empty {
  color: #8d98ad;
  font-size: 13px;
  padding: 12px 0;
}
</style>
