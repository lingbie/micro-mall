// composables/useChat.js — 客服会话逻辑复用（Chat 页面与悬浮球客服面板共享）
import { ref, nextTick } from 'vue'
import { chat, getChatHistory } from '../api'

export const WELCOME =
  '您好，我是微商城智能客服小徽 🛒 可以为您推荐商品、解答订单与售后问题，请问有什么可以帮您？'

export const QUICK_ASKS = [
  '有什么零食推荐？',
  '你们卖手机吗？',
  '怎么申请退款？',
  '有什么母婴用品？'
]

// 会话 ID 的 localStorage 键：Chat 页面与悬浮球共享，刷新/跨页面不丢失
const SESSION_KEY = 'cs_session_id'

function resolveSessionId() {
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id =
      (crypto.randomUUID && crypto.randomUUID()) ||
      'cs_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

/**
 * @param {import('vue').Ref<HTMLElement|null>} scrollRef 消息滚动容器，用于自动滚到底部
 * @param {Object} [options]
 * @param {(reply:{role:string,content:string})=>void} [options.onReply] 收到助手回复后的回调（如悬浮球累加未读）
 */
export function useChat(scrollRef, options = {}) {
  const sessionId = resolveSessionId()
  const input = ref('')
  const loading = ref(false)
  const messages = ref([{ role: 'assistant', content: WELCOME }])
  const quickAsks = QUICK_ASKS
  let historyLoaded = false

  function scrollToBottom() {
    nextTick(() => {
      const el = scrollRef && scrollRef.value
      if (el) el.scrollTop = el.scrollHeight
    })
  }

  // 从 Redis（经后端）恢复历史对话，仅加载一次
  async function loadHistory() {
    if (historyLoaded) return
    historyLoaded = true
    try {
      const res = await getChatHistory(sessionId)
      const items = res && Array.isArray(res.items) ? res.items : []
      if (items.length) {
        messages.value = [{ role: 'assistant', content: WELCOME }, ...items.slice(-20)]
        scrollToBottom()
      }
    } catch (e) {
      console.warn('[chat history]', e)
    }
  }

  async function send(text) {
    const content = (text || input.value || '').trim()
    if (!content || loading.value) return
    input.value = ''
    messages.value.push({ role: 'user', content })
    loading.value = true
    scrollToBottom()
    try {
      const res = await chat({ message: content, session_id: sessionId })
      const reply = res ? res.reply : '抱歉，我暂时无法回答，请稍后再试。'
      messages.value.push({ role: 'assistant', content: reply })
      if (typeof options.onReply === 'function') {
        options.onReply({ role: 'assistant', content: reply })
      }
    } catch (e) {
      messages.value.push({ role: 'assistant', content: '网络开小差了，请稍后再试。' })
    } finally {
      loading.value = false
      scrollToBottom()
    }
  }

  return { sessionId, input, loading, messages, quickAsks, scrollToBottom, loadHistory, send }
}
