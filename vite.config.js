/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  test: {
    // 默认 node 环境；需 DOM/localStorage 的用例（如 cart store 的 persist）
    // 在测试文件顶部用 // @vitest-environment jsdom 单独声明
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
})
