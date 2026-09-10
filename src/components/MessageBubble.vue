<template>
  <div :class="['msg-row', role]">
    <div v-if="role === 'assistant'" class="avatar">小徽</div>
    <div v-if="typing" class="bubble typing">
      <span></span><span></span><span></span>
    </div>
    <div v-else class="bubble">{{ content }}</div>
  </div>
</template>

<script setup>
// 客服消息气泡：Chat 页面与悬浮球面板共用
defineProps({
  role: { type: String, default: 'assistant' }, // 'user' | 'assistant'
  content: { type: String, default: '' },
  typing: { type: Boolean, default: false } // 加载中显示三点动画
})
</script>

<style lang="less" scoped>
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
</style>
