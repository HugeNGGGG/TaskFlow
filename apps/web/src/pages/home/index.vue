<template>
  <view class="landing">
    <view class="orb orb-a" />
    <view class="orb orb-b" />
    <view class="orb orb-c" />

    <view class="glass-shell">
      <view class="topbar">
        <view class="brand">
          <view class="sigil">会</view>
          <view>
            <text class="brand-name">冒险者公会</text>
            <text class="brand-sub">TASK GUILD · 深色指挥舱</text>
          </view>
        </view>
        <view class="top-actions">
          <text class="status-dot" />
          <text class="status-text">实时同步已连接</text>
          <image v-if="auth.user?.avatarUrl" class="avatar avatar-img" :src="auth.user.avatarUrl" mode="aspectFill" />
          <view v-else class="avatar">{{ initials }}</view>
        </view>
      </view>

      <view class="hero">
        <view class="hero-copy">
          <text class="eyebrow">欢迎回来，冒险者</text>
          <text class="hero-title">{{ auth.user?.nickname ?? '冒险者' }}，今天继续推进你的委托。</text>
          <text class="hero-subtitle">
            查看任务大厅、追踪个人进度，或直接进入管理看板。所有状态都在同一块玻璃面板上。
          </text>
          <view class="hero-actions">
            <view class="primary-action" @tap="goHall">进入任务大厅</view>
            <view v-if="auth.isManager" class="ghost-action" @tap="goAdmin">打开总览看板</view>
          </view>
        </view>

        <view class="hero-panel">
          <text class="panel-label">本周进度</text>
          <text class="panel-value">{{ completionRate }}%</text>
          <view class="panel-track">
            <view class="panel-fill" :style="{ width: `${completionRate}%` }" />
          </view>
          <text class="panel-note">完成率来自已完成委托与总接取委托</text>
        </view>
      </view>

      <view class="stats-grid">
        <view class="stat-card">
          <text class="stat-value">Lv.{{ stats?.level ?? 1 }}</text>
          <text class="stat-label">{{ stats?.levelName ?? '见习冒险者' }}</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ stats?.acceptedCount ?? 0 }}</text>
          <text class="stat-label">已接取</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ stats?.completedCount ?? 0 }}</text>
          <text class="stat-label">已完成</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ Math.round((stats?.onTimeRate ?? 0) * 100) }}%</text>
          <text class="stat-label">按时率</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ stats?.streakWeeks ?? 0 }}</text>
          <text class="stat-label">连续周数</text>
        </view>
      </view>

      <view class="quick-grid">
        <view class="quick-card" @tap="goHall">
          <text class="quick-title">任务大厅</text>
          <text class="quick-desc">浏览悬赏、指派与进行中的委托</text>
        </view>
        <view class="quick-card" @tap="goMine">
          <text class="quick-title">我的委托</text>
          <text class="quick-desc">查看自己的进度、提交与审核状态</text>
        </view>
        <view class="quick-card" @tap="goMessages">
          <text class="quick-title">消息中心</text>
          <text class="quick-desc">新指派、审核结果与逾期提醒</text>
        </view>
        <view class="quick-card" @tap="goProfile">
          <text class="quick-title">个人中心</text>
          <text class="quick-desc">等级、积分、称号与战绩</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import type { MyStats } from '@task-guild/shared';
import { request } from '../../api/client';
import { useAuthStore } from '../../stores/auth';

const auth = useAuthStore();
const stats = ref<MyStats | null>(null);

const initials = computed(() => (auth.user?.nickname ?? '公').slice(0, 1));
const completionRate = computed(() => Math.round((stats.value?.completionRate ?? 0) * 100));

async function load() {
  try {
    stats.value = await request<MyStats>({ url: '/stats/me' });
  } catch {
    stats.value = null;
  }
}

function goHall() {
  uni.switchTab({ url: '/pages/index/index' });
}

function goMine() {
  uni.switchTab({ url: '/pages/mine/index' });
}

function goMessages() {
  uni.switchTab({ url: '/pages/message/index' });
}

function goProfile() {
  uni.switchTab({ url: '/pages/me/index' });
}

function goAdmin() {
  uni.navigateTo({ url: '/pages/admin/overview' });
}

onShow(() => {
  void load();
});
</script>

