#!/usr/bin/env bash
# deploy.sh — 阿里云 ECS 一键部署脚本（纯 IP + HTTP 方案）
#
# 用法（在服务器上以 root 执行）：
#   cd /opt/my-shop
#   bash deploy.sh <公网IP> [硅基流动API_KEY]
#
# 示例：
#   bash deploy.sh 120.26.82.124
#   bash deploy.sh 120.26.82.124 sk-xxxxxxxxxxxxxxxx
#
# 脚本是幂等的：可反复执行；已存在的 .env 不会被覆盖（除非加 --force-env）

set -euo pipefail

PUBLIC_IP="${1:-}"
SILICONFLOW_KEY="${2:-}"

if [[ -z "$PUBLIC_IP" ]]; then
  echo "[错误] 必须传入公网 IP，例如：bash deploy.sh 120.26.82.124"
  exit 1
fi

echo "=========================================="
echo " 微商城部署脚本"
echo " 目标服务器: $PUBLIC_IP"
echo "=========================================="

# ---- 1. 检查 Docker ----
if ! command -v docker &>/dev/null; then
  echo "[1/6] Docker 未安装，开始安装..."
  curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun
  systemctl enable --now docker
else
  echo "[1/6] Docker 已安装：$(docker --version)"
fi

if ! docker compose version &>/dev/null; then
  echo "[错误] Docker Compose v2 未安装，请手动安装 docker-compose-plugin"
  exit 1
fi

# ---- 2. 配置国内镜像加速 ----
if [[ ! -f /etc/docker/daemon.json ]]; then
  echo "[2/6] 配置 Docker 国内镜像加速..."
  mkdir -p /etc/docker
  cat > /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.m.daocloud.io",
    "https://docker.1panel.live",
    "https://hub.rat.dev",
    "https://dockerproxy.net"
  ]
}
EOF
  systemctl restart docker
else
  echo "[2/6] Docker 镜像加速已配置，跳过"
fi

# ---- 3. 生成 .env（若不存在） ----
if [[ ! -f .env ]] || [[ "${3:-}" == "--force-env" ]]; then
  echo "[3/6] 生成 .env 生产配置..."
  JWT_SECRET=$(openssl rand -hex 32)
  MYSQL_PASSWORD=$(openssl rand -hex 16)

  cat > .env <<EOF
# 生产环境配置（由 deploy.sh 自动生成于 $(date '+%Y-%m-%d %H:%M:%S')）
NODE_ENV=production

# 数据库
MYSQL_PASSWORD=${MYSQL_PASSWORD}
MYSQL_DATABASE=myshop

# JWT 密钥（32 字节随机 hex）
JWT_SECRET=${JWT_SECRET}

# AI 客服（硅基流动）— 为空则 AI 客服接口降级返回未配置
SILICONFLOW_API_KEY=${SILICONFLOW_KEY}
SILICONFLOW_MODEL=Qwen/Qwen2.5-7B-Instruct

# CORS 白名单：公网 IP 访问
CORS_ORIGINS=http://${PUBLIC_IP}

# AI 客服生成的商品详情页链接前缀（web 服务对外是 80 端口）
FRONTEND_URL=http://${PUBLIC_IP}

# 前端 API 基址留空 → 走 nginx 同源反代
VITE_API_BASE=
EOF
  chmod 600 .env
  echo "      .env 已生成（权限 600）"
  if [[ -z "$SILICONFLOW_KEY" ]]; then
    echo "      [提示] 未提供 SILICONFLOW_API_KEY，AI 客服不可用；请编辑 .env 补上后重启 backend"
  fi
else
  echo "[3/6] .env 已存在，跳过（如需重建加参数 --force-env）"
fi

# ---- 4. 校验必备文件 ----
echo "[4/6] 校验项目文件..."
for f in docker-compose.yml docker-compose.prod.yml server/Dockerfile web/Dockerfile server/sql/init.sql; do
  if [[ ! -f "$f" ]]; then
    echo "[错误] 缺少文件：$f"
    exit 1
  fi
done
echo "      项目文件完整"

# ---- 5. 构建镜像 ----
echo "[5/6] 构建 Docker 镜像（首次约 5-10 分钟）..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# ---- 6. 启动服务 ----
echo "[6/6] 启动服务..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

echo ""
echo "等待服务健康检查（约 60 秒）..."
sleep 60
docker compose ps

echo ""
echo "=========================================="
echo " 部署完成！"
echo " 访问地址：http://${PUBLIC_IP}"
echo " 演示账号：demo1 / 123456"
echo ""
echo " 常用运维命令："
echo "   查看日志：docker compose logs -f backend"
echo "   重启服务：docker compose restart backend"
echo "   停止全部：docker compose down"
echo "=========================================="

# ---- 验证 ----
if curl -sf http://127.0.0.1/healthz >/dev/null; then
  echo "[√] web/nginx 健康检查通过"
else
  echo "[×] web/nginx 未就绪，请执行 docker compose logs web 排查"
fi

if curl -sf http://127.0.0.1/home/health >/dev/null; then
  echo "[√] backend 健康检查通过"
else
  echo "[×] backend 未就绪，请执行 docker compose logs backend 排查"
fi
