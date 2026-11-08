/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // 5173 为本项目固定端口；strictPort 保证端口被占时报错而非静默换端口导致 CORS 断连
    port: 5173,
    strictPort: true,
    proxy: {
      // 本地开发：/home 代理到后端(8360)，免 CORS（与 Docker 的 nginx 同源策略一致）
      '/home': {
        target: 'http://127.0.0.1:8360',
        changeOrigin: true,
      },
    },
  },
  test: {
    // 默认 node 环境；需 DOM/localStorage 的用例（如 cart store 的 persist）
    // 在测试文件顶部用 // @vitest-environment jsdom 单独声明
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
})
