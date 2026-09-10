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
          <MessageBubble v-for="(msg, i) in messages" :key="i" :role="msg.role" :content="msg.content" />
          <MessageBubble v-if="loading" role="assistant" typing />
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
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useChat } from '../composables/useChat'
import MessageBubble from './MessageBubble.vue'

const show = ref(false)
const unread = ref(0)
const bodyRef = ref(null)

// 会话逻辑复用 useChat；悬浮球特有：面板未打开时收到回复累加未读角标
const { input, loading, messages, quickAsks, scrollToBottom, loadHistory, send } = useChat(bodyRef, {
  onReply: () => {
    if (!show.value) unread.value += 1
  }
})

function openPanel() {
  show.value = true
  unread.value = 0
  loadHistory()
  scrollToBottom()
}
function closePanel() {
  show.value = false
}

// 接收全局“打开客服”事件（首页宫格入口等）
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
