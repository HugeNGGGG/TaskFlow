# 验收清单

## 整体（对应需求文档第八节）

- [ ] 双端完整闭环：发布任务 → 接取 → 更新进度 → 提交成果 → 审核通过/打回 → 完成归档
- [ ] 文件上传下载留档可用，历史版本可回溯
- [ ] 发布官可实时查看全员任务进度与统计
- [ ] 游戏化（等级/经验/积分/称号）正常结算与展示
- [ ] 一键部署说明与初始化脚本可跑通

## 里程碑

- U0：令牌三层层级落地、无裸色值、H5/mp 双端截图一致、低端安卓流畅
- M0：登录/刷新/登出、小程序首绑、Guard 拦截越权、空库迁移+种子幂等、docker compose 可访问 health 与 Swagger
- M1：双端「发布→接取→状态变化」、并发接取不超 max_members、筛选排序与 0/3 计数正确、草稿不可见
- M2：进度→提交→通过/打回→完成/驳回重做、版本回溯与 zip、越权拒绝、逾期自动标记、Web 秒级/小程序 10s
- M3：看板数字口径一致、趋势/分布图正确、排行榜排序与并列规则、部门筛选口径
- M4：经验结算公式（紧急/按时/提前/逾期/驳回/下限）、称号自动颁发、订阅消息、部署与备份

## 本地自测

```bash
pnpm install
pnpm --filter @task-guild/shared build
pnpm --filter @task-guild/api prisma:generate
# 启动 PostgreSQL（Docker）并设置 apps/api/.env 的 DATABASE_URL
pnpm --filter @task-guild/api prisma:migrate
pnpm --filter @task-guild/api prisma:seed
pnpm dev:api   # http://localhost:3000/api/docs
pnpm dev:web   # http://localhost:5173
```

默认账号：`admin / ChangeMe123!`（管理员）、`guildmaster`（发布官）、`adventurer1/2`（冒险者），密码同初始密码。
