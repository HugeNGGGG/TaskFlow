<template>
  <view class="work-page">
    <view class="glow glow-a" />
    <view class="glow glow-b" />

    <view class="work-header">
      <view>
        <text class="eyebrow">MY WORK</text>
        <text class="title">我的工作台</text>
        <text class="subtitle">把今天需要关注的事情集中在这里。</text>
      </view>
      <view class="header-stats">
        <view class="header-stat">
          <text class="header-num">{{ activeTasks.length }}</text>
          <text class="header-label">进行中</text>
        </view>
        <view class="header-stat">
          <text class="header-num">{{ dueSoonTasks.length }}</text>
          <text class="header-label">24h 内到期</text>
        </view>
        <view class="header-stat">
          <text class="header-num">{{ pendingReviewTasks.length }}</text>
          <text class="header-label">待审核</text>
        </view>
      </view>
    </view>

    <view v-if="dueSoonTasks.length" class="section">
      <text class="section-title">即将到期</text>
      <view v-for="task in dueSoonTasks" :key="task.id" class="task-card" @tap="goDetail(task.id)">
        <view class="task-top">
          <text class="task-no">{{ task.taskNo }}</text>
          <text class="difficulty">难度 {{ task.difficulty }}</text>
        </view>
        <text class="task-title">{{ task.title }}</text>
        <view class="progress-track">
          <view class="progress-fill" :style="{ width: `${task.progressPercent}%` }" />
        </view>
        <view class="task-meta">
          <text>截止 {{ formatDateTime(task.deadlineAt) }}</text>
          <text>{{ task.progressPercent }}%</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">进行中</text>
      <view v-for="task in activeTasks" :key="task.id" class="task-card" @tap="goDetail(task.id)">
        <view class="task-top">
          <text class="task-no">{{ task.taskNo }}</text>
          <text class="difficulty">难度 {{ task.difficulty }}</text>
        </view>
        <text class="task-title">{{ task.title }}</text>
        <view class="progress-track">
          <view class="progress-fill" :style="{ width: `${task.progressPercent}%` }" />
        </view>
        <view class="task-meta">
          <text>截止 {{ formatDateTime(task.deadlineAt) }}</text>
          <text>{{ task.progressPercent }}%</text>
        </view>
      </view>
      <text v-if="activeTasks.length === 0" class="empty">暂无进行中的任务。</text>
    </view>

    <view class="section">
      <text class="section-title">待审核</text>
      <view v-for="task in pendingReviewTasks" :key="task.id" class="task-card" @tap="goDetail(task.id)">
        <view class="task-top">
          <text class="task-no">{{ task.taskNo }}</text>
          <text class="difficulty">难度 {{ task.difficulty }}</text>
        </view>
        <text class="task-title">{{ task.title }}</text>
        <view class="task-meta">
          <text>已提交，等待发布官审核</text>
          <text>{{ task.progressPercent }}%</text>
        </view>
      </view>
      <text v-if="pendingReviewTasks.length === 0" class="empty">暂无待审核任务。</text>
    </view>

    <view class="section">
      <text class="section-title">最近完成</text>
      <view v-for="task in completedTasks" :key="task.id" class="task-card completed" @tap="goDetail(task.id)">
        <text class="task-title">{{ task.title }}</text>
        <view class="task-meta">
          <text>{{ task.taskNo }}</text>
          <text>已完成</text>
        </view>
      </view>
      <text v-if="completedTasks.length === 0" class="empty">还没有完成记录。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import type { TaskCard } from '@task-guild/shared';
import { request } from '../../api/client';

const tasks = ref<TaskCard[]>([]);

const activeTasks = computed(() =>
  tasks.value.filter((task) => task.status === 'in_progress' || task.status === 'open'),
);
const dueSoonTasks = computed(() =>
  activeTasks.value.filter((task) => {
    const diff = new Date(task.deadlineAt).getTime() - Date.now();
    return diff >= 0 && diff <= 24 * 60 * 60 * 1000;
  }),
);
const pendingReviewTasks = computed(() =>
  tasks.value.filter((task) => task.status === 'pending_review'),
);
const completedTasks = computed(() =>
  tasks.value
    .filter((task) => task.status === 'completed')
    .slice(0, 5),
);

async function load() {
  tasks.value = await request<TaskCard[]>({ url: '/tasks/mine' });
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/task/detail?id=${id}` });
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

onShow(() => {
  void load();
});
</script>

<style scoped>
.work-page {
  position: relative;
  min-height: 100vh;
  padding: 22px 20px 40px;
  overflow: hidden;
  background:
    radial-gradient(circle at 72% -8%, rgba(224, 170, 60, 0.18), transparent 34%),
    radial-gradient(circle at 8% 108%, rgba(75, 195, 210, 0.14), transparent 32%),
    linear-gradient(145deg, #0e1118 0%, #121723 58%, #0c1017 100%);
}
.glow {
  position: fixed;
  width: 230px;
  height: 230px;
  border-radius: 50%;
  filter: blur(26px);
  opacity: 0.42;
  pointer-events: none;
  animation: float 8s ease-in-out infinite;
}
.glow-a { left: 10%; top: 15%; background: rgba(224, 170, 60, 0.20); }
.glow-b { right: 8%; bottom: 10%; background: rgba(75, 195, 210, 0.14); animation-delay: -4s; }
@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-18px) scale(1.06); }
}
.work-header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 22px;
  border-radius: 22px;
  background: rgba(24, 29, 40, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(24px) saturate(150%);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.24);
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
.header-stats {
  display: flex;
  gap: 10px;
}
.header-stat {
  min-width: 104px;
  padding: 13px 14px;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.09);
}
.header-num {
  display: block;
  font-family: var(--font-display);
  font-size: 24px;
  color: #f2c26e;
}
.header-label {
  display: block;
  margin-top: 5px;
  color: #8d98ad;
  font-size: 12px;
}
.section {
  position: relative;
  z-index: 1;
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
  letter-spacing: 1px;
}
.task-card {
  margin-bottom: 12px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.09);
}
.task-top,
.task-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.task-no {
  color: #8d98ad;
  font-size: 12px;
  letter-spacing: 1px;
}
.difficulty {
  color: #f2ce85;
  font-size: 12px;
  font-weight: 700;
}
.task-title {
  display: block;
  margin-top: 10px;
  font-family: var(--font-display);
  font-size: 17px;
  line-height: 1.4;
}
.progress-track {
  height: 7px;
  margin-top: 12px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #e0aa3c, #f1cd78);
  box-shadow: 0 0 14px rgba(224, 170, 60, 0.28);
}
.task-meta {
  margin-top: 10px;
  color: #8d98ad;
  font-size: 13px;
}
.empty {
  color: #8d98ad;
  font-size: 13px;
}
.task-card.completed {
  opacity: 0.76;
}
</style>
