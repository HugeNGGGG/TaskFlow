# 冒险者公会 · Task Guild

公司内部任务协作平台：Web（uni-app H5）+ 微信小程序（mp-weixin）双端，NestJS + Prisma + PostgreSQL 后端，腾讯云 COS 对象存储。

## 目录

- `apps/web` — uni-app 前端（H5 + 微信小程序）
- `apps/api` — NestJS 后端
- `packages/shared` — 双端共享枚举/常量/类型
- `deploy/` — Docker Compose、Caddy、初始化与备份脚本
- `docs/` — ADR、API、UI 设计系统、验收清单、技能采纳记录

## 里程碑状态

- ✅ M0 基础设施：monorepo、Prisma 数据模型与初始迁移、JWT + 小程序绑定、RBAC、种子、单测（16 项）
- ✅ M1 任务大厅/发布/接取（后端 + 双端页面）
- ✅ M2 进度/审核/附件/实时（后端 + 双端页面，WebSocket + 小程序轮询）
- ✅ M3 看板/统计/排行榜（后端 + Web 看板页面）
- ✅ M4 游戏化/通知/公告 + 一键部署脚本（后端 + 双端页面）

实现期按计划用 Tavily 检索 GitHub 并安装了 4 个通过门槛的技能，记录见 [docs/skills-adopted.md](docs/skills-adopted.md)。

## 快速开始

```bash
pnpm install
pnpm --filter @task-guild/shared build
pnpm --filter @task-guild/api prisma:generate
cp apps/api/.env.example apps/api/.env   # 填写 DATABASE_URL / 密钥
pnpm --filter @task-guild/api prisma:migrate
pnpm --filter @task-guild/api prisma:seed
pnpm dev:api
pnpm dev:web
```

默认账号：`admin`（管理员）、`guildmaster`（发布官）、`adventurer1` / `adventurer2`（冒险者），初始密码为 `.env` 中 `ADMIN_INITIAL_PASSWORD`（默认 `ChangeMe123!`）。

详细部署见 [deploy/README.md](deploy/README.md)，接口清单见 [docs/api.md](docs/api.md)。
