<template>
  <view class="login-page">
    <view class="guild-hall">
      <view class="emblem">
        <view class="emblem-inner">
          <text class="emblem-letter">公</text>
        </view>
      </view>
      <text class="guild-title">冒险者公会</text>
      <text class="guild-subtitle">TASK GUILD · 任务委托板</text>
      <view class="rule">
        <view class="rule-line" />
        <text class="rule-mark">✦</text>
        <view class="rule-line" />
      </view>
    </view>

    <view class="parchment-card">
      <!-- #ifdef MP-WEIXIN -->
      <button class="btn primary" @tap="wechatLogin">微信一键登录</button>
      <view class="divider">或绑定已有账号</view>
      <!-- #endif -->
      <input
        v-model="username"
        class="field"
        placeholder="冒险者账号"
        placeholder-class="placeholder"
      />
      <input
        v-model="password"
        class="field"
        type="password"
        placeholder="通行密码"
        placeholder-class="placeholder"
      />
      <button class="btn primary" :loading="loading" @tap="submitLogin">
        进入公会
      </button>
      <text v-if="pendingBind" class="bind-tip">
        该微信未绑定账号，请输入账号密码完成绑定
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../../stores/auth';

const auth = useAuthStore();
const username = ref('');
const password = ref('');
const loading = ref(false);
const pendingBind = ref(false);

function goHome() {
  uni.reLaunch({ url: '/pages/home/index' });
}

async function submitLogin() {
  if (!username.value || password.value.length < 6) {
    uni.showToast({ title: '请输入账号与至少 6 位密码', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    await auth.login(username.value, password.value);
    goHome();
  } catch (error) {
    uni.showToast({ title: (error as { message: string }).message, icon: 'none' });
  } finally {
    loading.value = false;
  }
}

// #ifdef MP-WEIXIN
async function wechatLogin() {
  uni.login({
    provider: 'weixin',
    success: async (result) => {
      loading.value = true;
      try {
        const done = await auth.wechatLogin(
          result.code,
          username.value || undefined,
          password.value || undefined,
        );
        if (done) {
          goHome();
        } else {
          pendingBind.value = true;
        }
      } catch (error) {
        uni.showToast({
          title: (error as { message: string }).message,
          icon: 'none',
        });
      } finally {
        loading.value = false;
      }
    },
  });
}
// #endif
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-6);
  background:
    radial-gradient(circle at 50% -5%, rgba(224, 170, 60, 0.24), transparent 52%),
    radial-gradient(circle at 8% 100%, rgba(75, 195, 210, 0.14), transparent 34%),
    radial-gradient(circle at 92% 100%, rgba(84, 197, 150, 0.10), transparent 34%),
    var(--color-bg);
  padding: var(--space-6);
}
.guild-hall {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}
.emblem {
  width: 92px;
  height: 92px;
  border-radius: 50%;
  background: var(--texture-brass);
  box-shadow:
    0 0 0 6px rgba(224, 170, 60, 0.12),
    0 0 0 8px rgba(255, 255, 255, 0.08),
    var(--shadow-md);
  display: flex;
  align-items: center;
  justify-content: center;
}
.emblem-inner {
  width: 62px;
  height: 62px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20, 24, 33, 0.42);
}
.emblem-letter {
  font-family: var(--font-display);
  font-size: 36px;
  font-weight: 700;
  color: #241a08;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.28);
}
.guild-title {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
  color: var(--color-ink);
  letter-spacing: 6px;
}
.guild-subtitle {
  color: var(--color-ink-muted);
  font-size: var(--font-sm);
  letter-spacing: 2px;
}
.rule {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 240px;
  margin-top: var(--space-2);
}
.rule-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-brass), transparent);
}
.rule-mark {
  color: var(--color-brass);
  font-size: 12px;
}
.parchment-card {
  width: 100%;
  max-width: 360px;
  position: relative;
  background: rgba(30, 37, 50, 0.78);
  border: 1px solid rgba(224, 170, 60, 0.22);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(28px) saturate(150%);
  box-shadow:
    0 0 0 5px rgba(255, 255, 255, 0.035),
    var(--shadow-md);
  padding: var(--space-7) var(--space-6) var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.parchment-card::before,
.parchment-card::after {
  content: '';
  position: absolute;
  width: 34px;
  height: 34px;
  border-color: var(--color-brass);
  border-style: solid;
  pointer-events: none;
}
.parchment-card::before {
  top: 10px;
  left: 10px;
  border-width: 2px 0 0 2px;
  border-top-left-radius: 8px;
}
.parchment-card::after {
  bottom: 10px;
  right: 10px;
  border-width: 0 2px 2px 0;
  border-bottom-right-radius: 8px;
}
.field {
  border: 1px solid rgba(148, 163, 190, 0.20);
  background: rgba(255, 255, 255, 0.055);
  border-radius: var(--radius-md);
  padding: 13px 14px;
  color: var(--color-ink);
  font-size: var(--font-sm);
  backdrop-filter: blur(14px) saturate(130%);
}
.placeholder {
  color: var(--color-ink-muted);
}
.btn {
  border-radius: var(--radius-md);
  font-weight: 600;
  letter-spacing: 1px;
}
.btn.primary {
  background: var(--texture-brass);
  color: var(--btn-primary-text);
  border: 1px solid rgba(224, 170, 60, 0.32);
  box-shadow: 0 8px 20px rgba(224, 170, 60, 0.18);
  transition: transform 180ms ease, box-shadow 180ms ease;
}
.btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 26px rgba(224, 170, 60, 0.24);
}
.btn.primary:active {
  box-shadow: var(--shadow-pressed);
  transform: translateY(1px) scale(0.98);
}
.divider {
  text-align: center;
  color: var(--color-ink-muted);
  font-size: var(--font-xs);
  letter-spacing: 1px;
}
.bind-tip {
  color: var(--color-danger);
  font-size: var(--font-xs);
  text-align: center;
}
</style>
