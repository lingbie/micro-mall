# -*- coding: utf-8 -*-
"""构建 RAG 知识索引：读取 data/*.md → LlamaIndex 切分+Embedding → 持久化到 storage/"""
import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(BASE, '.venv', 'Lib', 'site-packages'))

# 读取 .env（项目根）
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
API_KEY = env.get('SILICONFLOW_API_KEY', '')
MODEL = env.get('SILICONFLOW_MODEL', 'Qwen/Qwen2.5-7B-Instruct')

if not API_KEY:
    print('错误：未找到 SILICONFLOW_API_KEY，请检查项目根 .env')
    sys.exit(1)

from llama_index.core import (
    Settings,
    SimpleDirectoryReader,
    VectorStoreIndex,
    StorageContext,
    load_index_from_storage,
)
from llama_index.core.node_parser import MarkdownNodeParser
from siliconflow_embedding import SiliconFlowEmbedding
from siliconflow_llm import SiliconFlowLLM

# 复用 SiliconFlow（OpenAI 兼容）
Settings.llm = SiliconFlowLLM(api_key=API_KEY, model=MODEL, temperature=0.3)
Settings.embed_model = SiliconFlowEmbedding(api_key=API_KEY, model='BAAI/bge-m3')
Settings.node_parser = MarkdownNodeParser()

STORAGE_DIR = os.path.join(BASE, 'storage')
DOCS_DIR = os.path.join(BASE, 'data')


def build():
    documents = SimpleDirectoryReader(DOCS_DIR, required_exts=['.md']).load_data()
    # 元数据里只保留相对路径，避免把本地绝对路径（含用户名）写进索引入库泄露隐私
    for doc in documents:
        file_name = doc.metadata.get('file_name', 'goods.md')
        doc.metadata = {k: v for k, v in doc.metadata.items() if k in ('file_name', 'file_type', 'creation_date')}
        doc.metadata['file_path'] = f'data/{file_name}'
    print(f'加载文档 {len(documents)} 份')
    index = VectorStoreIndex.from_documents(documents, show_progress=True)
    index.storage_context.persist(persist_dir=STORAGE_DIR)
    print(f'索引构建完成，已持久化到 {STORAGE_DIR}')
    print(f'节点数：{len(index.ref_doc_info)}')
    return index


def load():
    storage_context = StorageContext.from_defaults(persist_dir=STORAGE_DIR)
    return load_index_from_storage(storage_context)


if __name__ == '__main__':
    index = build()
