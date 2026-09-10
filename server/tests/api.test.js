// tests/api.test.js — HTTP 契约与业务逻辑测试（mock db，不依赖真实 MySQL）
jest.mock('../db', () => ({
  query: jest.fn(),
  getConnection: jest.fn()
}))

const request = require('supertest')
const jwt = require('jsonwebtoken')
const pool = require('../db')
const config = require('../config')
const app = require('../app')
const { hashPassword } = require('../utils/password')

// 用与中间件相同的密钥签发有效 token
const makeToken = (id = 1, username = 'tester') =>
  jwt.sign({ id, username }, config.jwtSecret, { expiresIn: '1h' })

// 构造事务连接 mock：queryImpl 按 SQL 返回不同结果
function makeConn(queryImpl) {
  return {
    beginTransaction: jest.fn().mockResolvedValue(),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    release: jest.fn(),
    query: jest.fn(queryImpl)
  }
}

beforeEach(() => jest.clearAllMocks())

describe('鉴权中间件', () => {
  test('无 token 访问受保护接口返回 errno 2', async () => {
    const res = await request(app).get('/home/user')
    expect(res.body.errno).toBe(2)
    expect(res.body.errmsg).toBe('未登录')
  })

  test('无效/过期 token 返回 errno 2', async () => {
    const res = await request(app).get('/home/user').set('jwt', 'invalid.token.value')
    expect(res.body.errno).toBe(2)
    expect(res.body.errmsg).toMatch(/过期/)
  })

  test('有效 token 返回用户信息', async () => {
    pool.query.mockResolvedValueOnce([[{ username: 'tester', avatar: '/a.jpg' }]])
    const res = await request(app).get('/home/user').set('jwt', makeToken())
    expect(res.body.errno).toBe(0)
    expect(res.body.data.username).toBe('tester')
  })
})

describe('注册 / 登录校验', () => {
  test('用户名过短返回 errno 1，且不触达数据库', async () => {
    const res = await request(app).post('/home/register').send({ username: 'ab', password: '123456' })
    expect(res.body.errno).toBe(1)
    expect(pool.query).not.toHaveBeenCalled()
  })

  test('密码过短返回 errno 1，且不触达数据库', async () => {
    const res = await request(app).post('/home/register').send({ username: 'abcd', password: '123' })
    expect(res.body.errno).toBe(1)
    expect(pool.query).not.toHaveBeenCalled()
  })

  test('用户名已存在返回 errno 1', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 9 }]])
    const res = await request(app).post('/home/register').send({ username: 'abcd', password: '123456' })
    expect(res.body.errno).toBe(1)
    expect(res.body.errmsg).toMatch(/已被注册/)
  })

  test('登录密码错误返回 errno 1', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, username: 'u', password: hashPassword('rightpass'), avatar: '' }]])
    const res = await request(app).post('/home/login').send({ username: 'u', password: 'wrongpass' })
    expect(res.body.errno).toBe(1)
    expect(res.body.errmsg).toMatch(/密码错误/)
  })

  test('登录成功返回 token 与用户信息', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, username: 'u', password: hashPassword('right123'), avatar: '/a.jpg' }]])
    const res = await request(app).post('/home/login').send({ username: 'u', password: 'right123' })
    expect(res.body.errno).toBe(0)
    expect(res.body.data.token).toBeDefined()
    expect(res.body.data.user.username).toBe('u')
  })
})

describe('下单收货人校验（事务前拦截，不触达数据库）', () => {
  const items = [{ goods_id: 1, quantity: 1 }]
  test('手机号非法返回 errno 1', async () => {
    const res = await request(app).post('/home/order/create').set('jwt', makeToken())
      .send({ items, receiver: { name: '张三', phone: '123', address: '北京市海淀区xx路1号' } })
    expect(res.body.errno).toBe(1)
    expect(res.body.errmsg).toMatch(/手机号/)
    expect(pool.getConnection).not.toHaveBeenCalled()
  })

  test('地址过短返回 errno 1', async () => {
    const res = await request(app).post('/home/order/create').set('jwt', makeToken())
      .send({ items, receiver: { name: '张三', phone: '13800138000', address: '短' } })
    expect(res.body.errno).toBe(1)
    expect(res.body.errmsg).toMatch(/地址/)
  })
})

