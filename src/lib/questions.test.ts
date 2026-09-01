import { describe, expect, it } from 'vitest'
import type { Question } from '../types'
import {
  allBanks,
  allQuestions,
  availableChapters,
  availableTypes,
  bankById,
  chapterList,
  checkAnswer,
  correctText,
  filterQuestions,
  firstUnansweredIndex,
  nextUnansweredIndex,
  normalizeText,
  typeLabel,
} from './questions'

describe('多题库数据完整性（Web 358 + Python 327 + 互联网前沿 376）', () => {
  const banks = allBanks()
  const webBank = bankById('web')
  const pyBank = bankById('py')
  const nwBank = bankById('nw')

  it('包含 3 个题库，含 id/name/count/counts/questions', () => {
    expect(banks).toHaveLength(3)
    for (const b of banks) {
      expect(typeof b.id).toBe('string')
      expect(b.name.length).toBeGreaterThan(0)
      expect(b.count).toBe(b.questions.length)
      expect(Object.keys(b.counts).length).toBeGreaterThan(0)
    }
  })

  it('Web 题库 358 题（单选/填空/判断齐全）', () => {
    expect(webBank.count).toBe(358)
    expect(webBank.counts.single).toBe(119)
    expect(webBank.counts.blank).toBe(119)
    expect(webBank.counts.judge).toBe(120)
    expect(availableTypes(webBank)).toEqual(['single', 'blank', 'judge'])
  })

  it('Python 题库 335 题（单选 200 / 填空 100 / 简答 27 / 综合(代码) 8，无判断）', () => {
    expect(pyBank.count).toBe(335)
    expect(pyBank.counts.single).toBe(200)
    expect(pyBank.counts.blank).toBe(100)
    expect(pyBank.counts.short).toBe(27)
    expect(pyBank.counts.comprehensive).toBe(8)
    expect(pyBank.counts.judge).toBeUndefined()
    expect(availableTypes(pyBank)).toEqual(['single', 'blank', 'short', 'comprehensive'])
  })

  it('互联网前沿新技术题库 376 题（单选 154 / 判断 100 / 填空 100 / 简答 20 / 综合 2）', () => {
    expect(nwBank.count).toBe(376)
    expect(nwBank.counts.single).toBe(154)
    expect(nwBank.counts.judge).toBe(100)
    expect(nwBank.counts.blank).toBe(100)
    expect(nwBank.counts.short).toBe(20)
    expect(nwBank.counts.comprehensive).toBe(2)
    expect(availableTypes(nwBank)).toEqual(['single', 'blank', 'judge', 'short', 'comprehensive'])
  })

  it('全部题目的 id 带 bank 前缀且唯一', () => {
    const seen = new Set<string>()
    for (const b of banks) {
      for (const q of b.questions) {
        expect(typeof q.id).toBe('string')
        expect(q.id.startsWith(b.id + ':')).toBe(true)
        expect(seen.has(q.id)).toBe(false)
        seen.add(q.id)
      }
    }
  })

  it('每个题目字段合法（答案/章节/题干）', () => {
    for (const b of banks) {
      for (const q of b.questions) {
        expect(q.chapter.trim().length).toBeGreaterThan(0)
        expect(q.question.trim().length).toBeGreaterThan(0)
        if (q.type === 'single') {
          expect(q.options.length).toBeGreaterThanOrEqual(2)
          expect(q.answer).toBeGreaterThanOrEqual(0)
          expect(q.answer).toBeLessThan(q.options.length)
        } else if (q.type === 'blank') {
          expect(q.answer.trim().length).toBeGreaterThan(0)
        } else if (q.type === 'judge') {
          expect(typeof q.answer).toBe('boolean')
        } else if (q.type === 'short') {
          expect(q.answer.trim().length).toBeGreaterThan(0)
        } else if (q.type === 'comprehensive') {
          expect(q.answer.trim().length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('Python 题库章节数为 4，互联网前沿章节为 2（基础+综合）', () => {
    expect(availableChapters(webBank).length).toBeGreaterThan(1)
    expect(availableChapters(pyBank)).toEqual(['Python 单选', 'Python 填空', 'Python 简答', 'Python 编程'])
    expect(availableChapters(nwBank)).toEqual(['互联网前沿基础', '互联网前沿综合'])
  })
})

describe('checkAnswer 判分', () => {
  const single: Question = {
    id: 'x:1',
    type: 'single',
    chapter: 'SpringBoot',
    question: '核心注解',
    options: ['A', 'B', 'C', 'D'],
    answer: 2, // C
  }
  const judge: Question = { id: 'x:2', type: 'judge', chapter: 'SpringBoot', question: 'Q', answer: false }
  const blank: Question = { id: 'x:3', type: 'blank', chapter: 'SpringBoot', question: 'Q', answer: 'tomcat' }
  const short: Question = {
    id: 'x:4',
    type: 'short',
    chapter: 'SpringBoot',
    question: 'Q',
    answer: 'Python 基于值的内存管理',
  }

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

  it('简答：不做自动判分（始终 false），参考答案可读', () => {
    expect(checkAnswer(short, '随便写什么')).toBe(false)
    expect(correctText(short)).toBe('Python 基于值的内存管理')
  })
})

describe('normalizeText', () => {
  it('去除首尾空格并压缩连续空格、转小写', () => {
    expect(normalizeText('  Spring   Boot  ')).toBe('spring boot')
  })
})

describe('filterQuestions 筛选', () => {
  const q1: Question = { id: 'x:1', type: 'single', chapter: 'SpringBoot', question: 'q', options: ['a', 'b'], answer: 0 }
  const q2: Question = { id: 'x:2', type: 'judge', chapter: 'SpringBoot', question: 'q', answer: true }
  const q3: Question = { id: 'x:3', type: 'single', chapter: 'Vue3 基础', question: 'q', options: ['a', 'b'], answer: 1 }
  const q4: Question = { id: 'x:4', type: 'short', chapter: 'Python 简答', question: 'q', answer: '参考答案' }

  it('按题型筛选', () => {
    expect(filterQuestions([q1, q2, q3], ['single'], [])).toEqual([q1, q3])
  })

  it('按简答题型筛选', () => {
    expect(filterQuestions([q1, q2, q4], ['short'], [])).toEqual([q4])
  })

  it('按章节筛选', () => {
    expect(filterQuestions([q1, q2, q3], [], ['SpringBoot'])).toEqual([q1, q2])
  })

  it('空数组表示不限', () => {
    expect(filterQuestions([q1, q2], [], [])).toEqual([q1, q2])
  })

  it('取出章节列表（去重、保序）', () => {
    expect(chapterList([q1, q2, q3, q4])).toEqual(['SpringBoot', 'Vue3 基础', 'Python 简答'])
  })
})

describe('typeLabel 题型标签', () => {
  it('五种题型均返回中文标签', () => {
    expect(typeLabel('single')).toBe('单选')
    expect(typeLabel('blank')).toBe('填空')
    expect(typeLabel('judge')).toBe('判断')
    expect(typeLabel('short')).toBe('简答')
    expect(typeLabel('comprehensive')).toBe('综合')
  })
})

describe('未答题定位（答对自动下一题 / 刷新跳未刷）', () => {
  const q1: Question = { id: 'p:1', type: 'single', chapter: 'SpringBoot', question: 'q', options: ['a', 'b'], answer: 0 }
  const q2: Question = { id: 'p:2', type: 'judge', chapter: 'SpringBoot', question: 'q', answer: true }
  const q3: Question = { id: 'p:3', type: 'single', chapter: 'SpringBoot', question: 'q', options: ['a', 'b'], answer: 1 }
  const pool = [q1, q2, q3]

  it('firstUnansweredIndex 返回第一个未答题下标', () => {
    expect(firstUnansweredIndex(pool, new Set())).toBe(0)
    expect(firstUnansweredIndex(pool, new Set(['p:1']))).toBe(1)
    expect(firstUnansweredIndex(pool, new Set(['p:1', 'p:2', 'p:3']))).toBe(0)
  })

  it('nextUnansweredIndex 返回 fromIndex 之后第一个未答题', () => {
    expect(nextUnansweredIndex(pool, new Set(['p:1']), 0)).toBe(1)
    expect(nextUnansweredIndex(pool, new Set(['p:1', 'p:2']), 0)).toBe(2)
    expect(nextUnansweredIndex(pool, new Set(['p:1', 'p:2']), 2)).toBe(-1)
    expect(nextUnansweredIndex(pool, new Set(['p:1', 'p:2', 'p:3']), 0)).toBe(-1)
  })
})

describe('allQuestions / bankById 兼容兜底', () => {
  it('allQuestions() 默认取第一个题库（web）', () => {
    expect(allQuestions().length).toBe(358)
  })
  it('bankById 找不到时回退到第一个', () => {
    expect(bankById('not-exist').id).toBe('web')
  })
  it('bankById("py") 取出 Python 题库', () => {
    expect(bankById('py').count).toBe(335)
  })
})
