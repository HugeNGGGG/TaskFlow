<template>
  <view class="page">
    <view class="page-head">
      <text class="page-title">考勤看板</text>
      <view class="head-actions">
        <picker :range="monthOptions" :value="monthIndex" @change="onMonthChange">
          <text class="month-link">{{ data.month }}</text>
        </picker>
        <text class="export-link" @tap="exportCsv">导出 CSV</text>
      </view>
    </view>

    <view class="metrics">
      <view class="metric">
        <text class="metric-value">{{ data.activeUserCount }}</text>
        <text class="metric-label">在职员工</text>
      </view>
      <view class="metric">
        <text class="metric-value">{{ data.attendedUserCount }}</text>
        <text class="metric-label">有考勤记录</text>
      </view>
      <view class="metric">
        <text class="metric-value">{{ data.attendanceRate }}%</text>
        <text class="metric-label">出勤率</text>
      </view>
      <view class="metric">
        <text class="metric-value">{{ data.averageHours }}</text>
        <text class="metric-label">人均工时</text>
      </view>
      <view class="metric">
        <text class="metric-value">{{ data.totalOvertimeHours }}</text>
        <text class="metric-label">加班工时</text>
      </view>
      <view class="metric">
        <text class="metric-value">{{ data.totalLeaveDays }}</text>
        <text class="metric-label">请假天数</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">员工考勤概览</text>
      <view v-for="row in data.rows" :key="row.user.id" class="row">
        <view class="row-main">
          <text class="name">{{ row.user.nickname }}</text>
          <text class="meta">{{ row.user.departmentName }} · 工作时段 {{ row.sessionCount }}</text>
          <text class="meta" v-if="row.leaveDays > 0">请假 {{ row.leaveDays }} 天</text>
        </view>
        <view class="row-values">
          <text class="value">{{ row.totalHours }}h</text>
          <text class="abnormal" v-if="row.abnormalCount > 0">异常 {{ row.abnormalCount }}</text>
        </view>
      </view>
      <text v-if="data.rows.length === 0" class="empty">暂无数据。</text>
    </view>

    <!-- #ifdef H5 -->
    <view class="section">
      <text class="section-title">员工工时图表</text>
      <view id="attendance-chart" class="chart" />
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getAccessToken, PUBLIC_ORIGIN, request } from '../../api/client';
// #ifdef H5
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);
// #endif

interface AttendanceDashboard {
  month: string;
  activeUserCount: number;
  attendedUserCount: number;
  attendanceRate: number;
  averageHours: number;
  standardWorkHours: number;
  totalOvertimeHours: number;
  totalLeaveDays: number;
  rows: {
    user: {
      id: string;
      nickname: string;
      username: string;
      departmentName: string;
    };
    sessionCount: number;
    totalHours: number;
    abnormalCount: number;
    leaveDays: number;
  }[];
}

const data = ref<AttendanceDashboard>({
  month: new Date().toISOString().slice(0, 7),
  activeUserCount: 0,
  attendedUserCount: 0,
  attendanceRate: 0,
  averageHours: 0,
  standardWorkHours: 8,
  totalOvertimeHours: 0,
  totalLeaveDays: 0,
  rows: [],
});
const monthIndex = ref(0);
let chart: echarts.ECharts | null = null;

const monthOptions = computed(() => {
  const now = new Date();
  const options: string[] = [];
  for (let i = 0; i < 12; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    );
  }
  return options;
});

async function load() {
  data.value = await request<AttendanceDashboard>({
    url: `/attendance/dashboard?month=${data.value.month}`,
  });
  renderChart();
}

function onMonthChange(event: { detail: { value: string | number } }) {
  monthIndex.value = Number(event.detail.value);
  data.value.month = monthOptions.value[monthIndex.value] ?? data.value.month;
  void load();
}

function renderChart() {
  // #ifdef H5
  const element = document.getElementById('attendance-chart') as HTMLElement | null;
  if (!element) {
    return;
  }
  if (!chart) {
    chart = echarts.init(element);
  }
  const rows = [...data.value.rows].sort((a, b) => b.totalHours - a.totalHours);
  chart.setOption({
    color: ['#E0AA3C'],
    tooltip: { trigger: 'axis' },
    grid: { left: 34, right: 14, top: 24, bottom: 32 },
    xAxis: {
      type: 'category',
      data: rows.map((row) => row.user.nickname),
      axisLabel: { color: '#9AA5BB', rotate: 18 },
    },
    yAxis: {
      type: 'value',
      name: '小时',
      axisLabel: { color: '#9AA5BB' },
    },
    series: [
      {
        name: '总工时',
        type: 'bar',
        data: rows.map((row) => row.totalHours),
        itemStyle: { borderRadius: [7, 7, 0, 0] },
      },
    ],
  });
  // #endif
}

function exportCsv() {
  uni.downloadFile({
    url: `${PUBLIC_ORIGIN}/api/v1/attendance/export?month=${data.value.month}`,
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
  min-height: 100vh;
  padding: 20px;
  background:
    radial-gradient(circle at 72% -8%, rgba(224, 170, 60, 0.18), transparent 34%),
    radial-gradient(circle at 8% 108%, rgba(75, 195, 210, 0.14), transparent 32%),
    linear-gradient(145deg, #0e1118 0%, #121723 58%, #0c1017 100%);
}
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.page-title {
  font-family: var(--font-display);
  font-size: 28px;
}
.export-link {
  color: #f2ce85;
  font-size: 14px;
}
.head-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}
.month-link {
  color: #f2ce85;
  font-size: 14px;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 18px;
}
.metric {
  padding: 16px;
  border-radius: 16px;
  background: rgba(24, 29, 40, 0.44);
  border: 1px solid rgba(255, 255, 255, 0.09);
  backdrop-filter: blur(20px) saturate(130%);
}
.metric-value {
  display: block;
  font-family: var(--font-display);
  font-size: 28px;
  color: #f2c26e;
}
.metric-label {
  display: block;
  margin-top: 6px;
  color: #8d98ad;
  font-size: 12px;
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
  padding: 13px 0;
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
.meta,
.abnormal {
  color: #8d98ad;
  font-size: 13px;
}
.row-values {
  display: flex;
  align-items: center;
  gap: 12px;
}
.value {
  color: #f2ce85;
  font-weight: 700;
}
.abnormal {
  color: #ffb2a8;
}
.empty {
  color: #8d98ad;
  font-size: 13px;
  padding: 12px 0;
}
.chart {
  width: 100%;
  height: 320px;
}
</style>
