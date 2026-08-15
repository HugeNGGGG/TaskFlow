import { defineStore } from 'pinia';
import { hasRole, type UserPublic } from '@task-guild/shared';
import {
  clearTokens,
  getAccessToken,
  getCachedUser,
  request,
  setCachedUser,
  setTokens,
} from '../api/client';

interface TokenResult {
  accessToken: string;
  refreshToken: string;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: getCachedUser<UserPublic>() as UserPublic | null,
    loaded: false,
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.user),
    isManager: (state) =>
      state.user ? hasRole(state.user.roleMask, 'MANAGER') : false,
    isAdmin: (state) =>
      state.user ? hasRole(state.user.roleMask, 'ADMIN') : false,
  },
  actions: {
    async restoreSession(): Promise<void> {
      if (!getAccessToken()) {
        this.loaded = true;
        return;
      }
      try {
        this.user = await request<UserPublic & { department?: { name: string } }>({
          url: '/auth/me',
        });
        setCachedUser(this.user);
      } catch {
        this.logout();
      } finally {
        this.loaded = true;
      }
    },
    async login(username: string, password: string): Promise<void> {
      const result = await request<TokenResult>({
        url: '/auth/login',
        method: 'POST',
        data: { username, password },
        auth: false,
      });
      setTokens(result.accessToken, result.refreshToken);
      this.user = await request<UserPublic & { department?: { name: string } }>({
        url: '/auth/me',
      });
      setCachedUser(this.user);
    },
    async wechatLogin(
      code: string,
      username?: string,
      password?: string,
    ): Promise<boolean> {
      const result = await request<
        | ({ needBind: false } & TokenResult)
        | { needBind: true; bindToken: string }
      >({
        url: '/auth/wechat/login',
        method: 'POST',
        data: { code },
        auth: false,
      });
      if (result.needBind) {
        if (!username || !password) {
          return false;
        }
        const bound = await request<TokenResult>({
          url: '/auth/wechat/bind',
          method: 'POST',
          data: {
            bindToken: result.bindToken,
            username,
            password,
          },
          auth: false,
        });
        setTokens(bound.accessToken, bound.refreshToken);
      } else {
        setTokens(result.accessToken, result.refreshToken);
      }
      this.user = await request<UserPublic & { department?: { name: string } }>({
        url: '/auth/me',
      });
      setCachedUser(this.user);
      return true;
    },
    logout(): void {
      clearTokens();
      this.user = null;
    },
  },
});
