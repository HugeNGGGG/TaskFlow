# 部署说明（腾讯云轻量服务器）

## 前置条件

1. 已备案域名（如 `guild.example.com`）解析到服务器公网 IP；备案未完成前小程序只能使用体验版。
2. 服务器安装 Docker 与 Docker Compose，建议 2C4G。
3. 将 `deploy/Caddyfile` 中的 `guild.example.com` 替换为实际域名。
4. 在微信公众平台「开发 → 开发管理 → 开发设置 → 服务器域名」把该域名加入 request 合法域名。
5. （可选）开通腾讯云 COS 私有桶，在 `deploy/.env` 填入密钥；未配置时附件自动落到服务器本地 `storage/` 目录（仅限自测）。

## 一键部署

```bash
cd deploy
cp .env.example .env        # 填写全部密钥
sh init.sh                  # 构建前端 → 启动容器 → 迁移 → 种子
```

部署后：
- Web 端：`https://<域名>/`
- Swagger：`https://<域名>/api/docs`
- 初始管理员：`admin / <ADMIN_INITIAL_PASSWORD>`，登录后请立即改密。

## 日常运维

- 日志：`docker compose logs -f api`
- 备份：`sh backup.sh`（建议 crontab 每日 03:00 执行）
- 更新：`git pull && sh init.sh`
- 升级到托管数据库：只需改 `DATABASE_URL` 指向 TencentDB PostgreSQL。

## 小程序发布

1. `cd apps/web && pnpm run build:mp-weixin`
2. 微信开发者工具导入 `apps/web/dist/build/mp-weixin`，点击「上传」。
3. 设为体验版验证 → 提交审核（需先在公众平台申请订阅消息模板并填入 `WX_SUBSCRIBE_TEMPLATES`）。