<style scoped>
.landing {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  padding: 22px;
  background:
    radial-gradient(circle at 70% -8%, rgba(224, 170, 60, 0.20), transparent 34%),
    radial-gradient(circle at 8% 108%, rgba(75, 195, 210, 0.16), transparent 32%),
    linear-gradient(145deg, #0e1118 0%, #121723 58%, #0c1017 100%);
}
.orb {
  position: fixed;
  width: 250px;
  height: 250px;
  border-radius: 50%;
  filter: blur(26px);
  opacity: 0.48;
  pointer-events: none;
  animation: float 8s ease-in-out infinite;
}
.orb-a { left: 8%; top: 12%; background: rgba(224, 170, 60, 0.20); }
.orb-b { right: 7%; top: 24%; background: rgba(75, 195, 210, 0.16); animation-delay: -3s; }
.orb-c { right: 24%; bottom: 8%; background: rgba(84, 197, 150, 0.12); animation-delay: -5s; }
@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-18px) scale(1.06); }
}
.glass-shell {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  border-radius: 28px;
  padding: 22px;
  background: rgba(18, 22, 31, 0.48);
  border: 1px solid rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(26px) saturate(150%);
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.26);
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.brand {
  display: flex;
  align-items: center;
  gap: 13px;
}
.sigil {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #241a08;
  font-family: var(--font-display);
  font-weight: 800;
  background: linear-gradient(145deg, #f2cf77, #c8902c 60%, #8a5f1a);
  box-shadow: 0 8px 24px rgba(224, 170, 60, 0.20);
}
.brand-name {
  display: block;
  font-family: var(--font-display);
  font-size: 20px;
  letter-spacing: 0.04em;
}
.brand-sub {
  display: block;
  margin-top: 4px;
  color: #8d98ad;
  font-size: 12px;
  letter-spacing: 1px;
}
.top-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #54c596;
  box-shadow: 0 0 0 6px rgba(84, 197, 150, 0.12), 0 0 18px rgba(84, 197, 150, 0.5);
  animation: pulse 1.7s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}
.status-text {
  color: #9aa5bb;
  font-size: 13px;
}
.avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #f2c26e;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(224, 170, 60, 0.28);
}
.avatar-img {
  border: 1px solid rgba(224, 170, 60, 0.32);
}
.hero {
  display: grid;
  grid-template-columns: 1.25fr 0.75fr;
  gap: 28px;
  align-items: center;
  padding: 56px 10px 42px;
}
.hero-copy {
  display: flex;
  flex-direction: column;
}
.eyebrow {
  color: #f2ce85;
  font-size: 13px;
  letter-spacing: 3px;
}
.hero-title {
  margin-top: 14px;
  font-family: var(--font-display);
  font-size: 38px;
  line-height: 1.2;
  letter-spacing: 0.02em;
}
.hero-subtitle {
  margin-top: 16px;
  max-width: 620px;
  color: #9aa5bb;
  font-size: 15px;
  line-height: 1.7;
}
.hero-actions {
  display: flex;
  gap: 12px;
  margin-top: 28px;
}
.primary-action,
.ghost-action {
  height: 44px;
  padding: 0 19px;
  border-radius: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  transition: transform 180ms ease, box-shadow 180ms ease;
}
.primary-action {
  color: #241a08;
  background: linear-gradient(180deg, #e6bb5c, #c8902c);
  border: 1px solid rgba(224, 170, 60, 0.32);
  box-shadow: 0 8px 20px rgba(224, 170, 60, 0.18);
}
.primary-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 26px rgba(224, 170, 60, 0.24);
}
.ghost-action {
  color: #e8ecf6;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(148, 163, 190, 0.22);
}
.hero-panel {
  padding: 24px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(20px) saturate(130%);
}
.panel-label {
  color: #9aa5bb;
  font-size: 12px;
}
.panel-value {
  display: block;
  margin-top: 16px;
  font-family: var(--font-display);
  font-size: 48px;
  color: #f2c26e;
}
.panel-track {
  height: 7px;
  margin-top: 16px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.09);
  overflow: hidden;
}
.panel-fill {
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #e0aa3c, #f2d78e);
  box-shadow: 0 0 14px rgba(224, 170, 60, 0.30);
}
.panel-note {
  display: block;
  margin-top: 12px;
  color: #7e89a0;
  font-size: 12px;
  line-height: 1.5;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-top: 10px;
}
.stat-card {
  padding: 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.09);
  backdrop-filter: blur(18px) saturate(130%);
}
.stat-value {
  display: block;
  font-family: var(--font-display);
  font-size: 24px;
  color: #f2c26e;
}
.stat-label {
  display: block;
  margin-top: 6px;
  color: #8d98ad;
  font-size: 12px;
}
.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-top: 16px;
}
.quick-card {
  min-height: 120px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(24, 29, 40, 0.46);
  border: 1px solid rgba(255, 255, 255, 0.09);
  backdrop-filter: blur(20px) saturate(130%);
  transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
}
.quick-card:hover {
  transform: translateY(-4px);
  border-color: rgba(224, 170, 60, 0.30);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.22);
}
.quick-title {
  display: block;
  font-family: var(--font-display);
  font-size: 18px;
  color: #f1f3f9;
}
.quick-desc {
  display: block;
  margin-top: 9px;
  color: #98a3b8;
  font-size: 13px;
  line-height: 1.55;
}
@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
  }
  .stats-grid,
  .quick-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
