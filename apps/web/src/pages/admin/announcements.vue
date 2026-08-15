<template>
  <view class="page">
    <text class="page-title">公告管理</text>
    <view class="form">
      <input v-model="title" class="field" placeholder="公告标题" />
      <textarea v-model="content" class="field area" placeholder="公告内容" />
      <view class="row">
        <text>置顶</text>
        <switch :checked="pinned" @change="onPinnedChange" />
      </view>
      <button class="btn primary" @tap="create">发布公告</button>
    </view>
    <view v-for="item in items" :key="item.id" class="card">
      <view class="head">
        <text class="name">{{ item.isPinned ? '📌 ' : '' }}{{ item.title }}</text>
        <text class="del" @tap="remove(item.id)">删除</text>
      </view>
      <text class="content">{{ item.content }}</text>
      <text class="meta">{{ item.author?.nickname }} · {{ formatDate(item.publishedAt) }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request } from '../../api/client';

interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  publishedAt: string;
  author: { nickname: string } | null;
}

const items = ref<Announcement[]>([]);
const title = ref('');
const content = ref('');
const pinned = ref(false);

async function load() {
  items.value = await request<Announcement[]>({ url: '/announcements' });
}

async function create() {
  if (!title.value || !content.value) {
    uni.showToast({ title: '请填写标题与内容', icon: 'none' });
    return;
  }
  await request({
    url: '/announcements',
    method: 'POST',
    data: { title: title.value, content: content.value, isPinned: pinned.value },
  });
  title.value = '';
  content.value = '';
  pinned.value = false;
  await load();
}

async function remove(id: string) {
  await request({ url: `/announcements/${id}`, method: 'DELETE' });
  await load();
}

function onPinnedChange(event: Event) {
  pinned.value = (event as unknown as { detail: { value: boolean } }).detail.value;
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
.page-title {
  font-family: var(--font-display);
  font-size: var(--font-lg);
  font-weight: 700;
}
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: var(--space-4) 0;
}
.field {
  border: 1px solid var(--color-border);
  background: var(--card-bg);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}
.area {
  height: 80px;
}
.row,
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.btn {
  border-radius: var(--radius-md);
  font-weight: 600;
}
.btn.primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
}
.card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}
.name {
  font-weight: 700;
}
.del {
  color: var(--color-danger);
  font-size: var(--font-xs);
}
.content {
  display: block;
  margin: var(--space-2) 0;
  color: var(--color-ink-muted);
}
.meta {
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
.field {
  background: rgba(255, 255, 255, 0.055);
  border-color: rgba(148, 163, 190, 0.20);
  backdrop-filter: blur(14px) saturate(130%);
}
.card {
  position: relative;
  background: var(--texture-paper);
  border: 1px solid var(--color-border);
  border-radius: 2px 14px 2px 14px;
  box-shadow: var(--shadow-sm);
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
.btn.primary {
  background: var(--texture-brass);
  border: 1px solid #7e5818;
}
</style>
