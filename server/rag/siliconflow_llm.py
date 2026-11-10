# -*- coding: utf-8 -*-
"""SiliconFlow 兼容 LLM（OpenAI 兼容 /chat/completions 接口）"""
import json
from typing import List, Optional, Sequence

import httpx
from llama_index.core.bridge.pydantic import PrivateAttr
from llama_index.core.llms import (
    ChatMessage,
    ChatResponse,
    CompletionResponse,
    CustomLLM,
    LLMMetadata,
    MessageRole,
)
from llama_index.core.llms.callbacks import llm_chat_callback, llm_completion_callback


class SiliconFlowLLM(CustomLLM):
    api_key: str
    model: str = 'Qwen/Qwen2.5-7B-Instruct'
    temperature: float = 0.3
    max_tokens: int = 1024
    context_window: int = 32768

    _client: httpx.Client = PrivateAttr()

    def __init__(self, api_key: str, model: str = 'Qwen/Qwen2.5-7B-Instruct',
                 temperature: float = 0.3, max_tokens: int = 1024, **kwargs):
        super().__init__(api_key=api_key, model=model, temperature=temperature,
                         max_tokens=max_tokens, **kwargs)
        self._client = httpx.Client(
            base_url='https://api.siliconflow.cn/v1',
            timeout=120.0,
            headers={'Authorization': f'Bearer {api_key}'},
        )

    @property
    def metadata(self) -> LLMMetadata:
        return LLMMetadata(
            context_window=self.context_window,
            num_output=self.max_tokens,
            is_chat_model=True,
            model_name=self.model,
        )

    def _chat(self, messages: Sequence[ChatMessage]) -> str:
        payload = {
            'model': self.model,
            'messages': [{'role': m.role.value, 'content': m.content} for m in messages],
            'temperature': self.temperature,
            'max_tokens': self.max_tokens,
        }
        resp = self._client.post('/chat/completions', json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data['choices'][0]['message']['content']

    @llm_chat_callback()
    def chat(self, messages: Sequence[ChatMessage], **kwargs) -> ChatResponse:
        content = self._chat(messages)
        return ChatResponse(
            message=ChatMessage(role=MessageRole.ASSISTANT, content=content),
            raw={'model': self.model},
        )

    @llm_completion_callback()
    def complete(self, prompt: str, **kwargs) -> CompletionResponse:
        content = self._chat([ChatMessage(role=MessageRole.USER, content=prompt)])
        return CompletionResponse(text=content, raw={'model': self.model})

    async def achat(self, messages: Sequence[ChatMessage], **kwargs) -> ChatResponse:
        return self.chat(messages, **kwargs)

    async def acomplete(self, prompt: str, **kwargs) -> CompletionResponse:
        return self.complete(prompt, **kwargs)

    def _stream_chat_impl(self, messages: Sequence[ChatMessage], **kwargs):
        """真流式：SSE 逐块解析 /chat/completions 的 stream 响应，逐段 yield ChatResponse"""
        payload = {
            'model': self.model,
            'messages': [{'role': m.role.value, 'content': m.content} for m in messages],
            'temperature': self.temperature,
            'max_tokens': self.max_tokens,
            'stream': True,
        }
        with self._client.stream('POST', '/chat/completions', json=payload) as resp:
            resp.raise_for_status()
            for line in resp.iter_lines():
                if not line or not line.startswith('data:'):
                    continue
                data = line[5:].strip()
                if data == '[DONE]':
                    break
                try:
                    chunk = json.loads(data)
                except ValueError:
                    continue
                delta = (chunk.get('choices') or [{}])[0].get('delta', {}).get('content')
                if delta:
                    yield ChatResponse(
                        message=ChatMessage(role=MessageRole.ASSISTANT, content=delta),
                        delta=delta,
                        raw={'model': self.model},
                    )

    @llm_chat_callback()
    def stream_chat(self, messages: Sequence[ChatMessage], **kwargs):
        yield from self._stream_chat_impl(messages, **kwargs)

    @llm_completion_callback()
    def stream_complete(self, prompt: str, **kwargs):
        text = self.complete(prompt).text
        yield CompletionResponse(text=text, delta=text, raw={'model': self.model})
