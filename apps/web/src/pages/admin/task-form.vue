<template>
  <view class="page">
    <text class="page-title">{{ isEdit ? '编辑委托' : '发布委托' }}</text>
    <view class="form">
      <input v-model="form.title" class="field" placeholder="标题" />
      <textarea v-model="form.description" class="field area" placeholder="描述" />
      <picker :range="categoryNames" :value="categoryIndex" @change="onCategory">
        <view class="field picker-field">类别：{{ categoryNames[categoryIndex] ?? '未分类' }}</view>
      </picker>
      <picker :range="difficulties" :value="difficultyIndex" @change="onDifficulty">
        <view class="field picker-field">
          难度：{{ difficulties[difficultyIndex] }}（默认 {{ xpDefault }} XP）
        </view>
      </picker>
      <input v-model.number="form.xpReward" class="field" type="number" placeholder="经验奖励（留空用默认值）" />
      <input v-model="form.deadlineAt" class="field" placeholder="截止时间 ISO，如 2026-08-20T18:00:00Z" />
      <picker :range="acceptModes" :value="acceptModeIndex" @change="onAcceptMode">
        <view class="field picker-field">接取模式：{{ acceptModes[acceptModeIndex] }}</view>
      </picker>
      <input v-model.number="form.maxMembers" class="field" type="number" placeholder="人数上限（默认 1）" />
      <view class="switch-row">
        <text>需要审核</text>
        <switch :checked="form.needReview" @change="onNeedReviewChange" />
      </view>
      <view class="switch-row">
        <text>紧急委托</text>
        <switch :checked="form.isUrgent" @change="onUrgentChange" />
      </view>

      <text class="section-title">指派成员</text>
      <view class="members">
        <view
          v-for="user in users"
          :key="user.id"
          class="member-chip"
          :class="{ active: assigneeIds.includes(user.id) }"
          @tap="toggleAssignee(user.id)"
        >
          {{ user.nickname }} {{ assigneeIds.includes(user.id) ? '✓' : '' }}
        </view>
      </view>
      <picker v-if="assigneeIds.length > 1" :range="captainNames" :value="captainIndex" @change="onCaptain">
        <view class="field picker-field">队长：{{ captainNames[captainIndex] ?? '无' }}</view>
      </picker>

      <view class="actions">
        <button class="btn" @tap="save('draft')">存为草稿</button>
        <button class="btn primary" @tap="save('open')">发布</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { DIFFICULTY_XP } from '@task-guild/shared';
import { request } from '../../api/client';

interface UserRow {
  id: string;
  username: string;
  nickname: string;
  departmentId: string | null;
  roleMask: number;
}

interface CategoryRow {
  id: string;
  name: string;
}

const difficulties = ['D', 'C', 'B', 'A', 'S'];
const acceptModes = ['悬赏委托', '指派委托'];
const categories = ref<CategoryRow[]>([]);
const users = ref<UserRow[]>([]);
const isEdit = ref(false);
const editId = ref('');
const categoryIndex = ref(0);
const difficultyIndex = ref(1);
const acceptModeIndex = ref(0);
const captainIndex = ref(0);
const assigneeIds = ref<string[]>([]);
const form = reactive({
  title: '',
  description: '',
  xpReward: undefined as number | undefined,
  deadlineAt: '',
  maxMembers: 1,
  needReview: true,
  isUrgent: false,
});

const categoryNames = computed(() => ['未分类', ...categories.value.map((item) => item.name)]);
const captainNames = computed(() => ['无', ...users.value.filter((item) => assigneeIds.value.includes(item.id)).map((item) => item.nickname)]);
const xpDefault = computed(() => DIFFICULTY_XP[difficulties[difficultyIndex.value] as keyof typeof DIFFICULTY_XP]);

async function loadOptions() {
  categories.value = await request<CategoryRow[]>({ url: '/categories' });
  users.value = await request<UserRow[]>({ url: '/users' });
}

function onCategory(event: { detail: { value: string | number } }) {
  categoryIndex.value = Number(event.detail.value);
}

function onDifficulty(event: { detail: { value: string | number } }) {
  difficultyIndex.value = Number(event.detail.value);
}

function onAcceptMode(event: { detail: { value: string | number } }) {
  acceptModeIndex.value = Number(event.detail.value);
}

function onCaptain(event: { detail: { value: string | number } }) {
  captainIndex.value = Number(event.detail.value);
}

