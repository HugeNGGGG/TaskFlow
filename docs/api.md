# API 清单（/api/v1）

统一错误格式 `{code, message}`；JWT 放 `Authorization: Bearer`；Swagger 见 `/api/docs`。角色：M+=登录，Mgr+=发布官/管理员，Admin=管理员。

| 方法 | 路径 | 角色 | 说明 |
|---|---|---|---|
| POST | /auth/login | 公开 | Web 账密登录 |
| POST | /auth/refresh | 公开 | 刷新令牌（轮换） |
| POST | /auth/logout | M+ | 吊销刷新令牌 |
| POST | /auth/wechat/login | 公开 | code2Session；未绑定返回 bindToken |
| POST | /auth/wechat/bind | 公开 | bindToken+账密绑定 |
| GET | /auth/me | M+ | 当前用户 |
| GET/POST/PATCH | /users，/users/:id | Admin | 用户管理 |
| PATCH | /users/:id/roles | Admin | 角色位标记 |
| POST | /users/:id/reset-password | Admin | 重置密码 |
| PUT | /users/me/notification-prefs | M+ | 通知开关 |
| GET/POST/PATCH/DELETE | /departments | 读 M+ / 写 Admin | 部门 |
| GET/POST/PATCH/DELETE | /categories | 读 M+ / 写 Admin | 类别 |
| GET/POST/PATCH | /tasks，/tasks/:id | 读 M+ / 写 Mgr+ | 任务 CRUD（草稿/发布） |
| POST | /tasks/:id/publish /cancel | Mgr+ | 发布/取消 |
| POST | /tasks/:id/accept | M+ | 悬赏接取（防超员事务） |
| POST/DELETE | /tasks/:id/assignments(/:userId) | Mgr+ | 追加指派/移出 |
| POST | /tasks/:id/captain | Mgr+ | 设队长 |
| POST | /tasks/:id/progress | M+ | 更新进度（写时间线） |
| GET | /tasks/:id/timeline | M+ | 时间线 |
| POST | /tasks/:id/submissions/me | M+ | 提交（队长可 submitAll） |
| GET | /tasks/:id/submissions | M+ | 成员提交状态 |
| POST | /tasks/:id/submissions/:userId/review | Mgr+ | 通过/打回 |
| POST/GET | /tasks/:id/extensions(/:id/decide) | M+/Mgr+ | 延期申请/审批 |
| POST | /tasks/:id/attachments/presign | M+ | 上传签名（COS 直传或本地直传） |
| POST | /tasks/:id/attachments/confirm | M+ | 上传完成写元数据（版本+1） |
| POST | /attachments/upload-direct | M+ | 本地模式直传（multipart） |
| GET | /tasks/:id/attachments | M+ | 附件列表（按角色过滤） |
| GET | /attachments/:id/presign | M+ | 下载签名 |
| GET | /tasks/:id/attachments/zip | M+ | 打包下载 |
| GET | /dashboard/overview,by-category,by-department,trend | Mgr+ | 看板 |
| GET | /stats/me, /stats/leaderboard | M+ | 个人战绩/排行榜 |
| GET | /stats/members | Mgr+ | 员工负载/按时率/逾期 |
| GET/PUT | /gamification/levels,titles,me(,xp-ledger) | 公开/M+ | 等级/称号/我的称号 |
| GET/PUT | /configs/xp-rules | Mgr+ | 经验规则 |
| POST | /xp/manual-adjust | Admin | 手工调分 |
| GET/POST/PATCH/DELETE | /notifications(/:id/read) | M+ | 消息中心 |
| GET/POST/PATCH/DELETE | /announcements | 读 M+/写 Mgr+ | 公告 |
| GET | /health | 公开 | 健康检查 |

WebSocket（`/ws`，握手带 JWT）：`subscribe:task`、`unsubscribe:task`、`ping`；服务端推送 `task.status_changed`、`progress.updated`、`timeline.appended`、`review.updated`、`notification.new`。
