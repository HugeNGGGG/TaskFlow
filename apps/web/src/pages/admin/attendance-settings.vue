<template>
  <view class="page">
    <text class="page-title">考勤设置</text>

    <view class="section">
      <view class="field-row">
        <text class="field-label">标准工时</text>
        <input v-model.number="standardWorkHours" class="field" type="number" placeholder="例如 8" />
      </view>
      <view class="switch-row">
        <text>扣除午休</text>
        <switch :checked="deductLunch" color="#E0AA3C" @change="onDeductLunch" />
      </view>
      <view class="field-row">
        <text class="field-label">午休开始</text>
        <input v-model="lunchStart" class="field" placeholder="12:00" />
      </view>
      <view class="field-row">
        <text class="field-label">午休结束</text>
        <input v-model="lunchEnd" class="field" placeholder="13:00" />
      </view>
      <view class="field-row">
        <text class="field-label">工作日</text>
        <input v-model="workdays" class="field" placeholder="MON,TUE,WED,THU,FRI" />
      </view>
      <button class="btn primary" @tap="save">保存设置</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request } from '../../api/client';

const standardWorkHours = ref(8);
const deductLunch = ref(false);
const lunchStart = ref('12:00');
const lunchEnd = ref('13:00');
const workdays = ref('MON,TUE,WED,THU,FRI');

async function load() {
  const settings = await request<{
    standardWorkHours: number;
    deductLunch: boolean;
    lunchStart: string;
    lunchEnd: string;
    workdays: string;
  }>({ url: '/attendance/company-settings' });
  standardWorkHours.value = settings.standardWorkHours;
  deductLunch.value = settings.deductLunch;
  lunchStart.value = settings.lunchStart;
  lunchEnd.value = settings.lunchEnd;
  workdays.value = settings.workdays;
}

function onDeductLunch(event: Event) {
  deductLunch.value = (event as Event & { detail: { value: boolean } }).detail.value;
}

async function save() {
  try {
    await request({
      url: '/attendance/company-settings',
      method: 'PATCH',
      data: {
        standardWorkHours: Number(standardWorkHours.value) || 8,
        deductLunch: deductLunch.value,
        lunchStart: lunchStart.value,
        lunchEnd: lunchEnd.value,
        workdays: workdays.value,
      },
    });
    uni.showToast({ title: '设置已保存', icon: 'success' });
  } catch (error) {
    uni.showToast({ title: (error as { message: string }).message, icon: 'none' });
  }
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
.section {
  padding: 18px;
  border-radius: 18px;
  background: rgba(24, 29, 40, 0.44);
  border: 1px solid rgba(255, 255, 255, 0.09);
  backdrop-filter: blur(20px) saturate(130%);
}
.field-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}
.field-label {
  color: #9aa5bb;
  font-size: 13px;
}
.field {
  height: 44px;
  padding: 0 13px;
  border-radius: 12px;
  color: #eef1f8;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(148, 163, 190, 0.20);
}
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  color: #e8ecf6;
  font-size: 15px;
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
</style>
