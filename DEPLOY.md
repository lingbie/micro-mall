# 微商城阿里云 ECS 部署指南（纯 IP + HTTP）

目标服务器：**阿里云 ECS `<SERVER_IP>`**  
访问方式：**http://<SERVER_IP>**（80 端口，无域名，无 HTTPS）

---

## 一、阿里云控制台配置（必做）

### 1.1 安全组入方向规则

登录阿里云 ECS 控制台 → 实例 → 安全组 → 配置规则 → 入方向，添加：

| 优先级 | 协议 | 端口 | 授权对象 | 说明 |
|---|---|---|---|---|
| 1 | TCP | 22 | 你的本机 IP | SSH 登录（限制来源 IP 更安全） |
| 1 | TCP | 80 | 0.0.0.0/0 | HTTP 访问 |

**⚠️ 严禁放行以下端口**（这些服务只在 Docker 内网互访）：
- `3306`（MySQL）、`6379`（Redis）、`8360`（后端）、`8361`（RAG）、`8080`

### 1.2 服务器最低配置

- **CPU**：2 核
- **内存**：4 GB（RAG 服务加载 embedding 模型需要）
- **磁盘**：40 GB
- **系统**：Ubuntu 22.04 / Debian 12 / CentOS 7.9+ 任一

---

## 二、上传项目代码到服务器

### 方式 A：Git 拉取（推荐）

```bash
ssh root@<SERVER_IP>
cd /opt
git clone <你的仓库地址> my-shop
cd my-shop
```

### 方式 B：本地 PowerShell 打包上传

**在你本机（Windows PowerShell）执行：**

```powershell
cd <项目本地路径>

# 打包（排除 node_modules / dist / 虚拟环境）
tar --exclude=node_modules --exclude=dist --exclude=.venv `
    --exclude=__pycache__ --exclude=.env `
    -czf my-shop.tar.gz *

# 上传
scp my-shop.tar.gz root@<SERVER_IP>:/opt/

# 服务器端解压
ssh root@<SERVER_IP> "mkdir -p /opt/my-shop && tar -xzf /opt/my-shop.tar.gz -C /opt/my-shop && rm /opt/my-shop.tar.gz"
```

---

## 三、一键部署（推荐）

**SSH 登录服务器后执行：**

```bash
cd /opt/my-shop
bash deploy.sh <SERVER_IP> sk-你的硅基流动APIKey
```

> 若暂时没有硅基流动 API Key，可以省略第二个参数，AI 客服接口会降级返回未配置，其他功能不受影响。
>
> API Key 申请：<https://cloud.siliconflow.cn> → API 密钥 → 新建

脚本会自动完成：
1. 安装 Docker（用阿里云镜像，速度快）
2. 配置国内镜像加速器
3. 生成 `.env`（含随机 JWT 密钥和 MySQL 密码）
4. 校验项目文件完整性
5. 构建 5 个服务的镜像
6. 启动容器并做健康检查

**看到"部署完成！"提示后，浏览器访问 <http://<SERVER_IP>>**，演示账号：`demo1 / 123456`

> **2026-09 实测记录（服务器 Ubuntu 22.04 / 2C2G）：**
> - 中科大 `docker.mirrors.ustc.edu.cn`、网易 `hub-mirror.c.163.com` 等镜像已失效，deploy.sh 已更新为实测可用的加速器列表（docker.1ms.run / docker.m.daocloud.io / docker.1panel.live / hub.rat.dev / dockerproxy.net）。
> - 服务器直连 `get.docker.com` 会被重置，Docker 改用阿里云 apt 源安装（见下文"部署实战备忘"）。
> - 3 个 Dockerfile 已加入国内源：pip 使用阿里云 PyPI 镜像，npm 使用 npmmirror（sed 替换 lockfile 中的 registry.npmjs.org），解决 files.pythonhosted.org / registry.npmjs.org 超时。
> - 2C2G 内存可完整跑通 5 个容器（RAG 依赖走 API，无本地模型），实测全容器 healthy。


---

## 三之二、部署实战备忘（首次部署踩坑记录）

```bash
# 1) get.docker.com 被重置 → 改用阿里云 apt 源安装 Docker
export DEBIAN_FRONTEND=noninteractive
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.gpg] https://mirrors.aliyun.com/docker-ce/linux/ubuntu jammy stable" > /etc/apt/sources.list.d/docker.list
apt-get update && apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

# 2) 端口覆盖语法：Compose v5 下用 !override 而非 !reset 给 web 重新赋值
#    （docker-compose.prod.yml 已处理，勿改回 !reset ["80:80"]，会清空端口映射）
```

---

## 四、手动部署（了解原理）

如果不想用脚本，可以逐步执行：

```bash
cd /opt/my-shop

# 1) 生成 .env
cat > .env <<EOF
NODE_ENV=production
MYSQL_PASSWORD=$(openssl rand -hex 16)
MYSQL_DATABASE=myshop
JWT_SECRET=$(openssl rand -hex 32)
SILICONFLOW_API_KEY=sk-你的key
SILICONFLOW_MODEL=Qwen/Qwen2.5-7B-Instruct
CORS_ORIGINS=http://<SERVER_IP>
VITE_API_BASE=
EOF
chmod 600 .env

# 2) 构建 + 启动（叠加 prod override）
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 3) 查看状态
docker compose ps
docker compose logs -f backend
```