function onNeedReviewChange(event: Event) {
  form.needReview = (event as unknown as { detail: { value: boolean } }).detail.value;
}

function onUrgentChange(event: Event) {
  form.isUrgent = (event as unknown as { detail: { value: boolean } }).detail.value;
}

function toggleAssignee(id: string) {
  const index = assigneeIds.value.indexOf(id);
  if (index >= 0) {
    assigneeIds.value.splice(index, 1);
  } else {
    assigneeIds.value.push(id);
  }
}

function payload(status: 'draft' | 'open') {
  const captain =
    captainIndex.value > 0
      ? users.value.filter((item) => assigneeIds.value.includes(item.id))[captainIndex.value - 1]?.id
      : undefined;
  return {
    title: form.title,
    description: form.description || undefined,
    categoryId: categoryIndex.value > 0 ? categories.value[categoryIndex.value - 1]?.id : undefined,
    difficulty: difficulties[difficultyIndex.value],
    xpReward: form.xpReward || undefined,
    deadlineAt: form.deadlineAt,
    acceptMode: acceptModeIndex.value === 0 ? 'bounty' : 'assigned',
    maxMembers: form.maxMembers || 1,
    needReview: form.needReview,
    isUrgent: form.isUrgent,
    status,
    assigneeIds: acceptModeIndex.value === 1 ? assigneeIds.value : undefined,
    captainId: captain,
  };
}

async function save(status: 'draft' | 'open') {
  if (!form.title || !form.deadlineAt) {
    uni.showToast({ title: '请填写标题与截止时间', icon: 'none' });
    return;
  }
  try {
    if (isEdit.value) {
      await request({
        url: `/tasks/${editId.value}`,
        method: 'PATCH',
        data: payload(status),
      });
    } else {
      await request({ url: '/tasks', method: 'POST', data: payload(status) });
    }
    uni.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 500);
  } catch (error) {
    uni.showToast({ title: (error as { message: string }).message, icon: 'none' });
  }
}

onLoad(async (options) => {
  await loadOptions();
  if (options?.id) {
    isEdit.value = true;
    editId.value = options.id;
    const task = await request<{
      title: string;
      description: string;
      category: { id: string } | null;
      difficulty: keyof typeof DIFFICULTY_XP;
      xpReward: number;
      deadlineAt: string;
      acceptMode: 'bounty' | 'assigned';
      maxMembers: number;
      needReview: boolean;
      isUrgent: boolean;
      assignments: { userId: string }[];
    }>({ url: `/tasks/${options.id}` });
    form.title = task.title;
    form.description = task.description;
    form.xpReward = task.xpReward;
    form.deadlineAt = task.deadlineAt;
    form.maxMembers = task.maxMembers;
    form.needReview = task.needReview;
    form.isUrgent = task.isUrgent;
    acceptModeIndex.value = task.acceptMode === 'bounty' ? 0 : 1;
    difficultyIndex.value = Math.max(0, difficulties.indexOf(task.difficulty));
    if (task.category?.id) {
      categoryIndex.value =
        categories.value.findIndex((item) => item.id === task.category?.id) + 1;
    }
    assigneeIds.value = task.assignments.map((item) => item.userId);
  }
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
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-4);
}
.field {
  border: 1px solid var(--color-border);
  background: var(--card-bg);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}
.area {
  height: 96px;
}
.picker-field {
  color: var(--color-ink);
}
.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
}
.section-title {
  font-family: var(--font-display);
  font-weight: 700;
}
.members {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.member-chip {
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  font-size: var(--font-xs);
}
.member-chip.active {
  background: rgba(224, 170, 60, 0.16);
  color: #f2ce85;
}
.actions {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-4);
}
.btn {
  flex: 1;
  border-radius: var(--radius-md);
  font-weight: 600;
}
.btn.primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
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
  box-shadow: none;
  backdrop-filter: blur(14px) saturate(130%);
}
.section-title {
  letter-spacing: 2px;
  color: var(--color-leather);
}
.member-chip.active {
  background: rgba(224, 170, 60, 0.16);
  color: #f2ce85;
  border-color: rgba(224, 170, 60, 0.22);
  box-shadow: var(--shadow-sm);
}
.btn.primary {
  background: var(--texture-brass);
  border: 1px solid #7e5818;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.35) inset, var(--shadow-sm);
}
.btn.primary:active {
  box-shadow: var(--shadow-pressed);
  transform: translateY(1px);
}
</style>
