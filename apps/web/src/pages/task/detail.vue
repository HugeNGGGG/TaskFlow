<template>
  <view v-if="task" class="detail-page">
    <view class="hero">
      <view class="hero-head">
        <text class="no">{{ task.taskNo }}</text>
        <view class="seal" :class="statusClass(task.status)">
          {{ statusText(task.status) }}
        </view>
      </view>
      <text class="title">{{ task.title }}</text>
      <view class="tags">
        <text class="tag">{{ task.category?.name ?? '未分类' }}</text>
        <text class="tag">难度 {{ task.difficulty }}</text>
        <text class="tag gold">+{{ task.xpReward }} XP</text>
        <text class="tag">{{ task.acceptMode === 'bounty' ? '悬赏委托' : '指派委托' }}</text>
        <text v-if="task.isUrgent" class="tag red">紧急</text>
        <text v-if="task.overdueAt" class="tag red">已逾期</text>
      </view>
      <view class="deadline">
        截止：{{ formatDateTime(task.deadlineAt) }} · 人数 {{ task.acceptCount }}/{{ task.maxMembers }}
      </view>
      <text class="description">{{ task.description || '（无详细描述）' }}</text>
      <button
        v-if="task.canAccept"
        class="btn primary"
        @tap="acceptTask"
      >
        接取委托
      </button>
    </view>

    <view v-if="task.assignments.length" class="section">
      <text class="section-title">队伍成员</text>
      <view v-for="item in task.assignments" :key="item.userId" class="member">
        <text class="member-name">
          {{ item.userNickname }}{{ item.role === 'captain' ? '（队长）' : '' }}
        </text>
        <text class="member-dept">{{ item.departmentName ?? '未分配部门' }}</text>
        <text class="member-status">{{ assignmentStatusText(item.status) }} {{ item.progressPercent }}%</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">检查清单</text>
      <view class="subtask-row" v-for="item in subtasks" :key="item.id">
        <view class="checkbox" :class="{ checked: item.isDone }" @tap="toggleSubtask(item)">
          <text v-if="item.isDone">✓</text>
        </view>
        <text class="subtask-title" :class="{ done: item.isDone }">{{ item.title }}</text>
        <text class="subtask-delete" @tap="deleteSubtask(item)">删除</text>
      </view>
      <view class="add-row">
        <input v-model="subtaskText" class="note" placeholder="添加子任务" />
        <button class="btn small" @tap="addSubtask">添加</button>
      </view>
    </view>

    <view v-if="task.myAssignment && ['accepted', 'in_progress'].includes(task.myAssignment.status)" class="section">
      <text class="section-title">更新进度</text>
      <slider :value="progressPercent" :min="0" :max="100" :step="5" @change="onProgressChange" />
      <view class="progress-row">
        <text>{{ progressPercent }}%</text>
        <input v-model="progressNote" class="note" placeholder="进度说明（可选）" />
      </view>
      <button class="btn" @tap="updateProgress">记录进度</button>
      <button class="btn primary" @tap="submitWork">提交成果</button>
    </view>

    <view v-if="auth.isManager" class="section">
      <text class="section-title">审核</text>
      <view v-for="item in submittedAssignments" :key="item.userId" class="review-row">
        <text class="member-name">{{ item.userNickname }}</text>
        <input v-model="reviewReason[item.userId]" class="note" placeholder="审核意见" />
        <view class="review-btns">
          <button class="btn small ok" @tap="review(item.userId, 'approved')">通过</button>
          <button class="btn small no" @tap="review(item.userId, 'rejected')">打回</button>
        </view>
      </view>
      <text v-if="submittedAssignments.length === 0" class="muted">暂无待审核提交</text>
    </view>

    <view class="section">
      <view class="section-head">
        <text class="section-title">附件留档</text>
        <text class="add-file" @tap="chooseFile">＋上传</text>
      </view>
      <view class="area-tabs">
        <view
          v-for="area in areas"
          :key="area.value"
          class="chip"
          :class="{ active: activeArea === area.value }"
          @tap="activeArea = area.value"
        >
          {{ area.label }}
        </view>
      </view>
      <view v-for="file in visibleFiles" :key="file.id" class="file-row" @tap="downloadFile(file.id)">
        <text class="file-name">{{ file.logicalName }}</text>
        <text class="file-meta">v{{ file.version }} · {{ file.uploaderName }} · {{ formatSize(file.sizeBytes) }}</text>
        <text v-if="canPreview(file)" class="preview-link" @tap.stop="previewFile(file.id)">预览</text>
      </view>
      <view v-if="visibleFiles.length === 0" class="muted">暂无附件</view>
    </view>

    <view class="section">
      <text class="section-title">时间线</text>
      <view v-for="event in task.timeline" :key="event.id" class="timeline-row">
        <view class="dot" />
        <view class="timeline-body">
          <text class="timeline-text">
            {{ event.authorName ? `${event.authorName} · ` : '' }}{{ event.content ?? event.type }}
          </text>
          <text class="timeline-time">{{ formatDateTime(event.createdAt) }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">评论</text>
      <view v-for="comment in comments" :key="comment.id" class="comment-row">
        <view class="comment-head">
          <text class="comment-author">{{ comment.author?.nickname ?? '已注销用户' }}</text>
          <text class="comment-time">{{ formatDateTime(comment.createdAt) }}</text>
        </view>
        <text class="comment-content">{{ comment.content }}</text>
      </view>
      <view class="add-row">
        <input v-model="commentText" class="note" placeholder="输入评论，可用 @昵称 提醒同事" />
        <button class="btn small" @tap="addComment">评论</button>
      </view>
    </view>

    <view class="section">
      <text class="section-title">延期申请</text>
      <view class="extend-row">
        <input v-model="extension.reason" class="note" placeholder="延期理由" />
        <input v-model="extension.deadline" class="note" placeholder="2026-08-20T18:00:00Z" />
        <button class="btn small" @tap="requestExtension">申请</button>
      </view>
      <view v-for="item in extensions" :key="item.id" class="muted">
        {{ item.requester?.nickname }} → {{ formatDateTime(item.requestedDeadline) }}
        <text>{{ item.status === 'pending' ? '待审批' : item.status === 'approved' ? '已批准' : '已驳回' }}</text>
        <button
          v-if="auth.isManager && item.status === 'pending'"
          class="btn small"
          @tap="decideExtension(item.id, true)"
        >
          批准
        </button>
      </view>
    </view>

    <view v-if="acceptSuccess" class="accept-overlay" @tap="acceptSuccess = false">
      <view class="accept-card">
        <view class="accept-check">✓</view>
        <text class="accept-title">已接取委托</text>
        <text class="accept-text">你已加入协作队伍，可以开始更新进度了。</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onUnload, onShow } from '@dcloudio/uni-app';
