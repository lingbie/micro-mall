# RAG 客服知识服务（FastAPI + LlamaIndex + Redis 会话）
FROM python:3.11-slim

# rag_server.py 以自身所在目录为 BASE 定位 data/ 与 storage/
WORKDIR /app

# 先装依赖，利用构建层缓存（源码变动不触发重装）
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 拷贝服务代码、本地 SiliconFlow 集成、知识库(data)与已构建的向量索引(storage)
COPY . .

EXPOSE 8361

# 绑定 0.0.0.0，使容器网络内其它服务可通过 http://rag:8361 访问
# （原 __main__ 的 127.0.0.1 仅限本机，容器内不可达）
CMD ["uvicorn", "rag_server:app", "--host", "0.0.0.0", "--port", "8361"]
