export default { 
  // 留空=同源请求：Docker 下走 nginx 反代 /home，本地 dev 走 vite 代理 /home（均免 CORS）
  // 如需直连后端，设 VITE_API_BASE=http://127.0.0.1:8360
  baseURL: import.meta.env.VITE_API_BASE || '',
  // 后端已就绪（Express + MySQL），直接对接真实接口
  useMock: false
}
