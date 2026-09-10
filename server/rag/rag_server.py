# -*- coding: utf-8 -*-
"""RAG 客服知识服务（带 Redis 会话）：FastAPI，端口 8361
- GET  /health                      健康检查
- POST /rag/query                   单轮检索问答 {message, history?}（兼容旧接口）
- POST /rag/session/query           多轮会话问答 {session_id, message}（Redis 保存历史）
- GET  /rag/session/history         读取会话历史 ?session_id=xxx
"""
import json
import os
import re
import sys
import time
import uuid

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(BASE, '.venv', 'Lib', 'site-packages'))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# 读取 .env
def load_env(path):
    env = {}
    if os.path.exists(path):
        for line in open(path, encoding='utf-8'):
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, _, v = line.partition('=')
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env

ROOT = os.path.abspath(os.path.join(BASE, '..', '..'))
env = load_env(os.path.join(ROOT, '.env'))


def _cfg(key, default=''):
    """配置读取优先级：进程环境变量(Docker/compose 注入) > .env 文件 > 默认值"""
    val = os.environ.get(key)
    if val is None or val == '':
        val = env.get(key, default)
    return val


API_KEY = _cfg('SILICONFLOW_API_KEY', '')

import redis as redis_lib

from llama_index.core import (
    Settings,
    StorageContext,
    load_index_from_storage,
)
from llama_index.core.llms import ChatMessage, MessageRole
from llama_index.core.node_parser import MarkdownNodeParser
from siliconflow_embedding import SiliconFlowEmbedding
from siliconflow_llm import SiliconFlowLLM

MODEL = _cfg('SILICONFLOW_MODEL', 'Qwen/Qwen2.5-7B-Instruct')
Settings.llm = SiliconFlowLLM(api_key=API_KEY, model=MODEL, temperature=0.3)
Settings.embed_model = SiliconFlowEmbedding(api_key=API_KEY, model='BAAI/bge-m3')
Settings.node_parser = MarkdownNodeParser()

STORAGE_DIR = os.path.join(BASE, 'storage')

# ---------------- Redis 会话 ----------------
REDIS_HOST = _cfg('REDIS_HOST', '127.0.0.1')
REDIS_PORT = int(_cfg('REDIS_PORT', '6379'))
SESSION_TTL = 7 * 24 * 3600      # 会话保留 7 天
HISTORY_LIMIT = 12               # 每会话保留最近 12 条消息

_redis = None


def get_redis():
    """惰性连接 Redis，失败时抛异常由调用方兜底"""
    global _redis
    if _redis is None:
        _redis = redis_lib.Redis(
            host=REDIS_HOST, port=REDIS_PORT, db=0,
            decode_responses=True, socket_connect_timeout=3, socket_timeout=5,
            protocol=2,  # Redis 5.x 仅支持 RESP2
        )
        _redis.ping()
        print(f'[rag] Redis 已连接 {REDIS_HOST}:{REDIS_PORT}')
    return _redis


def _session_key(sid):
    return f'chat:session:{sid}'


def load_history(sid, limit=HISTORY_LIMIT):
    try:
        raw = get_redis().lrange(_session_key(sid), -limit, -1)
    except Exception:
        raw = []
    items = []
    for r in raw:
        try:
            d = json.loads(r)
            if d.get('role') in ('user', 'assistant') and d.get('content'):
                items.append(d)
        except Exception:
            continue
    return items


def append_history(sid, role, content):
    key = _session_key(sid)
    try:
        r = get_redis()
        r.rpush(key, json.dumps({'role': role, 'content': content}, ensure_ascii=False))
        r.ltrim(key, -HISTORY_LIMIT, -1)
        r.expire(key, SESSION_TTL)
        return True
    except Exception:
        return False


def clear_history(sid):
    try:
        get_redis().delete(_session_key(sid))
        return True
    except Exception:
        return False

# ---------------- 检索与回答 ----------------

SYSTEM_PROMPT = (
    '你是微商城的智能客服小助手。请基于【知识库参考内容】回答用户问题，'
    '回答要求：1) 优先引用知识库中的信息，涉及商品价格、库存、销量、编号等数字时，'
    '必须与知识库内容完全一致、原样引用，禁止缩写、改写或推测；'
    '【价格强约束】2) 用户询问任何商品价格时，必须逐字引用【知识库参考内容】中的原价，'
    '回答格式为"XX.XX元"（如知识库原文"售价329.00元"则回答"329.00元"），'
    '禁止自行补全、四舍五入之外的改写、禁止编造知识库中没有的价格数字；'
    '若知识库参考内容中找不到该商品的价格，必须如实回答"知识库暂无该商品的价格信息"，'
    '绝不猜测或杜撰价格；3) 推荐商品时列出商品名称和价格即可，必要时补充库存与销量，'
    '不要编造知识库中没有的数字；4) 知识库没有明确信息的，基于常识友好作答，并说明仅供参考；'
    '5) 结合历史对话理解用户意图（如"第一个"指上一轮提到的商品）；'
    '6) 语言自然、简洁，用中文回答。'
)

app = FastAPI(title='微商城 RAG 客服知识服务')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

_index = None
_retriever = None


def get_retriever():
    global _index, _retriever
    if _retriever is None:
        if not os.path.isdir(STORAGE_DIR):
            raise RuntimeError('知识索引不存在，请先运行 build_index.py 构建索引')
        storage_context = StorageContext.from_defaults(persist_dir=STORAGE_DIR)
        _index = load_index_from_storage(storage_context)
        _retriever = _index.as_retriever(similarity_top_k=2)
        print('[rag] 索引加载完成，检索器就绪')
    return _retriever


