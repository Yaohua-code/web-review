import { beforeEach, describe, expect, it } from 'vitest'
import {
  answeredCount,
  correctCount,
  isAnswered,
  loadProgress,
  resetProgress,
  saveAnswer,
  wrongIds,
} from './progress'

beforeEach(() => {
  resetProgress()
})

describe('答题进度存储', () => {
  it('初始无记录', () => {
    expect(loadProgress()).toEqual({})
  })

  it('保存答题结果后可读取', () => {
    saveAnswer(1, true)
    saveAnswer(2, false)
    const rec = loadProgress()
    expect(isAnswered(rec, 1)).toBe(true)
    expect(isAnswered(rec, 2)).toBe(true)
    expect(isAnswered(rec, 3)).toBe(false)
  })

  it('统计已答/答对/答错及错题 id', () => {
    saveAnswer(1, true)
    saveAnswer(2, false)
    saveAnswer(3, false)
    const rec = loadProgress()
    expect(answeredCount(rec)).toBe(3)
    expect(correctCount(rec)).toBe(1)
    expect(wrongIds(rec).sort()).toEqual([2, 3])
  })

  it('重复作答会覆盖旧记录', () => {
    saveAnswer(1, false)
    saveAnswer(1, true)
    const rec = loadProgress()
    expect(rec[1]).toBe(true)
    expect(wrongIds(rec)).toEqual([])
  })

  it('resetProgress 清空进度', () => {
    saveAnswer(1, true)
    resetProgress()
    expect(loadProgress()).toEqual({})
  })
})