# 冒险者公会 Task Guild 技术总览

## 1. 产品概述

公司内部任务协作与考勤平台，包含：

- Web H5 + 微信小程序双端。
- 任务发布、接取、进度、审核、附件留档。
- 轻量游戏化：等级、经验、积分、称号、排行榜。
- 实时看板与统计。
- 原生考勤模块：上下班打卡、工时、补卡、请假、考勤看板。
- 办公室实体大屏。

## 2. 技术栈

- 前端：uni-app（Vue 3 + TypeScript + Vite）
- 后端：NestJS 11 + TypeScript
- ORM：Prisma 7
- 数据库：PostgreSQL 16
- 实时：Socket.IO（Web），小程序轮询
- 文件存储：腾讯云 COS 或本地存储
- 图表：ECharts（H5）
- 测试：Jest、supertest、Playwright、Vitest 视模块而定

## 3. 项目结构

```text
apps/web/           uni-app 前端
apps/api/           NestJS 后端
packages/shared/    共享类型、枚举、常量
deploy/             Docker Compose、Caddyfile、初始化脚本
docs/               设计、API、部署、QA 文档
```

## 4. 后端模块

- `auth`：登录、刷新、登出、微信绑定
- `users`：用户、角色、个人资料、通知偏好、头像上传
- `departments`：部门管理
- `categories`：任务类别
- `tasks`：任务 CRUD、发布、接取、进度、提交、审核、延期
- `attachments`：附件上传、版本、下载、打包
- `comments`：任务评论与 @提醒
- `subtasks`：任务子任务/检查项
- `templates`：任务模板
- `stats`：个人战绩、排行榜、员工统计
- `gamification`：等级、称号、经验结算
- `notifications`：站内通知与微信订阅
- `announcements`：公告
- `realtime`：WebSocket 推送
- `reports`：任务 CSV 导出
- `search`：全局搜索
- `attendance`：打卡、工时、补卡、请假、考勤看板与导出
- `scheduler`：逾期检查等定时任务

## 5. 前端页面

- 首页：`pages/home/index`
- 任务大厅：`pages/index/index`
- 任务详情：`pages/task/detail`
- 我的工作台：`pages/my-work/index`
- 我的委托：`pages/mine/index`
- 消息：`pages/message/index`
- 个人中心：`pages/me/index`
- 个人设置：`pages/me/settings`
- 排行榜：`pages/me/rank`
- 全局搜索：`pages/search/index`
- 大屏：`pages/display/index`
- 考勤打卡：`pages/attendance/index`
- 考勤记录：`pages/attendance/records`
- 请假调休：`pages/attendance/leave`
- 管理端：
  - `pages/admin/overview`
  - `pages/admin/task-form`
  - `pages/admin/stats`
  - `pages/admin/members`
  - `pages/admin/announcements`
  - `pages/admin/settings`
  - `pages/admin/attendance`
  - `pages/admin/attendance-dashboard`
  - `pages/admin/attendance-settings`

## 6. 权限模型

使用 `users.role_mask` 位标记：

- `1` 冒险者
- `2` 发布官
- `4` 管理员

可通过位或叠加角色。

## 7. 主要数据模型

核心表：

- `User`、`Department`、`UserWechat`、`RefreshToken`
- `Task`、`TaskCategory`、`TaskAssignment`、`TaskEvent`
- `TaskComment`、`TaskSubtask`、`TaskTemplate`
- `Attachment`、`Review`、`DeadlineExtension`
- `XpLedger`、`UserStats`、`Level`、`Title`、`UserTitle`
- `Notification`、`Announcement`、`SystemConfig`
- `PunchRecord`、`WorkSession`、`CorrectionRequest`、`LeaveRequest`、`CompanySetting`

## 8. 认证方式

- JWT access token + refresh token。
- Web 账号密码登录。
- 微信小程序 `wx.login` 获取 openid，未绑定账号时使用 bindToken 绑定。

## 9. 文件存储

- 附件通过后端签发 presigned URL。
- COS 可用时上传到 COS。
- 未配置 COS 时使用本地存储目录。
- 头像上传使用 `POST /users/me/avatar`。

## 10. 常用验证命令

```bash
pnpm -r lint
pnpm --filter @task-guild/shared build
pnpm --filter @task-guild/api typecheck
pnpm --filter @task-guild/api test --runInBand
pnpm --filter @task-guild/api prisma:validate
pnpm --filter @task-guild/web type-check
pnpm --filter @task-guild/web build:h5
pnpm --filter @task-guild/web build:mp-weixin
```

## 11. 给测试 AI 的测试重点

建议测试 AI 围绕以下主题生成测试提示词：

1. 登录、刷新、登出、微信绑定。
2. 角色权限越权拦截。
3. 任务发布、接取、进度、提交、审核、取消全链路。
4. 并发接取任务不超过人数上限。
5. 附件上传、版本、下载、打包和越权访问。
6. 评论、@提醒、子任务、任务模板。
7. 游戏化经验、等级、积分、称号、排行榜。
8. 通知、公告、全局搜索、CSV 导出。
9. 大屏数据展示与手动刷新。
10. 考勤打卡、工时计算、补卡审批、请假审批、考勤看板。

## 12. 部署要点

详见 `docs/deployment.md`。

数据库新增表后需要执行迁移：

```bash
pnpm --filter @task-guild/api prisma:migrate
```

服务器执行：

```bash
pnpm --filter @task-guild/api prisma migrate deploy
```
