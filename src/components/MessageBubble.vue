<template>
  <div :class="['msg-row', role]">
    <div v-if="role === 'assistant'" class="avatar">小徽</div>
    <div v-if="typing || (streaming && !content)" class="bubble typing">
      <span></span><span></span><span></span>
    </div>
    <div v-else class="bubble">
      <template v-for="(seg, i) in segments" :key="i">
        <img v-if="seg.img" :src="seg.img" class="pic" alt="款式图" />
        <a v-else-if="seg.href" :href="seg.href" target="_blank" rel="noopener" class="link">{{ seg.text }}</a>
        <template v-else>{{ seg.text }}</template>
      </template>
    </div>
  </div>
</template>

<script setup>
// 客服消息气泡：Chat 页面与悬浮球面板共用
import { computed } from 'vue'

const props = defineProps({
  role: { type: String, default: 'assistant' }, // 'user' | 'assistant'
  content: { type: String, default: '' },
  typing: { type: Boolean, default: false }, // 加载中显示三点动画
  streaming: { type: Boolean, default: false } // SSE 流式渲染中：内容为空时显示三点，非空逐字展示
})

// 解析回复内容为片段：Markdown 图片/链接、裸 URL、站内图片路径（/images/...jpg）
const LINK_PAT =
  /!\[([^\]]*)\]\(([^)\s]+)\)|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>）)」】。，；！？、"'']+|\/images\/[^\s<>，。；！？、)」】"'']+?\.(?:jpg|jpeg|png|webp|gif))/g
const IMG_EXT = /\.(jpe?g|png|webp|gif)$/i
const segments = computed(() => {
  if (props.role !== 'assistant' || !props.content) {
    return [{ text: props.content }]
  }
  const out = []
  let last = 0
  for (const m of props.content.matchAll(LINK_PAT)) {
    if (m.index > last) out.push({ text: props.content.slice(last, m.index) })
    if (m[2]) {
      out.push({ img: m[2] }) // Markdown 图片 ![alt](url)
    } else if (m[4]) {
      out.push({ text: m[3], href: m[4] }) // Markdown 链接 [text](url)
    } else {
      const raw = m[5]
      if (IMG_EXT.test(raw) && !raw.startsWith('http')) {
        out.push({ img: raw }) // 站内图片路径
      } else if (IMG_EXT.test(raw)) {
        out.push({ img: raw }) // 外链图片
      } else {
        out.push({ text: raw, href: raw }) // 裸 URL
      }
    }
    last = m.index + m[0].length
  }
  if (last < props.content.length) out.push({ text: props.content.slice(last) })
  return out
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

  .link {
    color: #ff6a00;
    text-decoration: underline;
    word-break: break-all;
  }

  .pic {
    display: block;
    max-width: 160px;
    max-height: 160px;
    border-radius: 8px;
    margin: 4px 0;
    object-fit: cover;
  }
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
