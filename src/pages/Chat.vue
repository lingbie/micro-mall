<template>
  <div class="chat-page">
    <!-- 消息列表 -->
    <div ref="scrollRef" class="chat-body">
      <div v-for="(msg, i) in messages" :key="i" :class="['msg-row', msg.role]">
        <div v-if="msg.role === 'assistant'" class="avatar">小徽</div>
        <div class="bubble">{{ msg.content }}</div>
      </div>
      <div v-if="loading" class="msg-row assistant">
        <div class="avatar">小徽</div>
        <div class="bubble typing">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>

    <!-- 快捷问题 -->
    <div v-if="messages.length <= 1 && !loading" class="quick-asks">
      <div v-for="q in quickAsks" :key="q" class="quick-item" @click="send(q)">{{ q }}</div>
    </div>

    <!-- 输入区 -->
    <div class="chat-input">
      <van-field
        v-model="input"
        placeholder="请输入您的问题，例如：有什么零食推荐？"
        :border="false"
        @keyup.enter="send()"
      />
      <button class="send-btn" :disabled="loading" @click="send()">发送</button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { showToast } from 'vant'
import { chat, getChatHistory } from '../api'

const WELCOME = '您好，我是微商城智能客服小徽 🛒 可以为您推荐商品、解答订单与售后问题，请问有什么可以帮您？'
// 会话 ID：与悬浮球共享 localStorage，刷新不丢失
const SESSION_KEY = 'cs_session_id'
let sessionId = localStorage.getItem(SESSION_KEY)
if (!sessionId) {
  sessionId =
    (crypto.randomUUID && crypto.randomUUID()) ||
    'cs_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  localStorage.setItem(SESSION_KEY, sessionId)
}

const input = ref('')
const loading = ref(false)
const scrollRef = ref(null)
const messages = ref([{ role: 'assistant', content: WELCOME }])

const quickAsks = [
  '有什么零食推荐？',
  '你们卖手机吗？',
  '怎么申请退款？',
  '有什么母婴用品？'
]

function scrollToBottom() {
  nextTick(() => {
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight
    }
  })
}

// 从 Redis（经后端）恢复历史对话
async function loadHistory() {
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

onMounted(() => {
  loadHistory()
})

async function send(text) {
  const content = (text || input.value || '').trim()
  if (!content || loading.value) return
  input.value = ''
  messages.value.push({ role: 'user', content })
  loading.value = true
  scrollToBottom()
  try {
    const res = await chat({ message: content, session_id: sessionId })
    if (res) {
      messages.value.push({ role: 'assistant', content: res.reply })
    } else {
      messages.value.push({ role: 'assistant', content: '抱歉，我暂时无法回答，请稍后再试。' })
    }
  } catch (e) {
    messages.value.push({ role: 'assistant', content: '网络开小差了，请稍后再试。' })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}
</script>

<style lang="less" scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 46px);
  background: #f7f8fa;
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  box-sizing: border-box;
}

.msg-row {
  display: flex;
  margin-bottom: 14px;
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

.avatar {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff8000, #ffb25c);
  color: #fff;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
}

.bubble {
  max-width: 72%;
  padding: 10px 12px;
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
@keyframes blink {
  0%, 80%, 100% { opacity: 0.3; }
  40% { opacity: 1; }
}

.quick-asks {
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

.chat-input {
  display: flex;
  align-items: center;
  background: #fff;
  border-top: 1px solid #ebedf0;
  padding: 8px 10px;
  box-sizing: border-box;
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
</style>
