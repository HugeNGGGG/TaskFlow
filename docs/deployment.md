# 部署说明

## 1. 前置条件

- 一台腾讯云轻量服务器，建议 2C4G。
- 已备案域名，例如 `guild.example.com`。
- 域名 DNS 已指向服务器。
- 微信公众平台已配置小程序合法域名。
- 服务器已安装 Docker 与 Docker Compose。

## 2. 环境变量

复制 `.env.example` 为部署环境文件，至少填写：

```text
POSTGRES_PASSWORD=请改成强密码
JWT_ACCESS_SECRET=请改成随机长字符串
JWT_REFRESH_SECRET=请改成另一个随机长字符串
WX_APPID=你的小程序 AppID
WX_SECRET=你的小程序 AppSecret
PUBLIC_BASE_URL=https://guild.example.com
```

可选：

```text
COS_SECRET_ID=
COS_SECRET_KEY=
COS_BUCKET=
COS_REGION=ap-guangzhou
```

如果不配置 COS，会使用服务器本地存储目录 `storage/`。

## 3. 构建前端

在项目根目录执行：

```bash
pnpm install
pnpm --filter @task-guild/shared build
pnpm --filter @task-guild/web build:h5
pnpm --filter @task-guild/web build:mp-weixin
```

## 4. 数据库迁移与种子

部署前必须执行迁移：

```bash
pnpm --filter @task-guild/api prisma migrate deploy
pnpm --filter @task-guild/api prisma:seed
```

本地开发使用：

```bash
pnpm --filter @task-guild/api prisma:migrate
```

## 5. 启动服务

```bash
cd deploy
docker compose up -d
```

访问：

- H5：`https://guild.example.com/`
- API 健康检查：`https://guild.example.com/api/v1/health`
- Swagger：`https://guild.example.com/api/docs`

## 6. 大屏部署

大屏地址：

```text
https://guild.example.com/#/pages/display/index
```

部署步骤：

1. 准备一台连接公司局域网的小主机、Android TV 或迷你 PC。
2. 打开浏览器访问大屏地址。
3. 使用发布官或管理员账号登录一次。
4. 将浏览器设为全屏。
5. 保持页面常开，大屏每 2 小时自动刷新。

发布官和管理员在大屏右上角可以手动刷新。

## 7. 备份

每日凌晨备份 PostgreSQL 到 COS：

```bash
deploy/backup.sh
```

如未配置 COS，请在服务器上自行保存备份文件。

## 8. 小程序发布

1. 用微信开发者工具导入 `apps/web/dist/build/mp-weixin`。
2. 在微信公众平台配置合法域名。
3. 上传代码并提交审核。

## 9. 常见问题

- 如果页面能打开但数据为空：确认后端、数据库已启动，前端 CORS 和 API 地址正确。
- 如果大屏提示未登录：使用发布官或管理员账号登录后保持浏览器会话。
- 如果头像上传失败：确认 COS 或本地存储目录可写。
