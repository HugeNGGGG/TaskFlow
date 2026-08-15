<template>
  <view class="profile-page">
    <view class="glow glow-a" />
    <view class="glow glow-b" />

    <view class="profile-card">
      <view class="avatar">{{ initials }}</view>
      <view class="identity">
        <text class="name">{{ auth.user?.nickname }}</text>
        <text class="username">@{{ auth.user?.username }}</text>
        <view class="identity-meta">
          <text class="role-chip">{{ roleName }}</text>
          <text class="dept">{{ departmentName }}</text>
        </view>
      </view>
      <view class="level-block">
        <text class="level-value">Lv.{{ stats?.level ?? 1 }}</text>
        <text class="level-name">{{ stats?.levelName ?? '见习冒险者' }}</text>
      </view>
    </view>

    <view class="stats-grid">
      <view class="stat-card">
        <text class="stat-value">{{ stats?.totalXp ?? 0 }}</text>
        <text class="stat-label">总经验</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ stats?.points ?? 0 }}</text>
        <text class="stat-label">积分</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ stats?.completedCount ?? 0 }}</text>
        <text class="stat-label">已完成</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ completionRate }}%</text>
        <text class="stat-label">完成率</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ onTimeRate }}%</text>
        <text class="stat-label">按时率</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">称号与徽章</text>
      <view class="titles">
        <view v-for="title in titles" :key="title.id" class="title-chip">
          {{ title.name }}
        </view>
        <text v-if="titles.length === 0" class="muted">尚未获得称号，去完成第一单委托吧。</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">战绩明细</text>
      <view class="detail-row">
        <text class="detail-label">已接取委托</text>
        <text class="detail-value">{{ stats?.acceptedCount ?? 0 }}</text>
      </view>
      <view class="detail-row">
        <text class="detail-label">按时完成</text>
        <text class="detail-value">{{ stats?.onTimeCount ?? 0 }}</text>
      </view>
      <view class="detail-row">
        <text class="detail-label">逾期次数</text>
        <text class="detail-value">{{ stats?.overdueCount ?? 0 }}</text>
      </view>
      <view class="detail-row">
        <text class="detail-label">连续周数</text>
        <text class="detail-value">{{ stats?.streakWeeks ?? 0 }}</text>
      </view>
    </view>

    <view class="section">
      <view class="nav-row" @tap="goSettings">
        <text>个人设置</text>
        <text class="arrow">›</text>
      </view>
      <view class="nav-row" @tap="goRank">
        <text>排行榜</text>
        <text class="arrow">›</text>
      </view>
      <view v-if="auth.isManager" class="nav-row" @tap="goAdmin('/pages/admin/overview')">
        <text>总览看板</text>
        <text class="arrow">›</text>
      </view>
      <view v-if="auth.isManager" class="nav-row" @tap="goAdmin('/pages/admin/stats')">
        <text>员工统计</text>
        <text class="arrow">›</text>
      </view>
      <view v-if="auth.isAdmin" class="nav-row" @tap="goAdmin('/pages/admin/members')">
        <text>人员管理</text>
        <text class="arrow">›</text>
      </view>
      <view v-if="auth.isAdmin" class="nav-row" @tap="goAdmin('/pages/admin/settings')">
        <text>系统设置</text>
        <text class="arrow">›</text>
      </view>
      <view class="nav-row danger" @tap="logout">
        <text>退出登录</text>
        <text class="arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import type { MyStats, TitleInfo } from '@task-guild/shared';
import { request } from '../../api/client';
import { useAuthStore } from '../../stores/auth';

const auth = useAuthStore();
const stats = ref<MyStats | null>(null);
const titles = ref<TitleInfo[]>([]);

const initials = computed(() => (auth.user?.nickname ?? '公').slice(0, 1));
const roleName = computed(() => {
  if ((auth.user?.roleMask ?? 0) & 4) return '大管理员';
  if ((auth.user?.roleMask ?? 0) & 2) return '发布官 / 会长';
  return '冒险者';
});
const departmentName = computed(() => {
  const user = auth.user as unknown as { department?: { name?: string } } | null;
  return user?.department?.name ?? '未分配部门';
});
const completionRate = computed(() => Math.round((stats.value?.completionRate ?? 0) * 100));
const onTimeRate = computed(() => Math.round((stats.value?.onTimeRate ?? 0) * 100));

async function load() {
  stats.value = await request<MyStats>({ url: '/stats/me' });
  titles.value = await request<TitleInfo[]>({ url: '/gamification/me' });
}

