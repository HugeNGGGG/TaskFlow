<template>
  <view class="page">
    <view class="page-head">
      <text class="page-title">总览看板</text>
      <view class="head-actions">
        <text class="display-link" @tap="openAttendance">考勤管理</text>
        <text class="display-link" @tap="openDisplay">打开大屏</text>
      </view>
    </view>
    <view class="cards">
      <view v-for="card in cards" :key="card.label" class="stat-card">
        <text class="num">{{ card.value }}</text>
        <text class="label">{{ card.label }}</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">类别分布</text>
      <view v-for="item in byCategory" :key="item.key" class="bar-row">
        <text class="bar-label">{{ item.key }}</text>
        <view class="bar-track">
          <view class="bar-fill" :style="{ width: barWidth(item.count, maxCategory) }" />
        </view>
        <text class="bar-value">{{ item.count }}</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">部门分布（按接取成员）</text>
      <view v-for="item in byDepartment" :key="item.key" class="bar-row">
        <text class="bar-label">{{ item.key }}</text>
        <view class="bar-track">
          <view class="bar-fill green" :style="{ width: barWidth(item.count, maxDepartment) }" />
        </view>
        <text class="bar-value">{{ item.count }}</text>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <text class="section-title">完成趋势</text>
        <picker :range="['近 7 天', '近 30 天']" :value="trendIndex" @change="onTrendChange">
          <text class="link">{{ trendIndex === 0 ? '近 7 天' : '近 30 天' }}</text>
        </picker>
      </view>
      <!-- #ifdef H5 -->
      <view id="trend-chart" class="chart" />
      <!-- #endif -->
      <!-- #ifndef H5 -->
      <view v-for="point in trend" :key="point.date" class="trend-row">
        <text>{{ point.date }} 新建 {{ point.created }} / 完成 {{ point.completed }}</text>
      </view>
      <!-- #endif -->
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
// #ifdef H5
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  LineChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
]);
// #endif
import type {
  DashboardOverview,
  DistributionPoint,
  TrendPoint,
} from '@task-guild/shared';
import { request } from '../../api/client';

const overview = ref<DashboardOverview | null>(null);
const byCategory = ref<DistributionPoint[]>([]);
const byDepartment = ref<DistributionPoint[]>([]);
const trend = ref<TrendPoint[]>([]);
const trendIndex = ref(0);
let chart: echarts.ECharts | null = null;

const cards = computed(() => [
  { label: '总委托', value: overview.value?.total ?? 0 },
  { label: '待接取', value: overview.value?.open ?? 0 },
  { label: '进行中', value: overview.value?.inProgress ?? 0 },
  { label: '待审核', value: overview.value?.pendingReview ?? 0 },
  { label: '已逾期', value: overview.value?.overdue ?? 0 },
  { label: '本周完成', value: overview.value?.completedThisWeek ?? 0 },
  { label: '本月完成', value: overview.value?.completedThisMonth ?? 0 },
]);
const maxCategory = computed(() =>
  Math.max(1, ...byCategory.value.map((item) => item.count)),
);
const maxDepartment = computed(() =>
  Math.max(1, ...byDepartment.value.map((item) => item.count)),
);

function barWidth(count: number, max: number): string {
  return `${Math.round((count / max) * 100)}%`;
}

async function load() {
  overview.value = await request<DashboardOverview>({ url: '/dashboard/overview' });
  byCategory.value = await request<DistributionPoint[]>({ url: '/dashboard/by-category' });
  byDepartment.value = await request<DistributionPoint[]>({ url: '/dashboard/by-department' });
  trend.value = await request<TrendPoint[]>({
    url: `/dashboard/trend?range=${trendIndex.value === 0 ? '7d' : '30d'}`,
  });
  renderChart();
}

function onTrendChange(event: { detail: { value: string | number } }) {
  trendIndex.value = Number(event.detail.value);
  void load();
}

function openDisplay() {
  // #ifdef H5
  window.open('/#/pages/display/index', '_blank');
  // #endif
  // #ifndef H5
  uni.navigateTo({ url: '/pages/display/index' });
  // #endif
}

function openAttendance() {
  uni.navigateTo({ url: '/pages/admin/attendance' });
}

function renderChart() {
  // #ifdef H5
  const element = document.getElementById('trend-chart') as HTMLElement | null;
  if (!element) {
    return;
  }
  if (!chart) {
    chart = echarts.init(element);
  }
  chart.setOption({
    color: ['#6B4A2F', '#4A6B4A'],
    tooltip: { trigger: 'axis' },
    legend: { data: ['新建', '完成'] },
    grid: { left: 32, right: 16, top: 36, bottom: 24 },
    xAxis: { type: 'category', data: trend.value.map((item) => item.date.slice(5)) },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      { name: '新建', type: 'line', data: trend.value.map((item) => item.created), smooth: true },
      { name: '完成', type: 'line', data: trend.value.map((item) => item.completed), smooth: true },
    ],
  });
  // #endif
}

onLoad(() => {
  void load();
});

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
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.display-link {
  color: var(--color-brass);
  font-size: var(--font-sm);
}
.head-actions {
  display: flex;
  gap: var(--space-3);
}
.cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
  margin: var(--space-4) 0;
}
.stat-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.num {
  font-family: var(--font-display);
  font-size: var(--font-xl);
  color: var(--color-brass);
}
.label {
  color: var(--color-ink-muted);
  font-size: var(--font-xs);
}
.section {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
}
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.section-title {
  font-family: var(--font-display);
  font-weight: 700;
  margin-bottom: var(--space-3);
}
.link {
  color: var(--color-brass);
  font-size: var(--font-sm);
}
.bar-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-1) 0;
}
.bar-label {
  width: 64px;
  font-size: var(--font-xs);
  color: var(--color-ink-muted);
}
.bar-track {
  flex: 1;
  height: 10px;
  background: var(--color-surface);
  border-radius: var(--radius-pill);
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: var(--color-leather);
  border-radius: var(--radius-pill);
}
.bar-fill.green {
  background: var(--color-moss);
}
.bar-value {
  width: 28px;
  text-align: right;
  font-size: var(--font-xs);
}
.chart {
  width: 100%;
  height: 220px;
}
.trend-row {
  padding: var(--space-1) 0;
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
.stat-card {
  position: relative;
  background: var(--texture-paper);
  border: 1px solid var(--color-border);
  border-radius: 2px 14px 2px 14px;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.stat-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--color-brass), transparent 75%);
}
.num {
  letter-spacing: 1px;
}
.label {
  letter-spacing: 1px;
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
.bar-track {
  background: rgba(107, 74, 47, 0.08);
  box-shadow: 0 1px 2px rgba(43, 33, 24, 0.08) inset;
}
.bar-fill {
  background: linear-gradient(90deg, var(--color-brass), #d5ad5a);
}
.bar-fill.green {
  background: linear-gradient(90deg, var(--color-moss), #6f9570);
}
</style>
