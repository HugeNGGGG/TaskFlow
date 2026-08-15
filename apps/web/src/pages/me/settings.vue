<template>
  <view class="settings-page">
    <view class="glow glow-a" />
    <view class="glow glow-b" />

    <view class="section">
      <text class="section-title">基本资料</text>
      <view class="avatar-row" @tap="chooseAvatar">
        <image v-if="avatarUrl" class="avatar-img" :src="avatarUrl" mode="aspectFill" />
        <view v-else class="avatar-placeholder">{{ initials }}</view>
        <view class="avatar-action">
          <text class="avatar-action-title">{{ avatarUrl ? '更换头像' : '上传头像' }}</text>
          <text class="avatar-action-sub">支持 jpg、png、gif、webp，5MB 以内</text>
        </view>
      </view>
      <view class="field-row">
        <text class="field-label">昵称</text>
        <input v-model="nickname" class="field" placeholder="请输入昵称" />
      </view>
      <button class="btn primary" :loading="savingProfile" @tap="saveProfile">保存资料</button>
    </view>

    <view class="section">
      <view class="section-head">
        <text class="section-title">通知设置</text>
        <text class="save-text" @tap="savePrefs">保存通知</text>
      </view>
      <text class="section-note">你可以在站内和微信中分别选择要接收哪些提醒。</text>

      <view class="pref-block">
        <text class="pref-block-title">站内通知</text>
        <view v-for="item in inappItems" :key="item.key" class="switch-row">
          <text class="switch-label">{{ item.label }}</text>
          <switch :checked="inapp[item.key]" color="#E0AA3C" @change="onInappChange(item.key, $event)" />
        </view>
      </view>

      <view class="pref-block">
        <text class="pref-block-title">微信订阅通知</text>
        <view v-for="item in wechatItems" :key="item.key" class="switch-row">
          <text class="switch-label">{{ item.label }}</text>
          <switch :checked="wechat[item.key]" color="#E0AA3C" @change="onWechatChange(item.key, $event)" />
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">修改密码</text>
      <view class="field-row">
        <text class="field-label">原密码</text>
        <input v-model="oldPassword" class="field" type="password" placeholder="请输入原密码" />
      </view>
      <view class="field-row">
        <text class="field-label">新密码</text>
        <input v-model="newPassword" class="field" type="password" placeholder="至少 6 位" />
      </view>
      <view class="field-row">
        <text class="field-label">确认新密码</text>
        <input v-model="confirmPassword" class="field" type="password" placeholder="再次输入新密码" />
      </view>
      <button class="btn primary" :loading="savingPassword" @tap="changePassword">修改密码</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import {
  getAccessToken,
  PUBLIC_ORIGIN,
  request,
  setCachedUser,
} from '../../api/client';
import { useAuthStore } from '../../stores/auth';

interface SelfProfile {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string | null;
  departmentId: string | null;
  roleMask: number;
  department?: { name: string } | null;
  notificationPrefs?: {
    inapp?: Record<string, boolean>;
    wechat?: Record<string, boolean>;
  };
}

const auth = useAuthStore();
const nickname = ref('');
const avatarUrl = ref('');
const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const savingProfile = ref(false);
const savingPassword = ref(false);
const inapp = ref<Record<string, boolean>>({});
const wechat = ref<Record<string, boolean>>({});
const initials = (auth.user?.nickname ?? '公').slice(0, 1);

const inappItems = [
  { key: 'assign', label: '新指派' },
  { key: 'review_result', label: '审核结果' },
  { key: 'deadline_warning', label: '即将逾期' },
  { key: 'xp_award', label: '经验奖励' },
  { key: 'title_award', label: '称号获得' },
  { key: 'system', label: '系统通知' },
];
const wechatItems = [
  { key: 'assign', label: '新指派' },
  { key: 'review_result', label: '审核结果' },
  { key: 'deadline_warning', label: '即将逾期' },
];

function normalizePrefs(prefs: SelfProfile['notificationPrefs']) {
  inapp.value = {
    assign: true,
    review_result: true,
    deadline_warning: true,
    xp_award: true,
    title_award: true,
    system: true,
    ...(prefs?.inapp ?? {}),
  };
  wechat.value = {
    assign: true,
    review_result: true,
    deadline_warning: true,
    ...(prefs?.wechat ?? {}),
  };
}

async function load() {
  const profile = await request<SelfProfile>({ url: '/users/me' });
  nickname.value = profile.nickname;
  avatarUrl.value = profile.avatarUrl ?? '';
  normalizePrefs(profile.notificationPrefs);
}

async function saveProfile() {
  if (!nickname.value.trim()) {
    uni.showToast({ title: '昵称不能为空', icon: 'none' });
    return;
  }
  savingProfile.value = true;
  try {
    const updated = await request<SelfProfile>({
      url: '/users/me',
      method: 'PATCH',
      data: {
        nickname: nickname.value.trim(),
      },
    });
    setCachedUser(updated);
    auth.user = updated as unknown as typeof auth.user;
    uni.showToast({ title: '资料已保存', icon: 'success' });
  } catch (error) {
    uni.showToast({ title: (error as { message: string }).message, icon: 'none' });
  } finally {
    savingProfile.value = false;
  }
}

