<template>
  <view class="page">
    <view class="page-head">
      <text class="page-title">考勤管理</text>
      <view class="head-links">
        <text class="link" @tap="goDashboard">考勤看板</text>
        <text class="link" @tap="goSettings">考勤设置</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">今日打卡</text>
      <view v-for="punch in todayPunches" :key="punch.id" class="row">
        <text>{{ punch.user.nickname }}</text>
        <text>{{ punch.type === 'IN' ? '上班' : '下班' }} · {{ formatTime(punch.punchTime) }}</text>
      </view>
      <text v-if="todayPunches.length === 0" class="empty">今天还没有打卡记录。</text>
    </view>

    <view class="section">
      <text class="section-title">待审批补卡</text>
      <view v-for="correction in corrections" :key="correction.id" class="row">
        <view class="row-main">
          <text class="name">{{ correction.user.nickname }}</text>
          <text class="meta">{{ correction.date }} · {{ correction.reason }}</text>
        </view>
        <view class="actions">
          <text class="action ok" @tap="reviewCorrection(correction.id, 'APPROVED')">通过</text>
          <text class="action no" @tap="reviewCorrection(correction.id, 'REJECTED')">驳回</text>
        </view>
      </view>
      <text v-if="corrections.length === 0" class="empty">暂无待审批补卡。</text>
    </view>

    <view class="section">
      <text class="section-title">待审批请假</text>
      <view v-for="leave in leaves" :key="leave.id" class="row">
        <view class="row-main">
          <text class="name">{{ leave.user.nickname }}</text>
          <text class="meta">{{ leave.startDate }} ~ {{ leave.endDate }} · {{ leave.reason }}</text>
        </view>
        <view class="actions">
          <text class="action ok" @tap="reviewLeave(leave.id, 'APPROVED')">通过</text>
          <text class="action no" @tap="reviewLeave(leave.id, 'REJECTED')">驳回</text>
        </view>
      </view>
      <text v-if="leaves.length === 0" class="empty">暂无待审批请假。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request } from '../../api/client';

interface PunchAdminRow {
  id: string;
  type: 'IN' | 'OUT';
  punchTime: string;
  user: { id: string; nickname: string };
}

interface CorrectionAdminRow {
  id: string;
  date: string;
  reason: string;
  user: { id: string; nickname: string };
}

interface LeaveAdminRow {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  user: { id: string; nickname: string };
}

const todayPunches = ref<PunchAdminRow[]>([]);
const corrections = ref<CorrectionAdminRow[]>([]);
const leaves = ref<LeaveAdminRow[]>([]);

async function load() {
  const [punches, correctionRows, leaveRows] = await Promise.all([
    request<PunchAdminRow[]>({ url: '/attendance/admin/today' }),
    request<CorrectionAdminRow[]>({ url: '/attendance/admin/corrections?status=PENDING' }),
    request<LeaveAdminRow[]>({ url: '/attendance/admin/leaves?status=PENDING' }),
  ]);
  todayPunches.value = punches;
  corrections.value = correctionRows;
  leaves.value = leaveRows;
}

function goSettings() {
  uni.navigateTo({ url: '/pages/admin/attendance-settings' });
}

function goDashboard() {
  uni.navigateTo({ url: '/pages/admin/attendance-dashboard' });
}

async function reviewCorrection(id: string, decision: 'APPROVED' | 'REJECTED') {
  await request({
    url: `/attendance/admin/corrections/${id}`,
    method: 'PATCH',
    data: { decision },
  });
  await load();
}

async function reviewLeave(id: string, decision: 'APPROVED' | 'REJECTED') {
  await request({
    url: `/attendance/admin/leaves/${id}`,
    method: 'PATCH',
    data: { decision },
  });
  await load();
}

function formatTime(value: string): string {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

onShow(() => {
  void load();
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 20px;
  background:
    radial-gradient(circle at 72% -8%, rgba(224, 170, 60, 0.18), transparent 34%),
    radial-gradient(circle at 8% 108%, rgba(75, 195, 210, 0.14), transparent 32%),
    linear-gradient(145deg, #0e1118 0%, #121723 58%, #0c1017 100%);
}
.page-title {
  display: block;
  font-family: var(--font-display);
  font-size: 28px;
  margin-bottom: 16px;
}
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.link {
  color: #f2ce85;
  font-size: 14px;
}
.head-links {
  display: flex;
  gap: 14px;
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
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.row-main {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.name {
  color: #eef1f8;
  font-weight: 700;
}
.meta {
  color: #8d98ad;
  font-size: 13px;
}
.actions {
  display: flex;
  gap: 10px;
}
.action {
  color: #f2ce85;
  font-size: 13px;
}
.action.no {
  color: #ffb2a8;
}
.empty {
  color: #8d98ad;
  font-size: 13px;
  padding: 10px 0;
}
</style>