describe('订单事务与库存一致性', () => {
  const receiver = { name: '张三', phone: '13800138000', address: '北京市海淀区中关村1号' }

  test('库存不足时下单失败并回滚，不提交', async () => {
    const conn = makeConn(async sql => {
      if (/FOR UPDATE/.test(sql)) return [[{ id: 1, name: '商品A', price: '10.00', stock: 2, pic_url: '' }]]
      return [{}]
    })
    pool.getConnection.mockResolvedValueOnce(conn)
    const res = await request(app).post('/home/order/create').set('jwt', makeToken())
      .send({ items: [{ goods_id: 1, quantity: 5 }], receiver })
    expect(res.body.errno).toBe(1)
    expect(res.body.errmsg).toMatch(/库存不足/)
    expect(conn.rollback).toHaveBeenCalled()
    expect(conn.commit).not.toHaveBeenCalled()
    expect(conn.release).toHaveBeenCalled()
  })

  test('库存充足时下单成功、扣库存并提交', async () => {
    const conn = makeConn(async sql => {
      if (/FOR UPDATE/.test(sql)) return [[{ id: 1, name: '商品A', price: '10.00', stock: 100, pic_url: '' }]]
      if (/INSERT INTO orders/.test(sql)) return [{ insertId: 55 }]
      return [{}]
    })
    pool.getConnection.mockResolvedValueOnce(conn)
    const res = await request(app).post('/home/order/create').set('jwt', makeToken())
      .send({ items: [{ goods_id: 1, quantity: 2 }], receiver })
    expect(res.body.errno).toBe(0)
    expect(res.body.data.order_id).toBe(55)
    expect(res.body.data.total_amount).toBe('20.00')
    expect(conn.commit).toHaveBeenCalled()
    expect(conn.rollback).not.toHaveBeenCalled()
    expect(conn.query).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE goods SET stock = stock -/),
      expect.any(Array)
    )
  })

  test('取消待付款订单恢复库存并提交', async () => {
    const conn = makeConn(async sql => {
      if (/FROM orders WHERE id/.test(sql)) return [[{ id: 7, user_id: 1, status: 0 }]]
      if (/FROM order_items/.test(sql)) return [[{ goods_id: 1, quantity: 3 }]]
      return [{}]
    })
    pool.getConnection.mockResolvedValueOnce(conn)
    const res = await request(app).post('/home/order/cancel').set('jwt', makeToken()).send({ id: 7 })
    expect(res.body.errno).toBe(0)
    expect(res.body.data.status).toBe(3)
    expect(conn.query).toHaveBeenCalledWith(expect.stringMatching(/stock = stock \+/), expect.any(Array))
    expect(conn.commit).toHaveBeenCalled()
  })

  test('非待付款订单不可取消并回滚', async () => {
    const conn = makeConn(async sql => {
      if (/FROM orders WHERE id/.test(sql)) return [[{ id: 8, user_id: 1, status: 2 }]]
      return [{}]
    })
    pool.getConnection.mockResolvedValueOnce(conn)
    const res = await request(app).post('/home/order/cancel').set('jwt', makeToken()).send({ id: 8 })
    expect(res.body.errno).toBe(1)
    expect(conn.rollback).toHaveBeenCalled()
    expect(conn.commit).not.toHaveBeenCalled()
  })
})

describe('商品列表分页', () => {
  test('pageSize 超过上限被限制为 50', async () => {
    pool.query
      .mockResolvedValueOnce([[{ total: 100 }]]) // COUNT(*)
      .mockResolvedValueOnce([[{ id: 1 }]])       // 列表
    const res = await request(app).get('/home/goods/list?pageSize=100')
    expect(res.body.errno).toBe(0)
    expect(res.body.data.pageSize).toBe(50)
    const listCall = pool.query.mock.calls[1]
    expect(listCall[1]).toEqual(expect.arrayContaining([50, 0]))
  })
})

describe('错误处理中间件', () => {
  test('畸形 JSON 返回 400 + 结构化 errno（非 HTML）', async () => {
    const res = await request(app).post('/home/login')
      .set('Content-Type', 'application/json')
      .send('{bad json')
    expect(res.status).toBe(400)
    expect(res.body.errno).toBe(1)
    expect(res.body.errmsg).toMatch(/格式错误/)
  })

  test('未知路由返回 404 + 结构化 errno', async () => {
    const res = await request(app).get('/home/does-not-exist')
    expect(res.status).toBe(404)
    expect(res.body.errno).toBe(1)
    expect(res.body.errmsg).toMatch(/接口不存在/)
  })
})
