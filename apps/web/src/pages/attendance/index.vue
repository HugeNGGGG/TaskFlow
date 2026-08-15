<template>
  <view class="attendance-page">
    <view class="header-card">
      <text class="eyebrow">ATTENDANCE</text>
      <text class="title">考勤打卡</text>
      <text class="subtitle">记录上下班打卡与本月工时。</text>
    </view>

    <view class="today-card">
      <text class="today-label">今日状态</text>
      <text class="today-date">{{ today.date }}</text>
      <view class="punch-actions">
        <view class="punch-btn" @tap="punch('IN')">上班打卡</view>
        <view class="punch-btn out" @tap="punch('OUT')">下班打卡</view>
      </view>
      <input v-model="workContent" class="field" placeholder="工作内容或地点说明" />
    </view>

    <view class="section">
      <text class="section-title">今日打卡记录</text>
      <view v-for="punch in today.punches" :key="punch.id" class="punch-row">
        <text class="punch-type">{{ punch.type === 'IN' ? '上班' : '下班' }}</text>
        <text class="punch-time">{{ formatDateTime(punch.punchTime) }}</text>
        <text class="punch-content">{{ punch.workContent }}</text>
      </view>
      <text v-if="today.punches.length === 0" class="empty">今天还没有打卡记录。</text>
    </view>

    <view class="section">
      <view class="section-head">
        <text class="section-title">本月工时</text>
        <view class="section-actions">
          <text class="link" @tap="goRecords">查看记录</text>
          <text class="link" @tap="goLeave">请假调休</text>
        </view>
      </view>
      <view class="summary-grid">
        <view class="summary-item">
          <text class="summary-value">{{ monthSummary.totalHours }}</text>
          <text class="summary-label">小时</text>
        </view>
        <view class="summary-item">
          <text class="summary-value">{{ monthSummary.sessionCount }}</text>
          <text class="summary-label">工作时段</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request } from '../../api/client';

interface PunchRow {
  id: string;
  type: 'IN' | 'OUT';
  punchTime: string;
  workContent: string;
}

interface SessionRow {
  id: string;
  date: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  status: string;
}

const workContent = ref('');
const today = ref<{ date: string; punches: PunchRow[] }>({
  date: new Date().toISOString().slice(0, 10),
  punches: [],
});
const monthSummary = ref({ totalHours: 0, sessionCount: 0 });

async function loadToday() {
  today.value = await request<{ date: string; punches: PunchRow[] }>({
    url: '/attendance/today',
  });
}

async function loadMonth() {
  const month = new Date().toISOString().slice(0, 7);
  const result = await request<{
    month: string;
    sessions: SessionRow[];
    summary: { totalHours: number; sessionCount: number };
  }>({ url: `/attendance/sessions?month=${month}` });
  monthSummary.value = result.summary;
}

async function punch(type: 'IN' | 'OUT') {
  if (!workContent.value.trim()) {
    uni.showToast({ title: '请填写工作内容或地点说明', icon: 'none' });
    return;
  }
  try {
    await request({
      url: '/attendance/punch',
      method: 'POST',
      data: { type, workContent: workContent.value.trim() },
    });
    workContent.value = '';
    await Promise.all([loadToday(), loadMonth()]);
    uni.showToast({ title: '打卡成功', icon: 'success' });
  } catch (error) {
    uni.showToast({ title: (error as { message: string }).message, icon: 'none' });
  }
}

function goRecords() {
  uni.navigateTo({ url: '/pages/attendance/records' });
}

function goLeave() {
  uni.navigateTo({ url: '/pages/attendance/leave' });
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

onShow(() => {
  void Promise.all([loadToday(), loadMonth()]);
});
</script>

<style scoped>
.attendance-page {
  min-height: 100vh;
  padding: 22px 20px 40px;
  background:
    radial-gradient(circle at 72% -8%, rgba(224, 170, 60, 0.18), transparent 34%),
    radial-gradient(circle at 8% 108%, rgba(75, 195, 210, 0.14), transparent 32%),
    linear-gradient(145deg, #0e1118 0%, #121723 58%, #0c1017 100%);
}
.header-card,
.today-card,
.section {
  border-radius: 18px;
  background: rgba(24, 29, 40, 0.46);
  border: 1px solid rgba(255, 255, 255, 0.09);
  backdrop-filter: blur(20px) saturate(130%);
}
.header-card {
  padding: 22px;
}
.eyebrow {
  color: #f2ce85;
  font-size: 12px;
  letter-spacing: 3px;
}
.title {
  display: block;
  margin-top: 9px;
  font-family: var(--font-display);
  font-size: 30px;
}
.subtitle {
  display: block;
  margin-top: 8px;
  color: #8d98ad;
  font-size: 14px;
}
.today-card {
  margin-top: 16px;
  padding: 18px;
}
.today-label {
  color: #f2ce85;
  font-size: 14px;
}
.today-date {
  display: block;
  margin-top: 7px;
  color: #eef1f8;
  font-size: 18px;
}
.punch-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}
.punch-btn {
  flex: 1;
  height: 44px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  color: #241a08;
  font-weight: 700;
  background: linear-gradient(180deg, #e6bb5c, #c8902c);
  border: 1px solid rgba(224, 170, 60, 0.32);
}
.punch-btn.out {
  background: rgba(255, 255, 255, 0.07);
  color: #eef1f8;
  border-color: rgba(148, 163, 190, 0.22);
}
.field {
  height: 44px;
  margin-top: 14px;
  padding: 0 13px;
  border-radius: 12px;
  color: #eef1f8;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(148, 163, 190, 0.20);
}
.section {
  margin-top: 16px;
  padding: 18px;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.section-title {
  font-family: var(--font-display);
  font-size: 18px;
  color: #f2ce85;
}
.link {
  color: #f2ce85;
  font-size: 14px;
}
.section-actions {
  display: flex;
  gap: 14px;
}
.punch-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.punch-type {
  color: #f2ce85;
  font-weight: 700;
}
.punch-time,
.punch-content {
  color: #9aa5bb;
  font-size: 14px;
}
.empty {
  color: #8d98ad;
  font-size: 13px;
  padding: 14px 0;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 14px;
}
.summary-item {
  padding: 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.09);
}
.summary-value {
  display: block;
  font-family: var(--font-display);
  font-size: 26px;
  color: #f2c26e;
}
.summary-label {
  display: block;
  margin-top: 5px;
  color: #8d98ad;
  font-size: 12px;
}
</style>
