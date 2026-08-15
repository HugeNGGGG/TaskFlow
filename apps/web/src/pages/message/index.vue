<template>
  <view class="page">
    <view class="head">
      <text class="title">消息中心</text>
      <text class="action" @tap="readAll">全部已读</text>
    </view>
    <view v-if="items.length === 0" class="empty">暂无消息。</view>
    <view
      v-for="item in items"
      :key="item.id"
      class="card"
      :class="{ unread: !item.isRead }"
      @tap="readOne(item.id)"
    >
      <text class="name">{{ item.title }}</text>
      <text class="content">{{ item.content }}</text>
      <text class="time">{{ formatDate(item.createdAt) }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import type { NotificationView } from '@task-guild/shared';
import { request } from '../../api/client';

const items = ref<NotificationView[]>([]);

async function load() {
  const result = await request<NotificationView[]>({ url: '/notifications' });
  items.value = result.map((item) => ({
    ...item,
    createdAt: item.createdAt,
  }));
}

async function readAll() {
  await request({ url: '/notifications/read-all', method: 'POST' });
  await load();
}

async function readOne(id: string) {
  await request({ url: `/notifications/${id}/read`, method: 'PATCH' });
  await load();
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

onShow(() => {
  void load();
});
</script>

<style scoped>
.page {
  padding: var(--space-4);
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-family: var(--font-display);
  font-size: var(--font-lg);
  font-weight: 700;
}
.action {
  color: var(--color-brass);
  font-size: var(--font-sm);
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
  margin-top: var(--space-3);
}
.card.unread {
  border-left: 4px solid var(--color-brass);
}
.name,
.content,
.time {
  display: block;
}
.name {
  font-weight: 700;
}
.content {
  color: var(--color-ink-muted);
  margin-top: var(--space-1);
  font-size: var(--font-sm);
}
.time {
  color: var(--color-ink-muted);
  font-size: var(--font-xs);
  margin-top: var(--space-2);
}
</style>

<style scoped>
.page {
  background:
    radial-gradient(circle at 50% 0%, rgba(192, 140, 46, 0.08), transparent 42%),
    var(--color-bg);
  min-height: 100vh;
}
.title {
  letter-spacing: 3px;
  color: var(--color-leather);
}
.card {
  position: relative;
  background: var(--texture-paper);
  border: 1px solid var(--color-border);
  border-radius: 2px 14px 2px 14px;
  box-shadow: var(--shadow-sm);
}
.card.unread {
  border-left: 4px solid var(--color-brass);
}
</style>
