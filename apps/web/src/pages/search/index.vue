<template>
  <view class="search-page">
    <view class="search-bar">
      <input v-model="keyword" class="search-input" placeholder="搜索任务、编号或成员" confirm-type="search" @confirm="search" />
      <view class="search-btn" @tap="search">搜索</view>
    </view>

    <view v-if="searched" class="section">
      <text class="section-title">任务结果</text>
      <view v-for="task in tasks" :key="task.id" class="result-card" @tap="goTask(task.id)">
        <view class="result-head">
          <text class="result-title">{{ task.title }}</text>
          <text class="result-badge">{{ task.difficulty }}</text>
        </view>
        <text class="result-meta">{{ task.taskNo }} · {{ task.categoryName ?? '未分类' }} · 截止 {{ formatDate(task.deadlineAt) }}</text>
      </view>
      <text v-if="tasks.length === 0" class="empty">没有找到相关任务。</text>
    </view>

    <view v-if="searched" class="section">
      <text class="section-title">成员结果</text>
      <view v-for="member in members" :key="member.id" class="member-card">
        <text class="member-name">{{ member.nickname }}</text>
        <text class="member-meta">@{{ member.username }} · {{ member.department?.name ?? '未分配部门' }}</text>
      </view>
      <text v-if="members.length === 0" class="empty">没有找到相关成员。</text>
    </view>

    <view v-if="!searched" class="empty-state">
      输入关键词，搜索任务编号、标题、描述或成员昵称。
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { request } from '../../api/client';

interface TaskSearchResult {
  id: string;
  taskNo: string;
  title: string;
  difficulty: string;
  status: string;
  deadlineAt: string;
  categoryName: string | null;
}

interface MemberSearchResult {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string | null;
  department: { name: string } | null;
}

const keyword = ref('');
const tasks = ref<TaskSearchResult[]>([]);
const members = ref<MemberSearchResult[]>([]);
const searched = ref(false);

async function search() {
  const q = keyword.value.trim();
  if (!q) {
    uni.showToast({ title: '请输入搜索内容', icon: 'none' });
    return;
  }
  const result = await request<{
    tasks: TaskSearchResult[];
    members: MemberSearchResult[];
  }>({ url: `/search?q=${encodeURIComponent(q)}` });
  tasks.value = result.tasks;
  members.value = result.members;
  searched.value = true;
}

function goTask(id: string) {
  uni.navigateTo({ url: `/pages/task/detail?id=${id}` });
}

function formatDate(value: string): string {
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
</script>

<style scoped>
.search-page {
  min-height: 100vh;
  padding: 20px;
  background:
    radial-gradient(circle at 72% -8%, rgba(224, 170, 60, 0.18), transparent 34%),
    radial-gradient(circle at 8% 108%, rgba(75, 195, 210, 0.14), transparent 32%),
    linear-gradient(145deg, #0e1118 0%, #121723 58%, #0c1017 100%);
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}
.search-input {
  flex: 1;
  height: 46px;
  padding: 0 14px;
  border-radius: 13px;
  color: #eef1f8;
  background: rgba(24, 29, 40, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(20px) saturate(140%);
}
.search-btn {
  height: 46px;
  padding: 0 18px;
  border-radius: 13px;
  display: inline-flex;
  align-items: center;
  color: #241a08;
  font-weight: 700;
  background: linear-gradient(180deg, #e6bb5c, #c8902c);
  border: 1px solid rgba(224, 170, 60, 0.32);
}
.section {
  margin-top: 18px;
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
.result-card,
.member-card {
  padding: 13px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.result-title {
  flex: 1;
  font-family: var(--font-display);
  font-size: 16px;
  color: #eef1f8;
}
.result-badge {
  color: #f2ce85;
  font-size: 12px;
  font-weight: 700;
}
.result-meta,
.member-meta {
  display: block;
  margin-top: 7px;
  color: #8d98ad;
  font-size: 13px;
}
.member-name {
  color: #eef1f8;
  font-weight: 700;
}
.empty,
.empty-state {
  color: #8d98ad;
  font-size: 14px;
  text-align: center;
  padding: 24px 0;
}
</style>