import type { AttachmentView, AssignmentStatus, AssignmentView, TaskStatus, TimelineEventView } from '@task-guild/shared';
import { request, uploadAttachment } from '../../api/client';
import { createRealtimeClient, type RealtimeClient } from '../../api/socket';
import { useAuthStore } from '../../stores/auth';

interface TaskDetail {
  id: string;
  taskNo: string;
  title: string;
  description: string;
  category: { id: string; name: string } | null;
  difficulty: string;
  xpReward: number;
  deadlineAt: string;
  acceptMode: string;
  maxMembers: number;
  needReview: boolean;
  isUrgent: boolean;
  status: TaskStatus;
  overdueAt: string | null;
  acceptCount: number;
  canAccept: boolean;
  assignments: AssignmentView[];
  timeline: TimelineEventView[];
  myAssignment: AssignmentView | null;
}

interface ExtensionView {
  id: string;
  status: string;
  requestedDeadline: string;
  requester: { nickname: string } | null;
}

interface TaskComment {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; nickname: string; avatarUrl: string | null } | null;
}

interface Subtask {
  id: string;
  title: string;
  isDone: boolean;
  sort: number;
}

const auth = useAuthStore();
const task = ref<TaskDetail | null>(null);
const progressPercent = ref(0);
const progressNote = ref('');
const reviewReason = ref<Record<string, string>>({});
const files = ref<AttachmentView[]>([]);
const activeArea = ref('source');
const extension = ref({ reason: '', deadline: '' });
const extensions = ref<ExtensionView[]>([]);
const acceptSuccess = ref(false);
const comments = ref<TaskComment[]>([]);
const commentText = ref('');
const subtasks = ref<Subtask[]>([]);
const subtaskText = ref('');
let realtime: RealtimeClient | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

const areas = [
  { value: 'source', label: '任务资料' },
  { value: 'process', label: '过程附件' },
  { value: 'result', label: '成果附件' },
];