def _sources_from_nodes(nodes):
    sources = []
    for node in nodes:
        meta = getattr(node, 'metadata', {}) or {}
        sources.append({
            'file': os.path.basename(meta.get('file_path', '')),
            'score': round(float(getattr(node, 'score', 0) or 0), 4),
            'text': (getattr(node, 'text', '') or '')[:120],
        })
    return sources


def _retrieve_context(message):
    """检索知识库，返回节点列表"""
    try:
        nodes = get_retriever().retrieve(message)
        return nodes
    except Exception:
        return []


def _compose_and_answer(message, history, nodes, extra_hint=None):
    """组装 prompt（系统 + 历史 + 知识片段）并调用 LLM"""
    ctx_text = '\n\n'.join(n.get_content() for n in nodes[:2]) or '（无相关知识）'
    system = f'{SYSTEM_PROMPT}\n\n【知识库参考内容】\n{ctx_text}'
    if extra_hint:
        system += f'\n\n【更正提示】{extra_hint}'
    msgs = [ChatMessage(role=MessageRole.SYSTEM, content=system)]
    for h in history[-6:]:
        role = MessageRole.USER if h['role'] == 'user' else MessageRole.ASSISTANT
        msgs.append(ChatMessage(role=role, content=h['content']))
    msgs.append(ChatMessage(role=MessageRole.USER, content=message))
    resp = Settings.llm.chat(msgs)
    return resp.message.content


# ---------------- 价格一致性自检（防止模型编造价格） ----------------
_PRICE_PAT = re.compile(r'(?:售价|价格|¥|￥)?\s*(\d+(?:\.\d{1,2})?)\s*元')
_KB_PRICES = None


def _load_kb_prices():
    """从知识库 goods.md 抽取全部商品售价，作为合法价格集合"""
    global _KB_PRICES
    if _KB_PRICES is None:
        prices = set()
        kb_file = os.path.join(BASE, 'data', 'goods.md')
        if os.path.exists(kb_file):
            for line in open(kb_file, encoding='utf-8'):
                for m in re.finditer(r'售价\s*(\d+(?:\.\d{1,2})?)\s*元', line):
                    prices.add(round(float(m.group(1)), 2))
        _KB_PRICES = prices
    return _KB_PRICES


def _prices_in_text(text):
    """抽取文本中所有带"元"的价格，归一化为两位小数"""
    out = []
    for m in _PRICE_PAT.finditer(text or ''):
        try:
            out.append(round(float(m.group(1)), 2))
        except ValueError:
            continue
    return out


def _answer_with_check(message, history, nodes):
    """调用 LLM 后做价格一致性自检：回答中出现知识库没有的价格则带更正提示重试一次"""
    answer = _compose_and_answer(message, history, nodes)
    kb_prices = _load_kb_prices()
    if not kb_prices:
        return answer  # 知识库价格集不可用时跳过自检
    fakes = [p for p in _prices_in_text(answer) if p not in kb_prices]
    if fakes:
        hint = ('你刚才的回答中出现了知识库中不存在的价格数字（'
                + '、'.join(f'{p:.2f}' for p in sorted(set(fakes)))
                + ' 元）。请重新回答：所有价格必须逐字引用【知识库参考内容】中的原价，'
                '知识库没有的价格信息就回答"知识库暂无该商品的价格信息"，严禁编造价格。')
        answer = _compose_and_answer(message, history, nodes, extra_hint=hint)
    return answer


class QueryIn(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
    history: list = []


class QueryOut(BaseModel):
    reply: str
    sources: list = []


class SessionQueryIn(BaseModel):
    session_id: str = Field(..., min_length=8, max_length=64)
    message: str = Field(..., min_length=1, max_length=500)


class SessionQueryOut(BaseModel):
    reply: str
    sources: list = []
    history: list = []


class SessionHistoryOut(BaseModel):
    session_id: str
    items: list = []


@app.get('/health')
def health():
    try:
        get_redis().ping()
        redis_ok = True
    except Exception:
        redis_ok = False
    return {
        'status': 'ok', 'service': 'rag',
        'redis': redis_ok,
        'time': time.strftime('%Y-%m-%d %H:%M:%S'),
    }


@app.post('/rag/query', response_model=QueryOut)
def query(body: QueryIn):
    nodes = _retrieve_context(body.message)
    sources = _sources_from_nodes(nodes)
    history = [{'role': m['role'], 'content': m['content']} for m in body.history[:6]
               if m.get('role') in ('user', 'assistant') and m.get('content')]
    reply = _answer_with_check(body.message, history, nodes)
    return QueryOut(reply=reply, sources=sources)


@app.post('/rag/session/query', response_model=SessionQueryOut)
def session_query(body: SessionQueryIn):
    """多轮会话：读 Redis 历史 → 检索 → LLM → 写回 Redis"""
    history = load_history(body.session_id)
    nodes = _retrieve_context(body.message)
    sources = _sources_from_nodes(nodes)
    reply = _answer_with_check(body.message, history, nodes)
    append_history(body.session_id, 'user', body.message)
    append_history(body.session_id, 'assistant', reply)
    new_history = load_history(body.session_id)
    return SessionQueryOut(reply=reply, sources=sources, history=new_history)


@app.get('/rag/session/history', response_model=SessionHistoryOut)
def session_history(session_id: str):
    items = load_history(session_id)
    return SessionHistoryOut(session_id=session_id, items=items)


@app.post('/rag/session/clear')
def session_clear(body: SessionQueryIn):
    clear_history(body.session_id)
    return {'ok': True, 'session_id': body.session_id}


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=8361)
