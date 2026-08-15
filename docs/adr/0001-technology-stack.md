# ADR-0001：技术栈选型

- 状态：已接受
- 日期：2026-08-15

决策：uni-app（Vue3+Vite+TS）+ NestJS 11（TS，Express 适配器）+ Prisma 7 + PostgreSQL 16 + 腾讯云 COS；单机 Docker Compose 部署，不引入 Redis/消息队列/微服务。

理由：小团队（<50 人）单一代码库维护双端（H5+mp-weixin）成本最低；前后端同语言共享 DTO/枚举；Prisma schema 单一事实源；单机性能远超出需求。

后果：放弃 React/Taro 路线与 FastAPI；放弃重型游戏化基础设施；未来扩展时可替换适配器（Fastify、TencentDB）而不改业务代码。
