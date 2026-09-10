<template>
  <div class="cs-wrapper">
    <!-- 悬浮球 -->
    <div class="cs-float" @click="openPanel">
      <div class="cs-float-icon">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="#fff">
          <path d="M12 3C7.03 3 3 6.8 3 11.5c0 2.1.85 4.02 2.25 5.55-.2 1.2-.85 2.6-1.9 3.7-.2.2-.12.55.15.66.75.3 1.55.45 2.35.4 1.9-.05 3.4-.8 4.1-1.2.95.2 1.95.3 3.05.3 4.97 0 9-3.8 9-8.5S16.97 3 12 3z"/>
        </svg>
      </div>
      <div class="cs-float-badge" v-if="unread">{{ unread }}</div>
    </div>

    <!-- 聊天面板 -->
    <transition name="cs-pop">
      <div v-if="show" class="cs-panel">
        <div class="cs-header">
          <div class="cs-header-info">
            <div class="cs-avatar">小徽</div>
            <div>
              <div class="cs-title">微商城智能客服</div>
              <div class="cs-status">在线 · 通常几秒内回复</div>
            </div>
          </div>
          <div class="cs-close" @click="closePanel">✕</div>
        </div>

        <div ref="bodyRef" class="cs-body">
          <div v-for="(msg, i) in messages" :key="i" :class="['msg-row', msg.role]">
            <div v-if="msg.role === 'assistant'" class="msg-avatar">小徽</div>
            <div class="bubble">{{ msg.content }}</div>
          </div>
          <div v-if="loading" class="msg-row assistant">
            <div class="msg-avatar">小徽</div>
            <div class="bubble typing"><span></span><span></span><span></span></div>
          </div>
        </div>

        <div v-if="messages.length <= 1 && !loading" class="cs-quick">
          <div v-for="q in quickAsks" :key="q" class="quick-item" @click="send(q)">{{ q }}</div>
        </div>

        <div class="cs-input">
          <van-field
            v-model="input"
            placeholder="请输入您的问题…"
            :border="false"
            @keyup.enter="send()"
          />
          <button class="send-btn" :disabled="loading" @click="send()">发送</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { chat, getChatHistory } from '../api'

const WELCOME = '您好，我是微商城智能客服小徽 🛒 可以为您推荐商品、解答订单与售后问题，请问有什么可以帮您？'
// 会话 ID：localStorage 持久化，刷新页面不丢失，跨页面共享
const SESSION_KEY = 'cs_session_id'
let sessionId = localStorage.getItem(SESSION_KEY)
if (!sessionId) {
  sessionId =
    (crypto.randomUUID && crypto.randomUUID()) ||
    'cs_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  localStorage.setItem(SESSION_KEY, sessionId)
}

const show = ref(false)
const input = ref('')
const loading = ref(false)
const unread = ref(0)
const bodyRef = ref(null)
const messages = ref([{ role: 'assistant', content: WELCOME }])
let historyLoaded = false

const quickAsks = ['有什么零食推荐？', '你们卖手机吗？', '怎么申请退款？', '有什么母婴用品？']

function scrollToBottom() {
  nextTick(() => {
    if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight
  })
}

// 从 Redis（经后端）恢复历史对话
async function loadHistory() {
  if (historyLoaded) return
  historyLoaded = true
  try {
    const res = await getChatHistory(sessionId)
    const items = res && Array.isArray(res.items) ? res.items : []
    if (items.length) {
      messages.value = [{ role: 'assistant', content: WELCOME }, ...items.slice(-20)]
    }
  } catch (e) {
    console.warn('[cs history]', e)
  }
}

