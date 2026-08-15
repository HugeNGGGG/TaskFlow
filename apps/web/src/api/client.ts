const ACCESS_KEY = 'tg_access_token';
const REFRESH_KEY = 'tg_refresh_token';
const USER_KEY = 'tg_user';

const BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export const PUBLIC_ORIGIN = BASE_URL.replace(/\/api\/v1\/?$/, '');

export interface ApiError {
  code: number;
  message: string;
}

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: unknown;
  auth?: boolean;
}

function rawRequest<T>(options: RequestOptions): Promise<T> {
  const token = uni.getStorageSync(ACCESS_KEY) as string;
  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${options.url}`,
      method: (options.method ?? 'GET') as 'GET',
      data: options.data as never,
      header: {
        'Content-Type': 'application/json',
        ...(options.auth !== false && token
          ? { Authorization: `Bearer ${token}` }
          : {}),
      },
      success: (response) => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data as T);
        } else {
          const body = response.data as { code?: number; message?: string };
          reject({
            code: body?.code ?? response.statusCode,
            message: body?.message ?? '请求失败',
          } satisfies ApiError);
        }
      },
      fail: () => {
        reject({ code: -1, message: '网络异常，请稍后重试' } satisfies ApiError);
      },
    });
  });
}

export function getAccessToken(): string {
  return (uni.getStorageSync(ACCESS_KEY) as string) || '';
}

export function getRefreshToken(): string {
  return (uni.getStorageSync(REFRESH_KEY) as string) || '';
}

export function setTokens(accessToken: string, refreshToken: string): void {
  uni.setStorageSync(ACCESS_KEY, accessToken);
  uni.setStorageSync(REFRESH_KEY, refreshToken);
}

export function clearTokens(): void {
  uni.removeStorageSync(ACCESS_KEY);
  uni.removeStorageSync(REFRESH_KEY);
  uni.removeStorageSync(USER_KEY);
}

export function getCachedUser<T>(): T | null {
  return (uni.getStorageSync(USER_KEY) as T | null) || null;
}

export function setCachedUser(user: unknown): void {
  uni.setStorageSync(USER_KEY, user);
}

async function refreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }
  try {
    const result = await rawRequest<{
      accessToken: string;
      refreshToken: string;
    }>({
      url: '/auth/refresh',
      method: 'POST',
      data: { refreshToken },
      auth: false,
    });
    setTokens(result.accessToken, result.refreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export async function request<T>(options: RequestOptions): Promise<T> {
  try {
    return await rawRequest<T>(options);
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.code === 401 && options.auth !== false) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return rawRequest<T>(options);
      }
    }
    throw error;
  }
}

export interface UploadAttachmentResult {
  id: string;
  area: string;
  logicalName: string;
  version: number;
  fileName: string;
  sizeBytes: number;
}

export async function uploadAttachment(input: {
  taskId: string;
  area: string;
  logicalName: string;
  filePath: string;
  fileName: string;
  mimeType?: string;
}): Promise<UploadAttachmentResult> {
  const signature = await request<{
    url: string;
    storageKey: string;
    method: 'PUT' | 'POST';
  }>({
    url: `/tasks/${input.taskId}/attachments/presign`,
    method: 'POST',
    data: {
      area: input.area,
      logicalName: input.logicalName,
      fileName: input.fileName,
    },
  });

  if (signature.method === 'PUT') {
    await new Promise<void>((resolve, reject) => {
      uni.uploadFile({
        url: signature.url,
        filePath: input.filePath,
        name: 'file',
        header: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
        success: (response) => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve();
          } else {
            reject({ code: response.statusCode, message: '上传失败' });
          }
        },
        fail: () => reject({ code: -1, message: '上传失败' }),
      });
    });
    return request<UploadAttachmentResult>({
      url: `/tasks/${input.taskId}/attachments/confirm`,
      method: 'POST',
      data: {
        area: input.area,
        logicalName: input.logicalName,
        storageKey: signature.storageKey,
        fileName: input.fileName,
        mimeType: input.mimeType ?? 'application/octet-stream',
        sizeBytes: 0,
      },
    });
  }

  return new Promise<UploadAttachmentResult>((resolve, reject) => {
    uni.uploadFile({
      url: signature.url,
      filePath: input.filePath,
      name: 'file',
      formData: {
        storageKey: signature.storageKey,
        area: input.area,
        logicalName: input.logicalName,
        fileName: input.fileName,
        mimeType: input.mimeType ?? 'application/octet-stream',
      },
      header: {
        Authorization: `Bearer ${getAccessToken()}`,
      },
      success: (response) => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(JSON.parse(response.data as string) as UploadAttachmentResult);
        } else {
          reject({ code: response.statusCode, message: '上传失败' });
        }
      },
      fail: () => reject({ code: -1, message: '上传失败' }),
    });
  });
}
