<template>
  <view class="board">
    <view class="board-header">
      <view class="board-heading">
        <view class="mini-emblem">
          <text class="mini-emblem-letter">公</text>
        </view>
        <view class="board-heading-text">
          <text class="board-title">公会委托板</text>
          <text class="board-subtitle">{{ total }} 项委托 · 完成有赏</text>
        </view>
      </view>
      <view v-if="auth.isManager" class="publish-btn" @tap="goPublish">
        ✚ 发布委托
      </view>
    </view>

    <view class="ribbon">
      <scroll-view scroll-x class="filter-scroll">
        <view class="filters">
          <view
            v-for="item in categoryChips"
            :key="item.id || 'all'"
            class="chip"
            :class="{ active: categoryId === item.id }"
            @tap="selectCategory(item.id)"
          >
            {{ item.name }}
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="toolbar">
      <input
        v-model="keyword"
        class="search"
        placeholder="搜索委托"
        confirm-type="search"
        @confirm="reload"
      />
      <picker :range="difficultyOptions" :value="difficultyIndex" @change="onDifficulty">
        <view class="picker">{{ difficultyLabel }}</view>
      </picker>
      <view class="chip urgent-chip" :class="{ active: urgentOnly }" @tap="toggleUrgent">
        紧急
      </view>
      <picker :range="sortOptions" :value="sortIndex" @change="onSort">
        <view class="picker">{{ sortLabel }}</view>
      </picker>
    </view>

    <view v-if="loading && tasks.length === 0" class="empty">
      <text class="empty-mark">📜</text>
      <text>正在翻看委托板…</text>
    </view>
    <view v-else-if="tasks.length === 0" class="empty">
      <text class="empty-mark">✦</text>
      <text>公会布告栏暂时空空如也，等待新的委托张贴。</text>
    </view>
    <view v-else class="card-grid">
      <view
        v-for="task in tasks"
        :key="task.id"
        class="quest-card"
        :class="{ urgent: task.isUrgent, overdue: task.overdue }"
        @tap="goDetail(task.id)"
      >
        <view v-if="task.isUrgent" class="urgent-ribbon">紧急委托</view>
        <view class="quest-head">
          <text class="quest-no">{{ task.taskNo }}</text>
          <text class="quest-difficulty">难度 {{ task.difficulty }}</text>
        </view>
        <text class="quest-title">{{ task.title }}</text>
        <view class="quest-category-row">
          <view class="category-dot" />
          <text class="quest-category">{{ task.categoryName ?? '未分类' }}</text>
        </view>
        <view class="quest-meta">
          <text class="xp">+{{ task.xpReward }} XP</text>
          <text class="deadline">截止 {{ formatDate(task.deadlineAt) }}</text>
        </view>
        <view class="quest-foot">
          <view class="seal" :class="statusClass(task.status)">
            <text>{{ statusText(task.status, task.overdue) }}</text>
          </view>
          <text class="slots">{{ task.acceptCount }}/{{ task.maxMembers }} 人</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app';
import type { Paginated, TaskCard, TaskStatus } from '@task-guild/shared';
import { request } from '../../api/client';
import { useAuthStore } from '../../stores/auth';

interface Category {
  id: string;
  name: string;
}

