#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

STAMP="$(date +%Y%m%d_%H%M%S)"
mkdir -p ./backups

docker compose exec -T postgres \
  pg_dump -U taskguild -d taskguild --no-owner --no-privileges \
  | gzip > "./backups/taskguild_${STAMP}.sql.gz"

# 仅保留最近 30 份本地备份
ls -1t ./backups/taskguild_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm -f

echo "备份完成：./backups/taskguild_${STAMP}.sql.gz"
echo "提示：如需异地留档，可安装 coscli 后把 ./backups 同步到 COS："
echo "  coscli sync ./backups cos://<bucket>/backups/postgres/"