---

## 五、生产架构说明

```
浏览器
   │  HTTP :80
   ▼
┌──────────────────────────┐
│ web (nginx:alpine)       │  唯一对外暴露的容器
│  - 静态资源 /usr/share/… │
│  - /home/* 反代          │
└───────┬──────────────────┘
        │ Docker 内网
        ▼
┌──────────────────────────┐
│ backend (Express :8360)  │  ← 不暴露到宿主机
└───┬────────────────┬─────┘
    │                │
    ▼                ▼
┌──────────┐    ┌──────────┐
│ mysql    │    │ rag      │── redis（会话缓存）
│ (数据)   │    │ (AI客服) │
└──────────┘    └──────────┘
```

**安全要点：**
- `docker-compose.prod.yml` 用 `ports: !reset []` 清空了 mysql/redis/backend/rag 的宿主机端口映射
- 只有 web 容器 80 端口对外，其余走 Docker 内网服务名互访
- `.env` 权限 600，仅 root 可读；`.gitignore` 已排除，不会入库
- 生产环境启动时 `config.js` 会校验 `JWT_SECRET` 非默认值，否则进程直接退出

---

## 六、日常运维

### 6.1 查看日志

```bash
cd /opt/my-shop
docker compose logs -f backend    # 后端日志
docker compose logs -f web        # nginx 访问日志
docker compose logs -f rag        # AI 客服日志
docker compose logs --tail=100 mysql
```

### 6.2 重启服务

```bash
docker compose restart backend         # 重启单个
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart   # 全部
```

### 6.3 更新代码后重新部署

```bash
cd /opt/my-shop
git pull                                 # 或重新上传 tar.gz 覆盖
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### 6.4 备份 MySQL 数据

```bash
# 手动备份
source .env
docker exec myshop-mysql mysqldump -uroot -p"$MYSQL_PASSWORD" myshop \
  > backup_$(date +%F_%H%M).sql

# 恢复
docker exec -i myshop-mysql mysql -uroot -p"$MYSQL_PASSWORD" myshop < backup_2026-09-13.sql
```

### 6.5 完全重置（危险！）

```bash
docker compose down -v     # -v 会删除数据卷，MySQL 数据全部丢失
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 七、故障排查

### 7.1 浏览器访问 <http://<SERVER_IP>> 打不开

```bash
# 1) 检查 web 容器状态
docker compose ps web              # 应为 healthy

# 2) 服务器本地能否访问
curl -v http://127.0.0.1/healthz   # 应返回 ok

# 3) 检查阿里云安全组是否放行 80 端口（最常见原因）

# 4) 检查服务器防火墙
ufw status                         # Ubuntu
systemctl status firewalld         # CentOS
```

### 7.2 前端能打开但接口报错

```bash
# 检查 nginx 反代是否通
curl http://127.0.0.1/home/health

# 检查 backend 日志
docker compose logs --tail=50 backend

# 常见原因：
# - MySQL 未就绪 → backend 会自动重试 30 次，等 90 秒
# - JWT_SECRET 用了默认值 → 生产模式下进程直接退出，看 backend 日志
# - CORS_ORIGINS 未包含 http://<SERVER_IP>
```

### 7.3 AI 客服不响应

```bash
docker compose logs -f rag

# 常见原因：
# - SILICONFLOW_API_KEY 为空或错误
# - RAG 容器构建失败（内存不足，需 4GB+）
# - 若 rag 起不来，backend 会自动降级为纯 LLM 模式，仍可使用
```

### 7.4 端口冲突

如果服务器上已经有别的服务占了 80 端口：

```bash
# 修改 docker-compose.prod.yml，web 服务改为
ports:
  - "8080:80"
# 然后访问 http://<SERVER_IP>:8080
# 记得同步更新 .env 的 CORS_ORIGINS=http://<SERVER_IP>:8080
```

---

## 八、后续升级路径

| 场景 | 建议 |
|---|---|
| 想加 HTTPS | 买个域名（阿里云万网 `.com` 首年 30 元）→ 解析到 IP → 用 certbot 申请 Let's Encrypt 免费证书 |
| 想上微信小程序 | 必须 HTTPS + 已备案域名（微信硬性要求） |
| 用户量增长 | 拆分：MySQL 上阿里云 RDS，Redis 上阿里云 Redis 版，服务器只跑 backend+web+rag |
| 想要 CI/CD | 用 GitHub Actions / 阿里云云效，`git push` 自动 SSH 部署 |

---

## 附：deploy.sh 参数说明

```bash
bash deploy.sh <公网IP> [硅基流动APIKey] [--force-env]

# 示例：
bash deploy.sh <SERVER_IP>                          # 首次部署，无 AI Key
bash deploy.sh <SERVER_IP> sk-xxxxx                 # 首次部署，带 AI Key
bash deploy.sh <SERVER_IP> sk-xxxxx --force-env     # 强制重建 .env（会覆盖旧的）
```
