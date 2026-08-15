# Task Guild 功能补全与实体大屏实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有「冒险者公会」任务协作平台上，补齐 PM 审查中最重要的协作、检索与运营能力，并增加面向办公室实体大屏的任务展示页。

**Architecture:** 保持现有 NestJS + Prisma + uni-app 结构。先做低耦合的展示层和前端体验优化，再逐步为任务增加评论、子任务、模板等数据能力。大屏复用现有 API，通过独立 H5 路由和只读展示组件实现，后续再增加专用只读令牌。

**Tech Stack:** NestJS 11、Prisma 7、PostgreSQL 16、uni-app Vue3、Socket.IO、Playwright。

**Spec:** `docs/acceptance-checklist.md`、`docs/api.md`、本文件。

## Global Constraints

- 保持 H5 与 mp-weixin 双端构建通过。
- 新页面沿用深色玻璃设计令牌，不在组件内写裸色值。
- 不引入 Redis、BullMQ、微服务、Turborepo。
- 每个阶段结束都要能本地启动并自测。

---

## Phase 1：实体大屏展示页

### Task 1: 创建大屏只读展示页

**Files:**
- Create: `apps/web/src/pages/display/index.vue`
- Modify: `apps/web/src/pages.json`

**Interfaces:**
- Consumes: `GET /tasks`、`GET /announcements`
- Produces: 大屏路由 `/pages/display/index`

- [ ] 创建 `pages/display/index.vue`，采用深色玻璃大屏布局，显示任务总数、待接取、进行中、待审核、逾期数量和任务卡片列表。
- [ ] 页面每 30 秒自动刷新任务列表，支持浏览器长期挂机。
- [ ] 在 `pages.json` 注册 `pages/display/index`，标题为「公会大屏」。
- [ ] H5 构建验证：`pnpm --filter @task-guild/web build:h5`
- [ ] mp-weixin 构建验证：`pnpm --filter @task-guild/web build:mp-weixin`

### Task 2: 为管理端增加大屏入口

**Files:**
- Modify: `apps/web/src/pages/admin/overview.vue`

- [ ] 在总览看板增加「打开大屏」入口，H5 环境使用 `window.open('/#/pages/display/index', '_blank')`。
- [ ] 非 H5 环境使用 `uni.navigateTo` 打开同一路由。

---

## Phase 2：任务协作核心补全

### Task 3: 任务评论与 @提醒

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/comments/comments.module.ts`
- Create: `apps/api/src/comments/comments.controller.ts`
- Create: `apps/api/src/comments/comments.service.ts`
- Create: `apps/api/src/comments/dto.ts`
- Modify: `apps/web/src/pages/task/detail.vue`

- [ ] 新增 `TaskComment` 模型：`id`、`taskId`、`authorId`、`content`、`createdAt`。
- [ ] 新增 `POST /tasks/:id/comments`、`GET /tasks/:id/comments`。
- [ ] 评论内容支持 `@昵称`，后端解析被 @ 用户并写入站内通知。
- [ ] 前端任务详情增加评论列表和输入框，提交后即时刷新。

### Task 4: 子任务与检查项

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/subtasks/subtasks.module.ts`
- Create: `apps/api/src/subtasks/subtasks.controller.ts`
- Create: `apps/api/src/subtasks/subtasks.service.ts`
- Modify: `apps/web/src/pages/task/detail.vue`

- [ ] 新增 `TaskSubtask` 模型：`id`、`taskId`、`title`、`isDone`、`sort`、`createdAt`。
- [ ] 新增 `POST /tasks/:id/subtasks`、`PATCH /tasks/:id/subtasks/:subtaskId`。
- [ ] 任务详情显示检查清单，成员可勾选完成。

### Task 5: 任务模板

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/templates/templates.module.ts`
- Create: `apps/api/src/templates/templates.controller.ts`
- Create: `apps/api/src/templates/templates.service.ts`
- Modify: `apps/web/src/pages/admin/task-form.vue`

- [ ] 新增 `TaskTemplate` 模型：`id`、`name`、`titlePrefix`、`description`、`difficulty`、`xpReward`、`maxMembers`、`acceptMode`、`needReview`。
- [ ] 新增 `GET/POST /task-templates`。
- [ ] 发布任务表单支持从模板填充。

---

## Phase 3：个人效率与文件体验

### Task 6: 我的工作台

**Files:**
- Create: `apps/web/src/pages/my-work/index.vue`
- Modify: `apps/web/src/pages.json`
- Modify: `apps/web/src/pages/home/index.vue`

- [ ] 新增我的工作台页，展示：待我处理、我负责、即将逾期、最近完成。
- [ ] 首页「我的委托」入口改为进入我的工作台。

### Task 7: 图片与 PDF 在线预览

**Files:**
- Modify: `apps/api/src/attachments/attachments.controller.ts`
- Modify: `apps/web/src/pages/task/detail.vue`

- [ ] 附件列表对图片、PDF 显示「预览」按钮。
- [ ] H5 使用 `window.open` 打开带鉴权的临时预览 URL；小程序使用 `uni.openDocument`。

---

## Phase 4：运营增强

### Task 8: 报表导出

**Files:**
- Create: `apps/api/src/reports/reports.module.ts`
- Create: `apps/api/src/reports/reports.controller.ts`
- Create: `apps/api/src/reports/reports.service.ts`
- Modify: `apps/web/src/pages/admin/stats.vue`

- [ ] 新增 `GET /reports/export-tasks?format=csv`，导出任务清单 CSV。
- [ ] 管理端员工统计页增加导出按钮。

### Task 9: 全局搜索

**Files:**
- Create: `apps/api/src/search/search.module.ts`
- Create: `apps/api/src/search/search.controller.ts`
- Create: `apps/api/src/search/search.service.ts`
- Modify: `apps/web/src/pages/home/index.vue`

- [ ] 新增 `GET /search?q=`，返回任务、成员、附件摘要。
- [ ] 首页顶部增加全局搜索入口。

---

## Execution Notes

- 先执行 Phase 1，确认大屏可独立运行。
- 每完成一个 Phase，运行后端测试、前端 type-check、H5/mp-weixin 构建。
- 若数据库迁移不可用，则只更新 schema 和类型，不强制本地迁移；部署时统一执行。
