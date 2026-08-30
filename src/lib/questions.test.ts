import { describe, expect, it } from 'vitest'
import type { Question } from '../types'
import {
  allQuestions,
  chapterList,
  checkAnswer,
  filterQuestions,
  firstUnansweredIndex,
  nextUnansweredIndex,
  normalizeText,
} from './questions'

describe('题库数据完整性', () => {
  const bank = allQuestions()
  const singles = bank.filter((q) => q.type === 'single')
  const blanks = bank.filter((q) => q.type === 'blank')
  const judges = bank.filter((q) => q.type === 'judge')

  it('包含三种题型且数量为 358', () => {
    expect(singles.length).toBeGreaterThan(0)
    expect(blanks.length).toBeGreaterThan(0)
    expect(judges.length).toBeGreaterThan(0)
    expect(bank.length).toBe(358)
  })

  it('每个单选题都有答案且答案下标在选项范围内', () => {
    for (const q of singles) {
      expect(q.id).toBeTypeOf('number')
      expect(q.options.length).toBeGreaterThanOrEqual(2)
      expect(q.answer).toBeGreaterThanOrEqual(0)
      expect(q.answer).toBeLessThan(q.options.length)
    }
  })

  it('每个填空题与判断题都有合法答案', () => {
    for (const q of blanks) expect(q.answer.trim().length).toBeGreaterThan(0)
    for (const q of judges) expect(typeof q.answer).toBe('boolean')
  })

  it('每题都有章节与题干', () => {
    for (const q of bank) {
      expect(q.chapter.trim().length).toBeGreaterThan(0)
      expect(q.question.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('checkAnswer 判分', () => {
  const single: Question = {
    id: 1,
    type: 'single',
    chapter: 'SpringBoot',
    question: '核心注解',
    options: ['A', 'B', 'C', 'D'],
    answer: 2, // C
  }
  const judge: Question = { id: 2, type: 'judge', chapter: 'SpringBoot', question: 'Q', answer: false }
  const blank: Question = { id: 3, type: 'blank', chapter: 'SpringBoot', question: 'Q', answer: 'tomcat' }

  it('单选：答对/答错判定', () => {
    expect(checkAnswer(single, 2)).toBe(true)
    expect(checkAnswer(single, 0)).toBe(false)
  })

  it('判断：布尔判定', () => {
    expect(checkAnswer(judge, false)).toBe(true)
    expect(checkAnswer(judge, true)).toBe(false)
  })

  it('填空：忽略大小写与首尾/连续空白', () => {
    expect(checkAnswer(blank, 'Tomcat')).toBe(true)
    expect(checkAnswer(blank, '  tomcat ')).toBe(true)
    expect(checkAnswer(blank, 'mysql')).toBe(false)
  })
})

describe('normalizeText', () => {
  it('去除首尾空格并压缩连续空格、转小写', () => {
    expect(normalizeText('  Spring   Boot  ')).toBe('spring boot')
  })
})

describe('filterQuestions 筛选', () => {
  const q1: Question = { id: 1, type: 'single', chapter: 'SpringBoot', question: 'q', options: ['a', 'b'], answer: 0 }
  const q2: Question = { id: 2, type: 'judge', chapter: 'SpringBoot', question: 'q', answer: true }
  const q3: Question = { id: 3, type: 'single', chapter: 'Vue3 基础', question: 'q', options: ['a', 'b'], answer: 1 }

  it('按题型筛选', () => {
    expect(filterQuestions([q1, q2, q3], ['single'], [])).toEqual([q1, q3])
  })

  it('按章节筛选', () => {
    expect(filterQuestions([q1, q2, q3], [], ['SpringBoot'])).toEqual([q1, q2])
  })

  it('空数组表示不限', () => {
    expect(filterQuestions([q1, q2], [], [])).toEqual([q1, q2])
  })

  it('取出章节列表（去重、保序）', () => {
    expect(chapterList([q1, q2, q3])).toEqual(['SpringBoot', 'Vue3 基础'])
  })
})

describe('未答题定位（答对自动下一题 / 刷新跳未刷）', () => {
  const q1: Question = { id: 1, type: 'single', chapter: 'SpringBoot', question: 'q', options: ['a', 'b'], answer: 0 }
  const q2: Question = { id: 2, type: 'judge', chapter: 'SpringBoot', question: 'q', answer: true }
  const q3: Question = { id: 3, type: 'single', chapter: 'SpringBoot', question: 'q', options: ['a', 'b'], answer: 1 }
  const pool = [q1, q2, q3]

  it('firstUnansweredIndex 返回第一个未答题下标', () => {
    expect(firstUnansweredIndex(pool, new Set())).toBe(0)
    expect(firstUnansweredIndex(pool, new Set([1]))).toBe(1)
    expect(firstUnansweredIndex(pool, new Set([1, 2, 3]))).toBe(0) // 全部已答回退 0
  })

  it('nextUnansweredIndex 返回 fromIndex 之后第一个未答题', () => {
    expect(nextUnansweredIndex(pool, new Set([1]), 0)).toBe(1)
    expect(nextUnansweredIndex(pool, new Set([1, 2]), 0)).toBe(2)
    expect(nextUnansweredIndex(pool, new Set([1, 2]), 2)).toBe(-1) // 之后无未答题返回 -1
    expect(nextUnansweredIndex(pool, new Set([1, 2, 3]), 0)).toBe(-1) // 全部已答返回 -1
  })
})