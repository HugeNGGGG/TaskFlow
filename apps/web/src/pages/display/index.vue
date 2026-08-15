<template>
  <view class="display">
    <view class="ambient ambient-a" />
    <view class="ambient ambient-b" />

    <view class="display-shell">
      <view class="topbar">
        <view class="brand">
          <view class="sigil">会</view>
          <view>
            <text class="brand-title">冒险者公会 · 任务大屏</text>
            <text class="brand-sub">TASK GUILD LIVE BOARD</text>
          </view>
        </view>
        <view class="top-right">
          <text class="live-dot" />
          <text class="clock">{{ clock }}</text>
          <view v-if="auth.isManager" class="refresh-btn" @tap="manualRefresh">手动刷新</view>
        </view>
      </view>

      <view class="metrics">
        <view class="metric">
          <text class="metric-value">{{ stats.total }}</text>
          <text class="metric-label">全部任务</text>
        </view>
        <view class="metric accent">
          <text class="metric-value">{{ stats.open }}</text>
          <text class="metric-label">待接取</text>
        </view>
        <view class="metric">
          <text class="metric-value">{{ stats.inProgress }}</text>
          <text class="metric-label">进行中</text>
        </view>
        <view class="metric warn">
          <text class="metric-value">{{ stats.pendingReview }}</text>
          <text class="metric-label">待审核</text>
        </view>
        <view class="metric danger">
          <text class="metric-value">{{ stats.overdue }}</text>
          <text class="metric-label">已逾期</text>
        </view>
      </view>

      <view class="board">
        <view class="column">
          <view class="column-head">
            <text class="column-title">待接取</text>
            <text class="column-count">{{ openTasks.length }}</text>
          </view>
          <scroll-view scroll-y class="task-scroll">
            <view v-for="task in openTasks" :key="task.id" class="task-card">
              <view class="task-top">
                <text class="task-no">{{ task.taskNo }}</text>
                <text class="difficulty">难度 {{ task.difficulty }}</text>
              </view>
              <text class="task-title">{{ task.title }}</text>
              <view class="task-meta">
                <text>{{ task.categoryName ?? '未分类' }}</text>
                <text>{{ task.acceptCount }}/{{ task.maxMembers }} 人</text>
              </view>
              <view class="progress-track">
                <view class="progress-fill" :style="{ width: `${task.progressPercent}%` }" />
              </view>
              <view class="deadline-row">
                <text>截止</text>
                <text>{{ formatDateTime(task.deadlineAt) }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <view class="column">
          <view class="column-head">
            <text class="column-title">进行中</text>
            <text class="column-count">{{ inProgressTasks.length }}</text>
          </view>
          <scroll-view scroll-y class="task-scroll">
            <view v-for="task in inProgressTasks" :key="task.id" class="task-card">
              <view class="task-top">
                <text class="task-no">{{ task.taskNo }}</text>
                <text class="difficulty">难度 {{ task.difficulty }}</text>
              </view>
              <text class="task-title">{{ task.title }}</text>
              <view class="task-meta">
                <text>{{ task.categoryName ?? '未分类' }}</text>
                <text>{{ task.acceptCount }}/{{ task.maxMembers }} 人</text>
              </view>
              <view class="progress-track">
                <view class="progress-fill" :style="{ width: `${task.progressPercent}%` }" />
              </view>
              <view class="deadline-row">
                <text>截止</text>
                <text>{{ formatDateTime(task.deadlineAt) }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <view class="column">
          <view class="column-head">
            <text class="column-title">待审核</text>
            <text class="column-count">{{ pendingReviewTasks.length }}</text>
          </view>
          <scroll-view scroll-y class="task-scroll">
            <view v-for="task in pendingReviewTasks" :key="task.id" class="task-card">
              <view class="task-top">
                <text class="task-no">{{ task.taskNo }}</text>
                <text class="difficulty">难度 {{ task.difficulty }}</text>
              </view>
              <text class="task-title">{{ task.title }}</text>
              <view class="task-meta">
                <text>{{ task.categoryName ?? '未分类' }}</text>
                <text>{{ task.acceptCount }}/{{ task.maxMembers }} 人</text>
              </view>
              <view class="progress-track">
                <view class="progress-fill" :style="{ width: `${task.progressPercent}%` }" />
              </view>
              <view class="deadline-row">
                <text>提交后待审核</text>
                <text>{{ formatDateTime(task.deadlineAt) }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <view class="side-panel">
          <view class="panel-title">最新公告</view>
          <view v-for="announcement in announcements" :key="announcement.id" class="announcement">
            <text class="announcement-title">{{ announcement.title }}</text>
            <text class="announcement-content">{{ announcement.content }}</text>
          </view>
          <view v-if="announcements.length === 0" class="empty">暂无公告</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow, onUnload } from '@dcloudio/uni-app';
import type { Paginated, TaskCard } from '@task-guild/shared';
import { request } from '../../api/client';
import { useAuthStore } from '../../stores/auth';

interface Announcement {
  id: string;
  title: string;
  content: string;
}

const tasks = ref<TaskCard[]>([]);
const announcements = ref<Announcement[]>([]);
const clock = ref('');
const auth = useAuthStore();
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let clockTimer: ReturnType<typeof setInterval> | null = null;

const stats = computed(() => ({
  total: tasks.value.length,
  open: tasks.value.filter((task) => task.status === 'open').length,
  inProgress: tasks.value.filter((task) => task.status === 'in_progress').length,
  pendingReview: tasks.value.filter((task) => task.status === 'pending_review').length,
  overdue: tasks.value.filter((task) => task.overdue || task.status !== 'completed' && task.status !== 'cancelled' && new Date(task.deadlineAt).getTime() < Date.now()).length,
}));

const openTasks = computed(() => tasks.value.filter((task) => task.status === 'open'));
const inProgressTasks = computed(() => tasks.value.filter((task) => task.status === 'in_progress'));
const pendingReviewTasks = computed(() => tasks.value.filter((task) => task.status === 'pending_review'));

async function loadTasks() {
  const result = await request<Paginated<TaskCard>>({
    url: '/tasks?page=1&pageSize=50&sort=newest',
  });
  tasks.value = result.items;
}

async function loadAnnouncements() {
  announcements.value = await request<Announcement[]>({ url: '/announcements' });
}

function updateClock() {
  const now = new Date();
  clock.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

async function manualRefresh() {
  try {
    await Promise.all([loadTasks(), loadAnnouncements()]);
    uni.showToast({ title: '大屏已刷新', icon: 'success' });
  } catch {
    uni.showToast({ title: '刷新失败，请稍后重试', icon: 'none' });
  }
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

onShow(() => {
  updateClock();
  void loadTasks();
  void loadAnnouncements();
  refreshTimer = setInterval(() => {
    void loadTasks();
    void loadAnnouncements();
  }, 2 * 60 * 60 * 1000);
  clockTimer = setInterval(updateClock, 60000);
});

onUnload(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  if (clockTimer) {
    clearInterval(clockTimer);
  }
});
</script>

<style scoped>
.display {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 72% -8%, rgba(224, 170, 60, 0.22), transparent 34%),
    radial-gradient(circle at 8% 108%, rgba(75, 195, 210, 0.17), transparent 32%),
    linear-gradient(145deg, #0e1118 0%, #121723 58%, #0c1017 100%);
}
.ambient {
  position: fixed;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  filter: blur(28px);
  opacity: 0.46;
  pointer-events: none;
  animation: float 8s ease-in-out infinite;
}
.ambient-a { left: 8%; top: 12%; background: rgba(224, 170, 60, 0.20); }
.ambient-b { right: 8%; bottom: 8%; background: rgba(75, 195, 210, 0.15); animation-delay: -4s; }
@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-18px) scale(1.06); }
}
.display-shell {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding: 24px;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 20px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 16px;
}
.sigil {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  color: #241a08;
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 800;
  background: linear-gradient(145deg, #f2cf77, #c8902c 60%, #8a5f1a);
  box-shadow: 0 12px 30px rgba(224, 170, 60, 0.22);
}
.brand-title {
  display: block;
  font-family: var(--font-display);
  font-size: 28px;
  letter-spacing: 0.04em;
}
.brand-sub {
  display: block;
  margin-top: 5px;
  color: #8d98ad;
  font-size: 12px;
  letter-spacing: 3px;
}
.top-right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.refresh-btn {
  height: 38px;
  padding: 0 15px;
  border-radius: 11px;
  display: inline-flex;
  align-items: center;
  color: #241a08;
  font-size: 13px;
  font-weight: 700;
  background: linear-gradient(180deg, #e6bb5c, #c8902c);
  border: 1px solid rgba(224, 170, 60, 0.32);
  box-shadow: 0 7px 16px rgba(224, 170, 60, 0.18);
  transition: transform 180ms ease, box-shadow 180ms ease;
}
.refresh-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 11px 22px rgba(224, 170, 60, 0.24);
}
.live-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #54c596;
  box-shadow: 0 0 0 8px rgba(84, 197, 150, 0.12), 0 0 22px rgba(84, 197, 150, 0.5);
  animation: pulse 1.8s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.16); }
}
.clock {
  font-family: var(--font-display);
  color: #eef1f8;
  font-size: 20px;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
  margin-bottom: 18px;
}
.metric {
  padding: 20px;
  border-radius: 18px;
  background: rgba(24, 29, 40, 0.50);
  border: 1px solid rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(22px) saturate(140%);
}
.metric-value {
  display: block;
  font-family: var(--font-display);
  font-size: 44px;
  color: #f2c26e;
}
.metric-label {
  display: block;
  margin-top: 8px;
  color: #9aa5bb;
  font-size: 14px;
}
.metric.accent .metric-value { color: #f2ce85; }
.metric.warn .metric-value { color: #f0a45f; }
.metric.danger .metric-value { color: #ff9b92; }
.board {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 0.62fr;
  gap: 14px;
  min-height: calc(100vh - 170px);
}
.column,
.side-panel {
  min-height: 0;
  border-radius: 18px;
  background: rgba(24, 29, 40, 0.44);
  border: 1px solid rgba(255, 255, 255, 0.09);
  backdrop-filter: blur(20px) saturate(130%);
  padding: 16px;
}
.column-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.column-title {
  font-family: var(--font-display);
  font-size: 20px;
  color: #f2ce85;
  letter-spacing: 1px;
}
.column-count {
  min-width: 30px;
  height: 30px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.07);
  color: #c8d0e0;
  font-size: 14px;
}
.task-scroll {
  height: calc(100vh - 250px);
}
.task-card {
  margin-bottom: 12px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.09);
}
.task-top,
.task-meta,
.deadline-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.progress-track {
  height: 7px;
  margin-top: 10px;
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
  font-size: 18px;
  line-height: 1.4;
}
.task-meta,
.deadline-row {
  margin-top: 10px;
  color: #8d98ad;
  font-size: 13px;
}
.side-panel {
  padding: 18px;
}
.panel-title {
  font-family: var(--font-display);
  font-size: 20px;
  color: #f2ce85;
  margin-bottom: 16px;
}
.announcement {
  margin-bottom: 16px;
}
.announcement-title {
  display: block;
  font-size: 15px;
  color: #eef1f8;
  font-weight: 700;
}
.announcement-content {
  display: block;
  margin-top: 6px;
  color: #9aa5bb;
  font-size: 13px;
  line-height: 1.5;
}
.empty {
  color: #8d98ad;
  font-size: 13px;
}
</style>