const submittedAssignments = computed(
  () => task.value?.assignments.filter((item) => item.status === 'submitted') ?? [],
);

const visibleFiles = computed(
  () => files.value.filter((file) => file.area === activeArea.value),
);

async function load() {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as unknown as { options?: { id?: string } };
  const id = current.options?.id;
  if (!id) {
    return;
  }
  task.value = await request<TaskDetail>({ url: `/tasks/${id}` });
  progressPercent.value = task.value.myAssignment?.progressPercent ?? 0;
  files.value = await request<AttachmentView[]>({ url: `/tasks/${id}/attachments` });
  extensions.value = await request<ExtensionView[]>({ url: `/tasks/${id}/extensions` });
  comments.value = await request<TaskComment[]>({ url: `/tasks/${id}/comments` });
  subtasks.value = await request<Subtask[]>({ url: `/tasks/${id}/subtasks` });
  realtime?.subscribeTask(id);
  if (pollTimer) {
    clearInterval(pollTimer);
  }
  // #ifndef H5
  pollTimer = setInterval(() => {
    void refreshSilently();
  }, 10000);
  // #endif
}

async function refreshSilently() {
  try {
    await load();
  } catch {
    /* 静默失败 */
  }
}

async function acceptTask() {
  if (!task.value) {
    return;
  }
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '确认接取',
      content: `接取“${task.value?.title}”后即进入进行中，确认接取？`,
      success: (result) => resolve(result.confirm),
      fail: () => resolve(false),
    });
  });
  if (!confirmed) {
    return;
  }
  try {
    await request({ url: `/tasks/${task.value.id}/accept`, method: 'POST' });
    acceptSuccess.value = true;
    setTimeout(() => {
      acceptSuccess.value = false;
    }, 1500);
    await load();
  } catch (error) {
    uni.showToast({ title: (error as { message: string }).message, icon: 'none' });
  }
}

function onProgressChange(event: { detail: { value: number } }) {
  progressPercent.value = event.detail.value;
}

async function updateProgress() {
  if (!task.value) {
    return;
  }
  try {
    await request({
      url: `/tasks/${task.value.id}/progress`,
      method: 'POST',
      data: { percent: progressPercent.value, content: progressNote.value || undefined },
    });
    progressNote.value = '';
    await load();
  } catch (error) {
    uni.showToast({ title: (error as { message: string }).message, icon: 'none' });
  }
}

async function submitWork() {
  if (!task.value) {
    return;
  }
  try {
    await request({
      url: `/tasks/${task.value.id}/submissions/me`,
      method: 'POST',
      data: {},
    });
    uni.showToast({ title: '已提交', icon: 'success' });
    await load();
  } catch (error) {
    uni.showToast({ title: (error as { message: string }).message, icon: 'none' });
  }
}

async function review(userId: string, decision: 'approved' | 'rejected') {
  if (!task.value) {
    return;
  }
  try {
    await request({
      url: `/tasks/${task.value.id}/submissions/${userId}/review`,
      method: 'POST',
      data: { decision, reason: reviewReason.value[userId] || undefined },
    });
    await load();
  } catch (error) {
    uni.showToast({ title: (error as { message: string }).message, icon: 'none' });
  }
}

function chooseFile() {
  if (!task.value) {
    return;
  }
  uni.chooseFile({
    count: 1,
    success: async (result) => {
      const file = (result.tempFiles as unknown as { path: string; name: string }[])[0];
      if (!file) {
        return;
      }
      try {
        await uploadAttachment({
          taskId: task.value!.id,
          area: activeArea.value,
          logicalName: file.name,
          filePath: file.path,
          fileName: file.name,
        });
        uni.showToast({ title: '上传成功', icon: 'success' });
        await load();
      } catch (error) {
        uni.showToast({ title: (error as { message: string }).message, icon: 'none' });
      }
    },
  });
}

async function downloadFile(fileId: string) {
  try {
    const result = await request<{ url: string }>({
      url: `/attachments/${fileId}/presign`,
    });
    // #ifdef H5
    window.open(result.url, '_blank');
    // #endif
    // #ifndef H5
    uni.downloadFile({
      url: result.url,
      success: (response) => {
        uni.openDocument({ filePath: response.tempFilePath, showMenu: true });
      },
    });
    // #endif
  } catch (error) {
    uni.showToast({ title: (error as { message: string }).message, icon: 'none' });
  }
}

