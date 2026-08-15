<template>
  <view class="page">
    <view class="title">我的委托</view>
    <view v-if="tasks.length === 0" class="empty">还没有接取任何委托。</view>
    <view v-for="task in tasks" :key="task.id" class="card" @tap="goDetail(task.id)">
      <view class="row">
        <text class="name">{{ task.title }}</text>
        <text class="badge" :class="statusClass(task.status)">{{ statusText(task.status) }}</text>
      </view>
      <view class="meta">
        <text>难度 {{ task.difficulty }} · +{{ task.xpReward }} XP</text>
        <text>截止 {{ formatDate(task.deadlineAt) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import type { TaskCard, TaskStatus } from '@task-guild/shared';
import { request } from '../../api/client';

const tasks = ref<TaskCard[]>([]);

async function load() {
  tasks.value = await request<TaskCard[]>({ url: '/tasks/mine' });
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/task/detail?id=${id}` });
}

function formatDate(value: string): string {
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function statusClass(status: TaskStatus): string {
  return status === 'completed' ? 'ok' : status === 'pending_review' ? 'warn' : 'info';
}

function statusText(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    draft: '草稿',
    open: '待接取',
    in_progress: '进行中',
    pending_review: '待审核',
    completed: '已结',
    cancelled: '取消',
  };
  return map[status];
}

onShow(() => {
  void load();
});
</script>

<style scoped>
.page {
  padding: var(--space-4);
}
.title {
  font-family: var(--font-display);
  font-size: var(--font-lg);
  font-weight: 700;
  margin-bottom: var(--space-4);
}
.empty {
  color: var(--color-ink-muted);
  padding: var(--space-6);
  text-align: center;
}
.card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
  box-shadow: var(--shadow-sm);
}
.row,
.meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.name {
  font-family: var(--font-display);
  font-weight: 700;
}
.badge {
  font-size: var(--font-xs);
  padding: 2px var(--space-3);
  border-radius: var(--radius-pill);
  color: #fff;
}
.badge.ok {
  background: var(--color-success);
}
.badge.warn {
  background: var(--color-brass);
}
.badge.info {
  background: var(--color-leather);
}
.meta {
  margin-top: var(--space-2);
  color: var(--color-ink-muted);
  font-size: var(--font-xs);
}
</style>

<style scoped>
.page {
  background:
    radial-gradient(circle at 50% 0%, rgba(224, 170, 60, 0.14), transparent 42%),
    radial-gradient(circle at 8% 100%, rgba(75, 195, 210, 0.10), transparent 32%),
    var(--color-bg);
  min-height: 100vh;
}
.title {
  letter-spacing: 3px;
  color: #f2ce85;
}
.card {
  position: relative;
  background: var(--texture-paper);
  border: 1px solid rgba(148, 163, 190, 0.16);
  border-radius: 14px;
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(18px) saturate(130%);
  transition: transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease;
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
.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: rgba(224, 170, 60, 0.30);
}
.card:active {
  transform: translateY(2px) scale(0.99);
  box-shadow: var(--shadow-pressed);
}
.name {
  letter-spacing: 1px;
}
.badge {
  letter-spacing: 1px;
  box-shadow: var(--shadow-sm);
  background: var(--badge-success-bg);
}
</style>
