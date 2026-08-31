import { beforeEach, describe, expect, it } from 'vitest'
import {
  answeredCount,
  correctCount,
  isAnswered,
  loadBankId,
  loadProgress,
  loadTheme,
  resetProgress,
  saveAnswer,
  saveBankId,
  saveTheme,
  wrongIds,
} from './progress'

beforeEach(() => {
  resetProgress()
})

describe('答题进度存储（id 为字符串）', () => {
  it('初始无记录', () => {
    expect(loadProgress()).toEqual({})
  })

  it('保存答题结果后可读取（支持 string id：bank:idx）', () => {
    saveAnswer('web:1', true)
    saveAnswer('py:10', false)
    const rec = loadProgress()
    expect(isAnswered(rec, 'web:1')).toBe(true)
    expect(isAnswered(rec, 'py:10')).toBe(true)
    expect(isAnswered(rec, 'web:2')).toBe(false)
  })

  it('统计已答/答对/答错及错题 id', () => {
    saveAnswer('web:1', true)
    saveAnswer('web:2', false)
    saveAnswer('py:1', false)
    const rec = loadProgress()
    expect(answeredCount(rec)).toBe(3)
    expect(correctCount(rec)).toBe(1)
    expect(wrongIds(rec).sort()).toEqual(['py:1', 'web:2'])
  })

  it('重复作答会覆盖旧记录', () => {
    saveAnswer('py:5', false)
    saveAnswer('py:5', true)
    const rec = loadProgress()
    expect(rec['py:5']).toBe(true)
    expect(wrongIds(rec)).toEqual([])
  })

  it('resetProgress 清空进度', () => {
    saveAnswer('py:1', true)
    resetProgress()
    expect(loadProgress()).toEqual({})
  })
})

describe('题库选择持久化', () => {
  it('保存后 loadBankId 可读取；id 不在白名单时回退默认 web', () => {
    saveBankId('py')
    expect(loadBankId(['web', 'py'])).toBe('py')
    // 传入更窄的可选列表（例如仅 web），自动兜底 web
    expect(loadBankId(['web'])).toBe('web')
  })
})

describe('主题（暗色模式）持久化', () => {
  it('saveTheme 保存后 loadTheme 返回同样值', () => {
    saveTheme('dark')
    expect(loadTheme()).toBe('dark')
    saveTheme('light')
    expect(loadTheme()).toBe('light')
  })
})
