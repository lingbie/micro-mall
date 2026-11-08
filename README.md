# micro-mall — AI 微商城

一个前后端分离的移动端微商城项目，内置基于 **RAG（检索增强生成）** 的智能客服。用户可以浏览商品、加购、下单，也可以随时向 AI 客服咨询商品信息——客服基于商城真实商品数据构建的知识库回答问题，支持多轮对话与省略式追问。

> 在线演示：http://120.26.82.124 （阿里云 ECS，Docker Compose 部署）

## 功能特性

### 商城（用户端）

- 注册 / 登录（JWT 鉴权）
- 商品分类、商品列表、搜索、商品详情
- 购物车、订单确认、订单列表
- 个人中心

### 管理后台（`/admin`）

- 数据看板、商品管理、订单管理、用户管理、管理员登录

### AI 智能客服

- **RAG 检索问答**：商品数据从 MySQL 导出为知识库（`server/rag/data/goods.md`），通过 LlamaIndex 构建向量索引，回答强制基于检索到的知识片段，杜绝幻觉编造商品
- **多轮对话记忆**：会话历史存入 Redis，模型结合上下文理解追问
- **追问改写（Condense Question）**：对"那90的呢""第一个怎么样"这类省略式追问，先用 LLM 结合历史改写成完整查询再检索，避免检索跑偏
- **图文回答**：回复自动附带商品详情页链接和款式图，链接前缀按运行环境自动改写

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + Vite + Vant 4 + Pinia（持久化）+ Vue Router + Vitest |
| 后端 | Node.js (Express 4) + MySQL 8（mysql2）+ JWT + express-rate-limit + Jest/Supertest |
| AI 客服 | Python 3.11 + FastAPI + LlamaIndex + SiliconFlow（Qwen2.5-7B + Embedding）+ Redis |
| 部署 | Docker Compose（5 个容器）+ Nginx 反代 |

## 架构

```
                    ┌───────────────────── Nginx (web) ─────────────────────┐
浏览器 / 移动端 ──▶ │  /            → Vue 构建产物（静态资源）                │
                    │  /home/**     → Node.js 后端 (backend, :8360)          │
                    │  /images/**   → 静态商品图片                           │
                    └──────────────────────┬────────────────────────────────┘
                                           │
                          ┌────────────────┴───────────────┐
                          │                                │
                    MySQL 8（商品/订单/用户数据）      RAG 服务 (:8361)
                    Redis 7（会话/验证码）             ├─ 知识库 goods.md ←─ export_goods_md.js
                                                      ├─ 向量索引 storage/  ←─ build_index.py
                                                      └─ SiliconFlow LLM + Embedding
```

## 目录结构

```
my-shop/
├── src/                  # Vue 3 前端（商城 + 管理后台）
│   ├── pages/            # 页面（Home/Cart/GoodsDetail/Chat/admin/...）
│   ├── api/              # axios 接口封装
│   ├── stores/           # Pinia 状态（含持久化）
│   └── components/       # 公共组件
├── public/images/mock/   # 商品图片（goods_<类目>_<序号>.jpg）
├── server/               # Express 后端
│   ├── controllers/ routes/ middleware/
│   ├── scripts/          # seed.js 建数据 / export_goods_md.js 导出知识库
│   ├── sql/              # init.sql（建库建表 + 144 件商品数据）
│   └── rag/              # AI 客服服务（独立 Python 进程）
│       ├── rag_server.py         # FastAPI：检索 + 追问改写 + 生成
│       ├── build_index.py        # 重建向量索引
│       ├── data/goods.md         # 知识库（由生产 DB 导出）
│       └── storage/              # 持久化的向量索引
├── web/                  # Nginx 配置（生产反代）
├── docker-compose.yml    # 本地/开发编排（mysql/redis/rag/backend/web）
├── docker-compose.prod.yml
├── deploy.sh             # 一键部署脚本
└── DEPLOY.md             # 阿里云 ECS 详细部署指南
```

## 快速开始

### 1. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，至少填写：

```ini
MYSQL_PASSWORD=你的数据库密码
JWT_SECRET=一串随机长字符串
SILICONFLOW_API_KEY=sk-xxx     # https://siliconflow.cn 申请
```

### 2. Docker 一键启动（推荐）

```bash
docker compose up -d --build
```

启动后访问 **http://localhost:8080**。容器会自动完成建库、灌入 144 件商品数据、启动全部服务。

> 端口冲突时可在 `.env` 中覆盖 `MYSQL_HOST_PORT` / `BACKEND_HOST_PORT` / `RAG_HOST_PORT` / `WEB_HOST_PORT`。

### 3. 本地开发模式（前后端热更新）

```bash
# 终端 1：RAG 服务（Python 3.11）
cd server/rag
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt   # Windows
.venv/Scripts/python build_index.py     # 首次需要构建向量索引
.venv/Scripts/python rag_server.py      # 监听 :8361

# 终端 2：后端（Node 20+，需本机 MySQL/Redis 或用 compose 只起这两个）
cd server
npm install
npm run seed    # 首次灌入商品数据
npm run dev     # 监听 :8360

# 终端 3：前端
npm install
npm run dev     # http://localhost:5173，/api 代理到 8360
```

### 4. 运行测试

```bash
npm test            # 前端 Vitest
cd server && npm test   # 后端 Jest + Supertest
```

## 生产部署

详见 [DEPLOY.md](DEPLOY.md)（阿里云 ECS + Docker Compose + Nginx，纯 IP + HTTP 方案），核心步骤：

```bash
git clone <本仓库> /opt/my-shop && cd /opt/my-shop
cp .env.example .env   # 填写真实密钥
./deploy.sh            # 构建并启动全部容器，仅暴露 80 端口
```

安全要点：MySQL/Redis/后端/RAG 端口**只保留在 Docker 内网**，宿主机仅开放 22 和 80。

## 常用运维命令

```bash
# 商品数据变更后，同步 AI 客服知识库（以生产 DB 为准）
docker exec -w /app -e FRONTEND_URL=http://localhost:5173 \
  myshop-backend node scripts/export_goods_md.js
docker exec myshop-rag python build_index.py
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build rag

# 查看服务状态 / 日志
docker compose ps
docker logs -f myshop-rag
```

## API 概览

| 模块 | 前缀 | 说明 |
|---|---|---|
| 认证 / 用户 | `/home/register` `/home/login` `/home/user` | JWT 鉴权，限流保护 |
| 商品 | `/home/goods` `/home/goods/list` `/home/goods/album` `/home/category/list` | 列表、详情、图册、分类 |
| 购物车 | `/home/goods/cart` | JWT 保护 |
| 订单 | `/home/order/*` | 创建 / 支付 / 取消 / 确认，JWT 保护 |
| AI 客服 | `/home/chat` `/home/chat/history` | 转发 RAG 服务，带会话记忆 |
| 管理后台 | `/admin/api/*` | 管理员鉴权，登录限流 |
| RAG 内部 | `:8361 /rag/session/query` | 多轮问答（仅内网访问） |

## License

本项目基于 [MIT](LICENSE) 协议开源。
