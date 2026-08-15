<template>
  <view class="leave-page">
    <text class="title">请假 / 调休</text>

    <view class="section">
      <text class="section-title">发起申请</text>
      <picker :range="leaveTypes" :value="leaveTypeIndex" @change="onLeaveType">
        <view class="field picker-field">类型：{{ leaveTypes[leaveTypeIndex] }}</view>
      </picker>
      <view class="field-row">
        <input v-model="startDate" class="field" placeholder="开始日期 YYYY-MM-DD" />
        <input v-model="endDate" class="field" placeholder="结束日期 YYYY-MM-DD" />
      </view>
      <textarea v-model="reason" class="field area" placeholder="请假原因" />
      <button class="btn primary" @tap="submit">提交申请</button>
    </view>

    <view class="section">
      <text class="section-title">我的申请</text>
      <view v-for="leave in leaves" :key="leave.id" class="leave-card">
        <view class="leave-head">
          <text class="leave-title">{{ leave.leaveType }}</text>
          <text class="leave-status">{{ leave.status }}</text>
        </view>
        <text class="leave-meta">{{ leave.startDate }} ~ {{ leave.endDate }}</text>
        <text class="leave-meta">{{ leave.reason }}</text>
      </view>
      <text v-if="leaves.length === 0" class="empty">还没有请假或调休申请。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request } from '../../api/client';

interface LeaveRow {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
}

const leaveTypes = ['年假', '病假', '事假', '调休', '出差'];
const leaveTypeKeys = ['ANNUAL', 'SICK', 'PERSONAL', 'COMP_TIME', 'BUSINESS_TRIP'];
const leaveTypeIndex = ref(0);
const startDate = ref('');
const endDate = ref('');
const reason = ref('');
const leaves = ref<LeaveRow[]>([]);

async function load() {
  leaves.value = await request<LeaveRow[]>({ url: '/attendance/leaves' });
}

function onLeaveType(event: { detail: { value: string | number } }) {
  leaveTypeIndex.value = Number(event.detail.value);
}

async function submit() {
  if (!startDate.value || !endDate.value || !reason.value.trim()) {
    uni.showToast({ title: '请填写完整申请信息', icon: 'none' });
    return;
  }
  try {
    await request({
      url: '/attendance/leaves',
      method: 'POST',
      data: {
        leaveType: leaveTypeKeys[leaveTypeIndex.value],
        startDate: startDate.value,
        endDate: endDate.value,
        reason: reason.value.trim(),
      },
    });
    startDate.value = '';
    endDate.value = '';
    reason.value = '';
    await load();
    uni.showToast({ title: '申请已提交', icon: 'success' });
  } catch (error) {
    uni.showToast({ title: (error as { message: string }).message, icon: 'none' });
  }
}

onShow(() => {
  void load();
});
</script>

<style scoped>
.leave-page {
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
  margin-bottom: 14px;
  font-family: var(--font-display);
  font-size: 18px;
  color: #f2ce85;
}
.field-row {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.field {
  flex: 1;
  height: 44px;
  padding: 0 13px;
  border-radius: 12px;
  color: #eef1f8;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(148, 163, 190, 0.20);
}
.picker-field {
  display: flex;
  align-items: center;
}
.area {
  width: 100%;
  height: 90px;
  margin-top: 12px;
  padding: 12px 13px;
}
.btn {
  margin-top: 14px;
  border-radius: 12px;
  font-weight: 700;
}
.btn.primary {
  color: #241a08;
  background: linear-gradient(180deg, #e6bb5c, #c8902c);
  border: 1px solid rgba(224, 170, 60, 0.32);
}
.leave-card {
  padding: 13px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.leave-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.leave-title {
  color: #eef1f8;
  font-weight: 700;
}
.leave-status {
  color: #f2ce85;
  font-size: 13px;
}
.leave-meta {
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
