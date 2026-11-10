# -*- coding: utf-8 -*-
"""SiliconFlow 兼容 Embedding（OpenAI 兼容 /embeddings 接口）

带 Redis 结果缓存：key = emb:{model}:{sha256(text)}，同一段文本只请求一次 API，
向量检索（每次提问都要 embed query）与知识库重建（文本未变时全量命中）都显著省时省钱。
Redis 不可用时自动退化为直连 API，不影响功能。
"""
import hashlib
import json
import os
from typing import List, Optional

import httpx
from llama_index.core.bridge.pydantic import PrivateAttr
from llama_index.core.embeddings import BaseEmbedding

EMB_TTL = 30 * 24 * 3600  # 缓存 30 天


class SiliconFlowEmbedding(BaseEmbedding):
    api_key: str
    model: str = 'BAAI/bge-m3'

    _client: httpx.Client = PrivateAttr()
    _redis = PrivateAttr()

    def __init__(self, api_key: str, model: str = 'BAAI/bge-m3', **kwargs):
        super().__init__(api_key=api_key, model=model, **kwargs)
        self._client = httpx.Client(
            base_url='https://api.siliconflow.cn/v1',
            timeout=60.0,
            headers={'Authorization': f'Bearer {api_key}'},
        )
        self._redis = self._connect_redis()

    def _connect_redis(self):
        """尝试连接 Redis 做结果缓存，失败则返回 None（无缓存直连）"""
        try:
            import redis as redis_lib
            host = os.environ.get('REDIS_HOST', '127.0.0.1')
            port = int(os.environ.get('REDIS_PORT', '6379'))
            client = redis_lib.Redis(
                host=host, port=port, db=0, decode_responses=False,
                socket_connect_timeout=2, socket_timeout=5, protocol=2,
            )
            client.ping()
            print(f'[embedding] Redis 缓存已启用 {host}:{port}')
            return client
        except Exception:
            print('[embedding] Redis 不可用，Embedding 缓存关闭（直连 API）')
            return None

    def _cache_key(self, text: str) -> str:
        return f'emb:{self.model}:' + hashlib.sha256(text.encode('utf-8')).hexdigest()

    def _remote_call(self, texts: List[str]) -> List[List[float]]:
        resp = self._client.post('/embeddings', json={'model': self.model, 'input': texts})
        resp.raise_for_status()
        data = resp.json()['data']
        data.sort(key=lambda d: d['index'])
        return [d['embedding'] for d in data]

    def _call(self, texts: List[str]) -> List[List[float]]:
        if self._redis is None:
            return self._remote_call(texts)
        # 先批量查缓存，未命中的再请求 API 并写回
        keys = [self._cache_key(t) for t in texts]
        cached = self._redis.mget(keys)
        result, miss_idx = [], []
        for i, raw in enumerate(cached):
            if raw:
                result.append(json.loads(raw))
            else:
                result.append(None)
                miss_idx.append(i)
        if miss_idx:
            fresh = self._remote_call([texts[i] for i in miss_idx])
            pipe = self._redis.pipeline()
            for j, i in enumerate(miss_idx):
                result[i] = fresh[j]
                pipe.set(keys[i], json.dumps(fresh[j]), ex=EMB_TTL)
            pipe.execute()
        return result

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
