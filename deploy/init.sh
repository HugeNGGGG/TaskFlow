#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "已生成 deploy/.env，请先填写密钥与域名后再运行。"
  exit 1
fi

echo "[1/4] 构建前端产物（H5）"
cd ../apps/web
corepack pnpm install --frozen-lockfile
corepack pnpm run build:h5
cd ../../deploy

echo "[2/4] 构建并启动服务"
docker compose up -d --build

echo "[3/4] 执行数据库迁移与种子数据"
docker compose exec -T api sh -c "pnpm exec prisma migrate deploy && pnpm exec prisma db seed"

echo "[4/4] 完成"
echo "管理端：${PUBLIC_BASE_URL:-https://guild.example.com}/#/admin/overview"
echo "接口文档：${PUBLIC_BASE_URL:-https://guild.example.com}/api/docs"
echo "初始管理员：admin / 密码见 deploy/.env 的 ADMIN_INITIAL_PASSWORD"