function canPreview(file: AttachmentView): boolean {
  return (
    file.mimeType.startsWith('image/') ||
    file.mimeType === 'application/pdf' ||
    /\.(png|jpe?g|gif|webp|pdf)$/i.test(file.fileName)
  );
}

async function previewFile(fileId: string) {
  try {
    const result = await request<{ url: string }>({
      url: `/attachments/${fileId}/presign`,
    });
    // #ifdef H5
    window.open(result.url, '_blank');
    // #endif
    // #ifndef H5
    uni.downloadFile({
      url: result.url,
      success: (response) => {
        uni.openDocument({ filePath: response.tempFilePath, showMenu: false });
      },
    });
    // #endif
  } catch (error) {
    uni.showToast({ title: (error as { message: string }).message, icon: 'none' });
  }
}

async function requestExtension() {
  if (!task.value || !extension.value.reason || !extension.value.deadline) {
    uni.showToast({ title: '请填写理由与新的截止时间', icon: 'none' });
    return;
  }
  try {
    await request({
      url: `/tasks/${task.value.id}/extensions`,
      method: 'POST',
      data: {
        reason: extension.value.reason,
        requestedDeadline: extension.value.deadline,
      },
    });
    extension.value = { reason: '', deadline: '' };
    await load();
  } catch (error) {
    uni.showToast({ title: (error as { message: string }).message, icon: 'none' });
  }
}

async function decideExtension(extensionId: string, approve: boolean) {
  if (!task.value) {
    return;
  }
  await request({
    url: `/tasks/${task.value.id}/extensions/${extensionId}/decide`,
    method: 'POST',
    data: { approve },
  });
  await load();
}

async function addComment() {
  if (!task.value || !commentText.value.trim()) {
    uni.showToast({ title: '请输入评论内容', icon: 'none' });
    return;
  }
  try {
    await request({
      url: `/tasks/${task.value.id}/comments`,
      method: 'POST',
      data: { content: commentText.value.trim() },
    });
    commentText.value = '';
    await loadComments();
  } catch (error) {
    uni.showToast({ title: (error as { message: string }).message, icon: 'none' });
  }
}

async function loadComments() {
  if (!task.value) {
    return;
  }
  comments.value = await request<TaskComment[]>({
    url: `/tasks/${task.value.id}/comments`,
  });
}

async function addSubtask() {
  if (!task.value || !subtaskText.value.trim()) {
    uni.showToast({ title: '请输入子任务内容', icon: 'none' });
    return;
  }
  try {
    await request({
      url: `/tasks/${task.value.id}/subtasks`,
      method: 'POST',
      data: { title: subtaskText.value.trim() },
    });
    subtaskText.value = '';
    await loadSubtasks();
  } catch (error) {
    uni.showToast({ title: (error as { message: string }).message, icon: 'none' });
  }
}

async function loadSubtasks() {
  if (!task.value) {
    return;
  }
  subtasks.value = await request<Subtask[]>({
    url: `/tasks/${task.value.id}/subtasks`,
  });
}

async function toggleSubtask(subtask: Subtask) {
  if (!task.value) {
    return;
  }
  try {
    await request({
      url: `/tasks/${task.value.id}/subtasks/${subtask.id}`,
      method: 'PATCH',
      data: { isDone: !subtask.isDone },
    });
    await loadSubtasks();
  } catch (error) {
    uni.showToast({ title: (error as { message: string }).message, icon: 'none' });
  }
}

async function deleteSubtask(subtask: Subtask) {
  if (!task.value) {
    return;
  }
  try {
    await request({
      url: `/tasks/${task.value.id}/subtasks/${subtask.id}`,
      method: 'DELETE',
    });
    await loadSubtasks();
  } catch (error) {
    uni.showToast({ title: (error as { message: string }).message, icon: 'none' });
  }
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function statusClass(status: TaskStatus): string {
  if (status === 'completed') return 'seal-done';
  if (status === 'pending_review') return 'seal-review';
  if (status === 'cancelled') return 'seal-cancel';
  return 'seal-open';
}

function statusText(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    draft: '草稿',
    open: '待接取',
    in_progress: '进行中',
    pending_review: '待审核',
    completed: '已结',
    cancelled: '取消',
  };
  return map[status];
}

