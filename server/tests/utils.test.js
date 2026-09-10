// tests/utils.test.js — 密码哈希工具单元测试（无外部依赖）
const { hashPassword, verifyPassword } = require('../utils/password')

describe('utils/password', () => {
  test('hashPassword 生成 salt:hash 格式，且随机盐使每次结果不同', () => {
    const h1 = hashPassword('123456')
    const h2 = hashPassword('123456')
    expect(h1).toMatch(/^[a-f0-9]{32}:[a-f0-9]{64}$/)
    expect(h1).not.toEqual(h2)
  })

  test('verifyPassword 对正确密码返回 true', () => {
    const h = hashPassword('abc123')
    expect(verifyPassword('abc123', h)).toBe(true)
  })

  test('verifyPassword 对错误密码返回 false', () => {
    const h = hashPassword('abc123')
    expect(verifyPassword('wrong-pass', h)).toBe(false)
  })

  test('verifyPassword 对非法存储值安全返回 false（不抛异常）', () => {
    expect(verifyPassword('x', 'garbage')).toBe(false)
    expect(verifyPassword('x', null)).toBe(false)
    expect(verifyPassword('x', undefined)).toBe(false)
  })
})