async function openPanel() {
  show.value = true
  unread.value = 0
  loadHistory()
  scrollToBottom()
}
function closePanel() {
  show.value = false
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
    messages.value.push({
      role: 'assistant',
      content: res ? res.reply : '抱歉，我暂时无法回答，请稍后再试。'
    })
    // 面板未打开时累加未读角标
    if (!show.value) unread.value += 1
  } catch (e) {
    messages.value.push({ role: 'assistant', content: '网络开小差了，请稍后再试。' })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

// 接收全局"打开客服"事件（首页宫格入口等）
function onOpenEvent() {
  openPanel()
}
onMounted(() => window.addEventListener('open-customer-service', onOpenEvent))
onBeforeUnmount(() => window.removeEventListener('open-customer-service', onOpenEvent))
</script>

<style lang="less" scoped>
.cs-wrapper {
  position: fixed;
  right: 12px;
  bottom: 76px;
  z-index: 3000;
  font-size: 14px;
}

/* 悬浮球 */
.cs-float {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff8000, #ff9a3d);
  box-shadow: 0 4px 14px rgba(255, 128, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: transform 0.2s;
  &:active {
    transform: scale(0.92);
  }
}
.cs-float-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  background: #ee0a24;
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
  padding: 0 4px;
  box-sizing: border-box;
}

/* 面板 */
.cs-panel {
  position: fixed;
  right: 12px;
  bottom: 132px;
  width: min(360px, calc(100vw - 24px));
  height: min(540px, calc(100vh - 160px));
  background: #f7f8fa;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}

.cs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: linear-gradient(135deg, #ff8000, #ff9a3d);
  color: #fff;
  .cs-header-info {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .cs-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.25);
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .cs-title {
    font-size: 15px;
    font-weight: 600;
  }
  .cs-status {
    font-size: 11px;
    opacity: 0.9;
  }
  .cs-close {
    font-size: 16px;
    padding: 6px;
    cursor: pointer;
  }
}

.cs-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  .msg-row {
    display: flex;
    margin-bottom: 12px;
    &.user {
      justify-content: flex-end;
      .bubble {
        background: linear-gradient(135deg, #ff8000, #ff9a3d);
        color: #fff;
        border-radius: 12px 12px 2px 12px;
      }
    }
    &.assistant {
      .bubble {
        background: #fff;
        color: #323233;
        border-radius: 12px 12px 12px 2px;
      }
    }
  }
  .msg-avatar {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #ff8000, #ffb25c);
    color: #fff;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 8px;
  }
  .bubble {
    max-width: 72%;
    padding: 9px 12px;
    font-size: 14px;
    line-height: 1.5;
    word-break: break-word;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
  .typing {
    display: flex;
    align-items: center;
    gap: 4px;
    span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #c8c9cc;
      animation: blink 1.2s infinite;
      &:nth-child(2) { animation-delay: 0.2s; }
      &:nth-child(3) { animation-delay: 0.4s; }
    }
  }
}
@keyframes blink {
  0%, 80%, 100% { opacity: 0.3; }
  40% { opacity: 1; }
}

.cs-quick {
  padding: 0 12px 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  .quick-item {
    padding: 6px 12px;
    background: #fff;
    border: 1px solid #ff8000;
    color: #ff8000;
    border-radius: 16px;
    font-size: 12px;
    cursor: pointer;
  }
}

.cs-input {
  display: flex;
  align-items: center;
  background: #fff;
  border-top: 1px solid #ebedf0;
  padding: 8px 10px;
  .van-field {
    flex: 1;
    background: #f2f3f5;
    border-radius: 20px;
    padding: 6px 12px;
  }
  .send-btn {
    margin-left: 10px;
    padding: 8px 18px;
    border: none;
    border-radius: 20px;
    background: linear-gradient(135deg, #ff8000, #ff9a3d);
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    &:disabled {
      opacity: 0.6;
    }
  }
}

.cs-pop-enter-active,
.cs-pop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
  transform-origin: bottom right;
}
.cs-pop-enter-from,
.cs-pop-leave-to {
  opacity: 0;
  transform: scale(0.85) translateY(16px);
}
</style>