function chooseAvatar() {
  uni.chooseImage({
    count: 1,
    success: async (result) => {
      const filePath = result.tempFilePaths[0];
      if (!filePath) {
        return;
      }
      try {
        const updated = await uploadAvatar(filePath);
        avatarUrl.value = updated.avatarUrl ?? '';
        setCachedUser(updated);
        auth.user = updated as unknown as typeof auth.user;
        uni.showToast({ title: '头像已更新', icon: 'success' });
      } catch (error) {
        uni.showToast({ title: (error as { message: string }).message, icon: 'none' });
      }
    },
  });
}

function uploadAvatar(filePath: string): Promise<SelfProfile> {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${PUBLIC_ORIGIN}/api/v1/users/me/avatar`,
      filePath,
      name: 'file',
      header: {
        Authorization: `Bearer ${getAccessToken()}`,
      },
      success: (response) => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          try {
            resolve(JSON.parse(response.data) as SelfProfile);
          } catch {
            reject({ message: '头像保存失败' });
          }
        } else {
          let message = '头像上传失败';
          try {
            const body = JSON.parse(response.data) as { message?: string };
            message = body.message ?? message;
          } catch {
            /* keep default */
          }
          reject({ message });
        }
      },
      fail: () => reject({ message: '网络异常，请稍后重试' }),
    });
  });
}

async function savePrefs() {
  try {
    await request({
      url: '/users/me/notification-prefs',
      method: 'PUT',
      data: {
        inapp: inapp.value,
        wechat: wechat.value,
      },
    });
    uni.showToast({ title: '通知设置已保存', icon: 'success' });
  } catch (error) {
    uni.showToast({ title: (error as { message: string }).message, icon: 'none' });
  }
}

function onInappChange(key: string, event: Event) {
  const detail = (event as Event & { detail?: { value?: boolean } }).detail;
  inapp.value[key] = detail?.value ?? false;
}

function onWechatChange(key: string, event: Event) {
  const detail = (event as Event & { detail?: { value?: boolean } }).detail;
  wechat.value[key] = detail?.value ?? false;
}

async function changePassword() {
  if (newPassword.value.length < 6) {
    uni.showToast({ title: '新密码至少 6 位', icon: 'none' });
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    uni.showToast({ title: '两次输入的新密码不一致', icon: 'none' });
    return;
  }
  savingPassword.value = true;
  try {
    await request({
      url: '/users/me/change-password',
      method: 'POST',
      data: {
        oldPassword: oldPassword.value,
        newPassword: newPassword.value,
      },
    });
    oldPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    uni.showToast({ title: '密码已修改', icon: 'success' });
  } catch (error) {
    uni.showToast({ title: (error as { message: string }).message, icon: 'none' });
  } finally {
    savingPassword.value = false;
  }
}

onShow(() => {
  void load();
});
</script>

<style scoped>
.settings-page {
  position: relative;
  min-height: 100vh;
  padding: 22px 20px 40px;
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
.section {
  position: relative;
  z-index: 1;
  margin-bottom: 16px;
  padding: 20px;
  border-radius: 18px;
  background: rgba(24, 29, 40, 0.48);
  border: 1px solid rgba(255, 255, 255, 0.09);
  backdrop-filter: blur(22px) saturate(140%);
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.section-title {
  font-family: var(--font-display);
  font-size: 18px;
  color: #f2ce85;
  letter-spacing: 1px;
}
.section-note {
  display: block;
  margin-bottom: 16px;
  color: #8d98ad;
  font-size: 13px;
  line-height: 1.6;
}
.save-text {
  color: #f2ce85;
  font-size: 14px;
}
.field-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}
.avatar-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  margin-bottom: 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(148, 163, 190, 0.18);
}
.avatar-img,
.avatar-placeholder {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  flex-shrink: 0;
}
.avatar-img {
  border: 2px solid rgba(224, 170, 60, 0.34);
}
.avatar-placeholder {
  display: grid;
  place-items: center;
  color: #241a08;
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(145deg, #f2cf77, #c8902c 60%, #8a5f1a);
}
.avatar-action {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.avatar-action-title {
  color: #f2ce85;
  font-size: 15px;
  font-weight: 700;
}
.avatar-action-sub {
  color: #8d98ad;
  font-size: 12px;
}
.field-label {
  color: #9aa5bb;
  font-size: 13px;
}
.field {
  height: 44px;
  padding: 0 13px;
  border-radius: 12px;
  color: #eef1f8;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(148, 163, 190, 0.20);
  backdrop-filter: blur(14px) saturate(130%);
  font-size: 14px;
}
.btn {
  border-radius: 12px;
  font-weight: 700;
}
.btn.primary {
  color: #241a08;
  background: linear-gradient(180deg, #e6bb5c, #c8902c);
  border: 1px solid rgba(224, 170, 60, 0.32);
  box-shadow: 0 8px 20px rgba(224, 170, 60, 0.18);
  transition: transform 180ms ease, box-shadow 180ms ease;
}
.btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 26px rgba(224, 170, 60, 0.24);
}
.pref-block {
  margin-top: 16px;
}
.pref-block-title {
  display: block;
  margin-bottom: 9px;
  color: #e8ecf6;
  font-size: 14px;
  font-weight: 700;
}
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.switch-row:last-child {
  border-bottom: none;
}
.switch-label {
  color: #b3bccd;
  font-size: 14px;
}
</style>
