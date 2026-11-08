# 微商城后端（Express + MySQL），分层结构：utils/middleware/services/controllers/routes + app.js/index.js
FROM node:20-alpine

WORKDIR /app

# 仅安装生产依赖（jest/supertest 等 devDependencies 不进镜像）
# 国内部署：将 lockfile 中的 npm 官方源替换为 npmmirror 镜像加速
COPY package*.json ./
RUN sed -i 's|https://registry.npmjs.org/|https://registry.npmmirror.com/|g' package-lock.json && npm ci --omit=dev

# 拷贝后端源码（含 scripts/seed.js）
COPY . .

EXPOSE 8360

# 启动流程：等待 MySQL 就绪 -> 跑幂等 seed（创建 demo 用户）-> 启动服务
# 用 exec 使 node 成为主进程，正确接收 docker stop 的信号；seed 最多重试 30 次(约90s)
CMD ["sh", "-c", "for i in $(seq 1 30); do node scripts/seed.js && break; echo '[backend] 等待数据库就绪...'; sleep 3; done; exec node index.js"]
