<template>
  <div class="chat-page">
    <!-- 消息列表 -->
    <div ref="scrollRef" class="chat-body">
      <MessageBubble v-for="(msg, i) in messages" :key="i" :role="msg.role" :content="msg.content" />
      <MessageBubble v-if="loading" role="assistant" typing />
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
import { ref, onMounted } from 'vue'
import { useChat } from '../composables/useChat'
import MessageBubble from '../components/MessageBubble.vue'

const scrollRef = ref(null)
const { input, loading, messages, quickAsks, loadHistory, send } = useChat(scrollRef)

onMounted(() => {
  loadHistory()
})
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