const auth = useAuthStore();
const tasks = ref<TaskCard[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 12;
const loading = ref(false);
const keyword = ref('');
const categoryId = ref('');
const categories = ref<Category[]>([]);
const urgentOnly = ref(false);
const difficultyIndex = ref(0);
const difficultyOptions = ['全部难度', 'D', 'C', 'B', 'A', 'S'];
const sortIndex = ref(0);
const sortOptions = ['最新', '最紧急', '奖励最高'];

const categoryChips = computed(() => [
  { id: '', name: '全部' },
  ...categories.value,
]);
const difficultyLabel = computed(() => difficultyOptions[difficultyIndex.value]);
const sortLabel = computed(() => sortOptions[sortIndex.value]);

async function loadCategories() {
  categories.value = await request<Category[]>({ url: '/categories' });
}

async function reload() {
  page.value = 1;
  tasks.value = [];
  await loadPage();
}

async function loadPage() {
  if (loading.value) {
    return;
  }
  loading.value = true;
  try {
    const params: string[] = [
      `page=${page.value}`,
      `pageSize=${pageSize}`,
    ];
    if (categoryId.value) {
      params.push(`categoryId=${encodeURIComponent(categoryId.value)}`);
    }
    if (difficultyIndex.value > 0) {
      params.push(`difficulty=${difficultyOptions[difficultyIndex.value]}`);
    }
    if (urgentOnly.value) {
      params.push('urgent=true');
    }
    if (keyword.value) {
      params.push(`keyword=${encodeURIComponent(keyword.value)}`);
    }
    params.push(`sort=${['newest', 'deadline', 'reward'][sortIndex.value]}`);
    const result = await request<Paginated<TaskCard>>({
      url: `/tasks?${params.join('&')}`,
    });
    tasks.value = page.value === 1 ? result.items : [...tasks.value, ...result.items];
    total.value = result.total;
    page.value += 1;
  } catch (error) {
    uni.showToast({ title: (error as { message: string }).message, icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function selectCategory(id: string) {
  categoryId.value = id;
  void reload();
}

function onDifficulty(event: { detail: { value: string | number } }) {
  difficultyIndex.value = Number(event.detail.value);
  void reload();
}

function onSort(event: { detail: { value: string | number } }) {
  sortIndex.value = Number(event.detail.value);
  void reload();
}

function toggleUrgent() {
  urgentOnly.value = !urgentOnly.value;
  void reload();
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/task/detail?id=${id}` });
}

function goPublish() {
  uni.navigateTo({ url: '/pages/admin/task-form' });
}

function formatDate(value: string): string {
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function statusClass(status: TaskStatus): string {
  if (status === 'completed') return 'seal-done';
  if (status === 'pending_review') return 'seal-review';
  if (status === 'cancelled') return 'seal-cancel';
  return 'seal-open';
}

function statusText(status: TaskStatus, overdue: boolean): string {
  if (status === 'completed') return '已结';
  if (status === 'cancelled') return '取消';
  if (status === 'pending_review') return '待审';
  if (overdue) return '逾期';
  if (status === 'open') return '可接';
  return '进行中';
}

onShow(() => {
  void loadCategories();
  void reload();
});

onReachBottom(() => {
  void loadPage();
});

onPullDownRefresh(async () => {
  await reload();
  uni.stopPullDownRefresh();
});
</script>

<style scoped>
.board {
  min-height: 100vh;
  padding-bottom: var(--space-7);
  background:
    radial-gradient(circle at 50% 0%, rgba(224, 170, 60, 0.14), transparent 42%),
    radial-gradient(circle at 8% 100%, rgba(75, 195, 210, 0.10), transparent 32%),
    var(--color-bg);
}
.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--texture-wood);
  padding: var(--space-4) var(--space-4) 18px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.14) inset,
    0 8px 18px rgba(43, 33, 24, 0.18);
  position: relative;
}
.board-header::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: repeating-linear-gradient(
    90deg,
    var(--color-brass) 0 12px,
    transparent 12px 24px
  );
  opacity: 0.55;
}
.board-heading {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.mini-emblem {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--texture-brass);
  border: 1px solid rgba(255, 255, 255, 0.10);
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}
.mini-emblem-letter {
  font-family: var(--font-display);
  font-weight: 700;
  color: #241a08;
  font-size: var(--font-base);
}
.board-heading-text {
  display: flex;
  flex-direction: column;
}
.board-title {
  font-family: var(--font-display);
  font-size: var(--font-lg);
  color: var(--header-text);
  letter-spacing: 3px;
  font-weight: 700;
}
.board-subtitle {
  color: #aeb7c9;
  font-size: var(--font-xs);
  margin-top: 1px;
  letter-spacing: 1px;
}
.publish-btn {
  background: var(--texture-brass);
  color: var(--btn-primary-text);
  padding: 9px 14px;
  border-radius: var(--radius-md);
  font-weight: 700;
  font-size: var(--font-xs);
  border: 1px solid rgba(224, 170, 60, 0.32);
  box-shadow: 0 8px 18px rgba(224, 170, 60, 0.18);
  transition: transform 180ms ease, box-shadow 180ms ease;
}
.publish-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(224, 170, 60, 0.24);
}
.publish-btn:active {
  box-shadow: var(--shadow-pressed);
  transform: translateY(1px) scale(0.98);
}
.ribbon {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  box-shadow: 0 3px 8px rgba(74, 52, 30, 0.06);
}
.filter-scroll {
  white-space: nowrap;
}
.filters {
  display: inline-flex;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
}
.chip {
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  border: 1px solid rgba(148, 163, 190, 0.20);
  color: var(--color-ink-muted);
  font-size: var(--font-sm);
  background: rgba(255, 255, 255, 0.045);
  transition: all 180ms ease;
}
.chip:hover {
  background: rgba(255, 255, 255, 0.09);
  transform: translateY(-1px);
}
.chip.active {
  background: linear-gradient(90deg, rgba(224, 170, 60, 0.16), rgba(224, 170, 60, 0.03));
  color: #f2ce85;
  border-color: rgba(224, 170, 60, 0.20);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.14);
}
.toolbar {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}
.search {
  flex: 1;
  border: 1px solid rgba(148, 163, 190, 0.20);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.055);
  color: var(--color-ink);
  backdrop-filter: blur(14px) saturate(130%);
}
.picker {
  padding: 7px 8px;
  color: var(--color-ink-muted);
  font-size: var(--font-xs);
}
.urgent-chip {
  color: var(--color-danger);
  border-color: rgba(236, 116, 108, 0.30);
}
.urgent-chip.active {
  background: rgba(236, 116, 108, 0.16);
  color: #ffb2a8;
  border-color: rgba(236, 116, 108, 0.28);
}
.empty {
  padding: var(--space-7) var(--space-4);
  text-align: center;
  color: var(--color-ink-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  letter-spacing: 1px;
}
.empty-mark {
  font-size: 34px;
  color: var(--color-brass);
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
  padding: var(--space-5) var(--space-4);
}
.quest-card {
  position: relative;
  background: var(--texture-paper);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: var(--shadow-sm);
  padding: 18px 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  overflow: hidden;
  transition: transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease;
  backdrop-filter: blur(18px) saturate(130%);
}
.quest-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--color-brass), transparent 75%);
}
.quest-card:active {
  transform: translateY(2px) scale(0.99);
  box-shadow: var(--shadow-pressed);
}
.quest-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: rgba(224, 170, 60, 0.30);
}
.quest-card.overdue {
  border-color: rgba(160, 59, 48, 0.65);
}
.urgent-ribbon {
  position: absolute;
  top: 0;
  right: 0;
  background: linear-gradient(135deg, #ec746c, #d75a55);
  color: #fff;
  font-size: var(--font-xs);
  padding: 3px 12px;
  border-bottom-left-radius: 12px;
  letter-spacing: 1px;
  box-shadow: 0 2px 6px rgba(160, 59, 48, 0.28);
}
.quest-head {
  display: flex;
  justify-content: space-between;
  color: var(--color-ink-muted);
  font-size: var(--font-xs);
  letter-spacing: 1px;
}
.quest-difficulty {
  color: var(--color-brass);
  font-weight: 700;
}
.quest-title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--color-ink);
  line-height: 1.35;
}
.quest-category-row {
  display: flex;
  align-items: center;
  gap: 5px;
}
.category-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-moss);
}
.quest-category {
  font-size: var(--font-xs);
  color: var(--color-ink-muted);
}
.quest-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  font-size: var(--font-xs);
}
.xp {
  color: var(--color-brass);
  font-weight: 700;
  letter-spacing: 0.5px;
}
.deadline {
  color: var(--color-ink-muted);
}
.quest-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px dashed rgba(107, 74, 47, 0.28);
}
.seal {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 3px double currentColor;
  color: var(--color-leather);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: var(--font-xs);
  font-weight: 700;
  transform: rotate(-8deg);
  background: rgba(255, 255, 255, 0.06);
}
.seal-done {
  color: var(--color-moss);
}
.seal-review {
  color: var(--color-brass);
}
.seal-open {
  color: var(--color-leather);
}
.seal-cancel {
  color: var(--color-ink-muted);
  opacity: 0.65;
}
.slots {
  color: var(--color-ink-muted);
  font-size: var(--font-xs);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 768px) {
  .card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
