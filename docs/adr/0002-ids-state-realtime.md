# ADR-0002：主键、状态机与实时方案

- 状态：已接受
- 日期：2026-08-15

决策：
1. 所有对外资源主键用 Prisma `cuid()` 字符串（替代计划中的自增 bigint），满足 security-best-practices「不暴露可枚举 ID」的要求，同时无需单独 public_id 字段。
2. 逾期为派生状态：cron 每分钟落库 `overdue_at` 并通知，批准延期即清空。
3. Web 端 Socket.IO（websocket→polling 自动降级）；小程序端 10s 轮询 + onShow/下拉刷新，不引入 weapp.socket.io。
4. 审核粒度按成员提交；队长 `submitAll=true` 可代全队提交；任务状态由成员提交聚合推导。

后果：主键略长但内部工具无感知；小程序不保证秒级推送（以轮询换取稳定性）；状态机必须严格遵循 tasks.service.ts 的转移规则。
