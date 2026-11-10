# -*- coding: utf-8 -*-
"""RAG 客服回归评测：读取 eval_cases.json，逐条请求 /rag/query 并校验回答。

用法：
  1) 启动 RAG 服务（本地或服务器）：uvicorn rag_server:app --port 8361
  2) python eval/run_eval.py [--url http://127.0.0.1:8361] [--limit N]

规则：
  - contains_any  满足其一即通过
  - contains_all  必须全部出现
  - not_contains  出现任意即失败
多轮用例按 turns 顺序发送，历史由评测器自行串联（不依赖 Redis）。
"""
import argparse
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from urllib import error, request

BASE = os.path.dirname(os.path.abspath(__file__))
CASES_FILE = os.path.join(BASE, 'eval_cases.json')


def post_json(url, payload, timeout=90):
    req = request.Request(
        url, data=json.dumps(payload, ensure_ascii=False).encode('utf-8'),
        headers={'Content-Type': 'application/json'}, method='POST',
    )
    with request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode('utf-8'))


def run_case(case, base_url):
    """按顺序执行多轮对话，返回 (case, ok, detail, last_reply)"""
    history = []
    reply = ''
    try:
        for msg in case['turns']:
            data = post_json(f"{base_url}/rag/query", {'message': msg, 'history': history})
            reply = data.get('reply', '')
            history.append({'role': 'user', 'content': msg})
            history.append({'role': 'assistant', 'content': reply})
    except (error.URLError, TimeoutError, OSError) as e:
        return case, False, f'请求失败: {e}', ''

    exp = case.get('expect', {})
    missing = []
    any_list = exp.get('contains_any') or []
    if any_list and not any(k in reply for k in any_list):
        missing.append(f'contains_any 未命中: {any_list}')
    for k in exp.get('contains_all') or []:
        if k not in reply:
            missing.append(f'contains_all 缺失: {k}')
    for k in exp.get('not_contains') or []:
        if k in reply:
            missing.append(f'not_contains 出现: {k}')
    ok = not missing
    return case, ok, ('通过' if ok else '；'.join(missing)), reply


def main():
    parser = argparse.ArgumentParser(description='RAG 回归评测')
    parser.add_argument('--url', default=os.environ.get('RAG_EVAL_URL', 'http://127.0.0.1:8361'))
    parser.add_argument('--limit', type=int, default=0, help='只跑前 N 条（调试用）')
    parser.add_argument('--workers', type=int, default=4)
    args = parser.parse_args()

    with open(CASES_FILE, encoding='utf-8') as f:
        cases = json.load(f)['cases']
    if args.limit:
        cases = cases[:args.limit]
    print(f'评测 {len(cases)} 条用例 -> {args.url}\n')

    results = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(run_case, c, args.url.rstrip('/')) for c in cases]
        for fut in futures:
            results.append(fut.result())

    passed = 0
    for case, ok, detail, reply in results:
        mark = 'PASS' if ok else 'FAIL'
        passed += ok
        print(f"[{mark}] {case['id']} ({case['category']}) {''.join(case['turns'])[-30:]}")
        if not ok:
            print(f"       原因: {detail}")
            print(f"       回答: {reply[:200]}")
    print(f'\n结果：{passed}/{len(cases)} 通过 ({passed * 100 // len(cases)}%)')
    sys.exit(0 if passed == len(cases) else 1)


if __name__ == '__main__':
    main()
