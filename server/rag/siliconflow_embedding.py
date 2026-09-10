# -*- coding: utf-8 -*-
"""SiliconFlow 兼容 Embedding（OpenAI 兼容 /embeddings 接口）"""
from typing import List, Optional

import httpx
from llama_index.core.bridge.pydantic import PrivateAttr
from llama_index.core.embeddings import BaseEmbedding


class SiliconFlowEmbedding(BaseEmbedding):
    api_key: str
    model: str = 'BAAI/bge-m3'

    _client: httpx.Client = PrivateAttr()

    def __init__(self, api_key: str, model: str = 'BAAI/bge-m3', **kwargs):
        super().__init__(api_key=api_key, model=model, **kwargs)
        self._client = httpx.Client(
            base_url='https://api.siliconflow.cn/v1',
            timeout=60.0,
            headers={'Authorization': f'Bearer {api_key}'},
        )

    def _call(self, texts: List[str]) -> List[List[float]]:
        resp = self._client.post('/embeddings', json={'model': self.model, 'input': texts})
        resp.raise_for_status()
        data = resp.json()['data']
        data.sort(key=lambda d: d['index'])
        return [d['embedding'] for d in data]

    def _get_text_embedding(self, text: str) -> List[float]:
        return self._call([text])[0]

    def _get_text_embeddings(self, texts: List[str]) -> List[List[float]]:
        return self._call(texts)

    def _get_query_embedding(self, query: str) -> List[float]:
        return self._call([query])[0]

    async def _aget_query_embedding(self, query: str) -> List[float]:
        return self._get_query_embedding(query)

    async def _aget_text_embedding(self, text: str) -> List[float]:
        return self._get_text_embedding(text)

    async def _aget_text_embeddings(self, texts: List[str]) -> List[List[float]]:
        return self._get_text_embeddings(texts)