function assignmentStatusText(status: AssignmentStatus): string {
  const map: Record<AssignmentStatus, string> = {
    accepted: '已接取',
    in_progress: '进行中',
    submitted: '已提交',
    completed: '已完成',
  };
  return map[status];
}

onLoad(() => {
  realtime = createRealtimeClient();
  realtime?.onTaskStatusChanged(() => {
    void refreshSilently();
  });
  realtime?.onProgressUpdated(() => {
    void refreshSilently();
  });
  void load();
});

onShow(() => {
  if (task.value) {
    void load();
  }
});

onUnload(() => {
  realtime?.close();
  if (pollTimer) {
    clearInterval(pollTimer);
  }
});
</script>

<style scoped>
.detail-page {
  padding-bottom: var(--space-7);
}
.hero {
  background: var(--header-bg);
  color: var(--header-text);
  padding: var(--space-5) var(--space-4);
}
.hero-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.no {
  color: #cbb98e;
  font-size: var(--font-xs);
}
.seal {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: 3px double currentColor;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 700;
  transform: rotate(-8deg);
  color: #cbb98e;
}
.seal-done {
  color: #8fbd8f;
}
.seal-review {
  color: #e3c37f;
}
.seal-cancel {
  opacity: 0.7;
}
.title {
  display: block;
  font-family: var(--font-display);
  font-size: var(--font-xl);
  margin-top: var(--space-3);
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
.tag {
  border: 1px solid #cbb98e;
  border-radius: var(--radius-pill);
  padding: 2px var(--space-3);
  font-size: var(--font-xs);
}
.tag.gold {
  color: #f0c76a;
  border-color: #f0c76a;
}
.tag.red {
  color: #e7a194;
  border-color: #e7a194;
}
.deadline {
  margin-top: var(--space-3);
  font-size: var(--font-sm);
  color: #d8c69a;
}
.description {
  display: block;
  margin-top: var(--space-3);
  color: var(--header-text);
  line-height: 1.6;
  white-space: pre-wrap;
}
.btn {
  margin-top: var(--space-4);
  border-radius: var(--radius-md);
  font-weight: 600;
}
.btn.primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
}
.btn.small {
  margin: 0;
  padding: 0 var(--space-4);
  font-size: var(--font-xs);
}
.btn.ok {
  background: var(--color-success);
  color: #fff;
}
.btn.no {
  background: var(--color-danger);
  color: #fff;
}
.section {
  margin: var(--space-4);
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.section-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--font-base);
  display: block;
  margin-bottom: var(--space-3);
}
.add-file {
  color: var(--color-brass);
  font-size: var(--font-sm);
}
.member,
.review-row,
.file-row,
.extend-row,
.timeline-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px dashed var(--color-border);
}
.member-name {
  font-weight: 600;
  min-width: 96px;
}
.member-dept,
.member-status,
.file-meta,
.timeline-time,
.muted {
  color: var(--color-ink-muted);
  font-size: var(--font-xs);
}
.progress-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-2);
}
.note {
  flex: 1;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2);
  background: var(--color-bg);
  font-size: var(--font-xs);
}
.review-btns {
  display: flex;
  gap: var(--space-2);
}
.area-tabs {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.chip {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
  color: var(--color-ink-muted);
  font-size: var(--font-xs);
}
.chip.active {
  background: var(--color-leather);
  color: #fff;
}
.file-row {
  justify-content: space-between;
}
.file-name {
  font-weight: 600;
}
.preview-link {
  color: var(--color-brass);
  font-size: var(--font-xs);
}
.timeline-row {
  align-items: flex-start;
  border-bottom: none;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--timeline-line);
  margin-top: 6px;
  flex-shrink: 0;
}
.timeline-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.extend-row {
  flex-wrap: wrap;
}
</style>

