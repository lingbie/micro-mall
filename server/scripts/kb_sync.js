// kb_sync.js — 知识库一键同步：DB 导出商品知识库 → 构建向量索引
// 串联管线：MySQL → export_goods_md.js → rag/data/*.md → build_index.py → rag/storage/
// 用法: npm run kb:sync （等价 node scripts/kb_sync.js）
// 产物更新后部署服务器：scp 同步 server/rag/{data,storage} 后重建 rag 容器
const { spawnSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const SERVER = path.join(__dirname, '..')
const RAG = path.join(SERVER, 'rag')

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' })
  if (r.status !== 0) {
    console.error(`[kb:sync] 步骤失败: ${cmd} ${args.join(' ')}`)
    process.exit(r.status || 1)
  }
}

// 1) DB → data/goods.md
console.log('[kb:sync] 1/2 导出商品知识库 data/goods.md ...')
run('node', [path.join(SERVER, 'scripts', 'export_goods_md.js')])

// 2) data/*.md → storage/ 向量索引（优先用 rag/.venv 里的 Python）
const winPy = path.join(RAG, '.venv', 'Scripts', 'python.exe')
const nixPy = path.join(RAG, '.venv', 'bin', 'python')
const py = fs.existsSync(winPy) ? winPy : fs.existsSync(nixPy) ? nixPy : 'python'
console.log(`[kb:sync] 2/2 构建向量索引（${py}）...`)
run(py, [path.join(RAG, 'build_index.py')])

console.log('[kb:sync] 完成：知识库已与数据库同步。')
