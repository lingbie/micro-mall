# 微商城前端：多阶段构建（Vite 打包 -> nginx 托管 + 反代后端）
# 注意：构建上下文为仓库根（my-shop/），dockerfile 位于 web/Dockerfile

# ---- 构建阶段 ----
FROM node:20-alpine AS build
WORKDIR /app

# 先装依赖（含 devDependencies：vite / @vitejs/plugin-vue）利用缓存
COPY package*.json ./
RUN npm ci

# 拷贝构建所需的源码与配置
COPY vite.config.js index.html ./
COPY src ./src
COPY public ./public

RUN npm run build

# ---- 运行阶段 ----
FROM nginx:alpine
# 同源反代 /home -> backend，SPA 路由回退
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