<style scoped>
.detail-page {
  background:
    radial-gradient(circle at 50% 0%, rgba(224, 170, 60, 0.15), transparent 42%),
    radial-gradient(circle at 8% 100%, rgba(75, 195, 210, 0.10), transparent 32%),
    var(--color-bg);
}
.hero {
  background: var(--texture-wood);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px) saturate(140%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.045) inset,
    0 16px 34px rgba(0, 0, 0, 0.22);
  position: relative;
}
.hero::after {
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
.no {
  letter-spacing: 1px;
  color: #e3c982;
}
.title {
  letter-spacing: 1px;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}
.tags {
  gap: var(--space-2);
}
.tag {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(227, 201, 130, 0.38);
  letter-spacing: 1px;
}
.seal {
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.18);
}
.description {
  color: #f2e6c9;
  font-size: var(--font-sm);
}
.section {
  position: relative;
  background: var(--texture-paper);
  border: 1px solid rgba(148, 163, 190, 0.16);
  border-radius: 14px;
  box-shadow: var(--shadow-sm);
  padding: var(--space-5);
  backdrop-filter: blur(18px) saturate(130%);
}
.section::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--color-brass), transparent 70%);
}
.section-title {
  letter-spacing: 2px;
  color: #f2ce85;
}
.section-head {
  border-bottom: 1px dashed rgba(107, 74, 47, 0.25);
  padding-bottom: var(--space-2);
  margin-bottom: var(--space-3);
}
.btn {
  letter-spacing: 1px;
}
.btn.primary {
  background: var(--texture-brass);
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
.member,
.review-row,
.file-row,
.extend-row {
  border-bottom: 1px dashed rgba(107, 74, 47, 0.2);
}
.file-row:active {
  background: rgba(192, 140, 46, 0.06);
}
.dot {
  width: 9px;
  height: 9px;
  box-shadow: 0 0 0 3px rgba(192, 140, 46, 0.14);
}
.chip {
  background: rgba(255, 255, 255, 0.045);
  border-color: rgba(148, 163, 190, 0.20);
  transition: all 180ms ease;
}
.chip:hover {
  background: rgba(255, 255, 255, 0.09);
}
.chip.active {
  background: linear-gradient(90deg, rgba(224, 170, 60, 0.16), rgba(224, 170, 60, 0.03));
  color: #f2ce85;
  border-color: rgba(224, 170, 60, 0.22);
}
.note,
.field {
  background: rgba(255, 255, 255, 0.055);
  border-color: rgba(148, 163, 190, 0.20);
  color: var(--color-ink);
  backdrop-filter: blur(14px) saturate(130%);
}
</style>

<style scoped>
.accept-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(6, 8, 14, 0.46);
  backdrop-filter: blur(9px);
  animation: fade-in 180ms ease both;
}
.accept-card {
  width: 360px;
  max-width: calc(100vw - 40px);
  padding: 30px;
  border-radius: 26px;
  text-align: center;
  background: rgba(30, 37, 50, 0.82);
  border: 1px solid rgba(224, 170, 60, 0.24);
  backdrop-filter: blur(30px) saturate(150%);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.34);
  animation: pop-in 340ms cubic-bezier(0.2, 0.9, 0.25, 1.25) both;
}
.accept-check {
  width: 72px;
  height: 72px;
  margin: 0 auto 18px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #0e241a;
  font-size: 30px;
  font-weight: 800;
  background: linear-gradient(135deg, #54c596, #4bc3d2);
  box-shadow: 0 0 0 10px rgba(84, 197, 150, 0.10), 0 14px 30px rgba(84, 197, 150, 0.22);
}
.accept-title {
  display: block;
  margin: 0;
  font-family: var(--font-display);
  font-size: 24px;
  color: #eef1f8;
}
.accept-text {
  display: block;
  margin-top: 10px;
  color: #aab3c8;
  font-size: 15px;
}
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes pop-in {
  from { transform: scale(0.76); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>

<style scoped>
.subtask-row,
.add-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}
.checkbox {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: #241a08;
  font-size: 15px;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(224, 170, 60, 0.30);
  flex-shrink: 0;
}
.checkbox.checked {
  background: linear-gradient(145deg, #f2cf77, #c8902c);
  border-color: rgba(224, 170, 60, 0.35);
}
.subtask-title {
  flex: 1;
  color: #eef1f8;
  font-size: 14px;
}
.subtask-title.done {
  color: #77849a;
  text-decoration: line-through;
}
.subtask-delete {
  color: #ffb2a8;
  font-size: 12px;
}
.add-row {
  margin-top: var(--space-3);
}
.note {
  flex: 1;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2);
  background: var(--color-bg);
  font-size: var(--font-xs);
}
.comment-row {
  padding: var(--space-3) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.comment-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.comment-author {
  color: #f2ce85;
  font-weight: 700;
  font-size: 14px;
}
.comment-time {
  color: #7f8aa0;
  font-size: 12px;
}
.comment-content {
  display: block;
  margin-top: 7px;
  color: #e8ecf6;
  font-size: 14px;
  line-height: 1.6;
}
</style>
