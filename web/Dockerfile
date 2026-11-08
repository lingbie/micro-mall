# 微商城前端：多阶段构建（Vite 打包 -> nginx 托管 + 反代后端）
# 注意：构建上下文为仓库根（my-shop/），dockerfile 位于 web/Dockerfile

# ---- 构建阶段 ----
FROM node:20-alpine AS build
WORKDIR /app

# 先装依赖（含 devDependencies：vite / @vitejs/plugin-vue）利用缓存
# 国内部署：将 lockfile 中的 npm 官方源替换为 npmmirror 镜像加速
COPY package*.json ./
RUN sed -i 's|https://registry.npmjs.org/|https://registry.npmmirror.com/|g' package-lock.json && npm ci

# 拷贝构建所需的源码与配置
COPY vite.config.js index.html ./
COPY src ./src
COPY public ./public

RUN npm run build

# ---- 运行阶段 ----
FROM nginx:alpine
# 移除 entrypoint 中会挂起的 IPv6 检查脚本（该脚本内 apk 命令在低配环境可能卡死；
# default.conf 已显式 listen 80，删除不影响监听）
RUN rm -f /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh
# 同源反代 /home -> backend，SPA 路由回退
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
