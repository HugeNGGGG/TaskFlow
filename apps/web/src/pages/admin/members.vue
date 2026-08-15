<template>
  <view class="page">
    <text class="page-title">人员管理</text>
    <view class="form">
      <input v-model="form.username" class="field" placeholder="账号" />
      <input v-model="form.password" class="field" type="password" placeholder="初始密码（≥6 位）" />
      <input v-model="form.nickname" class="field" placeholder="昵称" />
      <picker :range="roleNames" :value="roleIndex" @change="onRole">
        <view class="field">角色：{{ roleNames[roleIndex] }}</view>
      </picker>
      <button class="btn primary" @tap="create">添加成员</button>
    </view>

    <view v-for="user in users" :key="user.id" class="card">
      <text class="name">{{ user.nickname }}（{{ user.username }}）</text>
      <text class="meta">{{ user.department?.name ?? '未分配部门' }}</text>
      <view class="actions">
        <picker :range="roleNames" :value="roleIndexOf(user.roleMask)" @change="changeRole(user.id, $event)">
          <text class="link">改角色：{{ roleNames[roleIndexOf(user.roleMask)] }}</text>
        </picker>
        <text class="link danger" @tap="resetPassword(user.id)">重置密码</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request } from '../../api/client';

interface UserRow {
  id: string;
  username: string;
  nickname: string;
  roleMask: number;
  department: { name: string } | null;
}

const roleNames = ['冒险者', '发布官', '管理员'];
const roleMasks = [1, 2, 4];
const users = ref<UserRow[]>([]);
const roleIndex = ref(0);
const form = reactive({ username: '', password: '', nickname: '' });

function roleIndexOf(mask: number): number {
  if (mask & 4) return 2;
  if (mask & 2) return 1;
  return 0;
}

function onRole(event: { detail: { value: string | number } }) {
  roleIndex.value = Number(event.detail.value);
}

async function load() {
  users.value = await request<UserRow[]>({ url: '/users' });
}

async function create() {
  if (!form.username || form.password.length < 6 || !form.nickname) {
    uni.showToast({ title: '请完整填写账号、密码与昵称', icon: 'none' });
    return;
  }
  await request({
    url: '/users',
    method: 'POST',
    data: {
      username: form.username,
      password: form.password,
      nickname: form.nickname,
      roleMask: roleMasks[roleIndex.value],
    },
  });
  form.username = '';
  form.password = '';
  form.nickname = '';
  await load();
}

async function changeRole(id: string, event: { detail: { value: string | number } }) {
  await request({
    url: `/users/${id}/roles`,
    method: 'PATCH',
    data: { roleMask: roleMasks[Number(event.detail.value)] },
  });
  await load();
}

function resetPassword(id: string) {
  uni.showModal({
    title: '重置密码',
    editable: true,
    placeholderText: '输入新密码（≥6 位）',
    success: async (result) => {
      if (result.confirm && result.content && result.content.length >= 6) {
        await request({
          url: `/users/${id}/reset-password`,
          method: 'POST',
          data: { password: result.content },
        });
        uni.showToast({ title: '已重置', icon: 'success' });
      }
    },
  });
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
  display: block;
}
.meta {
  color: var(--color-ink-muted);
  font-size: var(--font-xs);
  display: block;
  margin-top: 2px;
}
.actions {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-2);
}
.link {
  color: var(--color-brass);
  font-size: var(--font-sm);
}
.link.danger {
  color: var(--color-danger);
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