function goRank() {
  uni.navigateTo({ url: '/pages/me/rank' });
}

function goSettings() {
  uni.navigateTo({ url: '/pages/me/settings' });
}

function goAdmin(url: string) {
  uni.navigateTo({ url });
}

function logout() {
  uni.showModal({
    title: '退出登录',
    content: '确认退出公会？',
    success: (result) => {
      if (result.confirm) {
        auth.logout();
        uni.reLaunch({ url: '/pages/login/login' });
      }
    },
  });
}

onShow(() => {
  void load();
});
</script>

<style scoped>
.profile-page {
  position: relative;
  min-height: 100vh;
  padding: 22px 20px 36px;
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
.profile-card {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 26px;
  border-radius: 24px;
  background: rgba(24, 29, 40, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(26px) saturate(150%);
  box-shadow: 0 22px 58px rgba(0, 0, 0, 0.24);
}
.avatar {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #241a08;
  font-family: var(--font-display);
  font-size: 34px;
  font-weight: 800;
  background: linear-gradient(145deg, #f2cf77, #c8902c 60%, #8a5f1a);
  box-shadow: 0 12px 28px rgba(224, 170, 60, 0.22);
}
.identity {
  flex: 1;
  min-width: 0;
}
.name {
  display: block;
  font-family: var(--font-display);
  font-size: 28px;
  letter-spacing: 0.02em;
}
.username {
  display: block;
  margin-top: 5px;
  color: #8d98ad;
  font-size: 13px;
}
.identity-meta {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 14px;
}
.role-chip {
  padding: 5px 10px;
  border-radius: 999px;
  color: #f2ce85;
  font-size: 12px;
  background: rgba(224, 170, 60, 0.13);
  border: 1px solid rgba(224, 170, 60, 0.23);
}
.dept {
  color: #9aa5bb;
  font-size: 12px;
}
.level-block {
  min-width: 110px;
  text-align: right;
}
.level-value {
  display: block;
  font-family: var(--font-display);
  font-size: 26px;
  color: #f2c26e;
}
.level-name {
  display: block;
  margin-top: 5px;
  color: #8d98ad;
  font-size: 12px;
}
.stats-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-top: 16px;
}
.stat-card {
  padding: 16px;
  border-radius: 16px;
  background: rgba(24, 29, 40, 0.44);
  border: 1px solid rgba(255, 255, 255, 0.09);
  backdrop-filter: blur(18px) saturate(130%);
}
.stat-value {
  display: block;
  font-family: var(--font-display);
  font-size: 23px;
  color: #f2c26e;
}
.stat-label {
  display: block;
  margin-top: 6px;
  color: #8d98ad;
  font-size: 12px;
}
.section {
  position: relative;
  z-index: 1;
  margin-top: 16px;
  padding: 20px;
  border-radius: 18px;
  background: rgba(24, 29, 40, 0.44);
  border: 1px solid rgba(255, 255, 255, 0.09);
  backdrop-filter: blur(20px) saturate(130%);
}
.section-title {
  display: block;
  margin-bottom: 16px;
  font-family: var(--font-display);
  font-size: 17px;
  color: #f2ce85;
  letter-spacing: 1px;
}
.titles {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
}
.title-chip {
  padding: 7px 11px;
  border-radius: 999px;
  color: #f2ce85;
  font-size: 13px;
  background: rgba(224, 170, 60, 0.11);
  border: 1px solid rgba(224, 170, 60, 0.20);
}
.muted {
  color: #8d98ad;
  font-size: 13px;
}
.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.detail-row:last-child {
  border-bottom: none;
}
.detail-label {
  color: #9aa5bb;
  font-size: 14px;
}
.detail-value {
  color: #eef1f8;
  font-size: 15px;
  font-weight: 700;
}
.nav-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  color: #e8ecf6;
  font-size: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  transition: padding-left 160ms ease, color 160ms ease;
}
.nav-row:last-child {
  border-bottom: none;
}
.nav-row:active {
  padding-left: 5px;
  color: #f2ce85;
}
.nav-row.danger {
  color: #ffb2a8;
}
.arrow {
  color: #7f8aa0;
  font-size: 22px;
}
@media (max-width: 700px) {
  .profile-card {
    flex-direction: column;
    text-align: center;
  }
  .identity-meta {
    justify-content: center;
  }
  .level-block {
    text-align: center;
  }
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
