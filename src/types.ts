/** 题型枚举 */
export type QuestionType = 'single' | 'blank' | 'judge' | 'short' | 'comprehensive'

export interface BaseQuestion {
  /** 唯一标识（带 bank 前缀，如 "web:1" "py:300"） */
  id: string
  type: QuestionType
  /** 归一化章节名 */
  chapter: string
  question: string
}

/** 单选题：选项数组 + 正确答案下标 */
export interface SingleQuestion extends BaseQuestion {
  type: 'single'
  options: string[]
  answer: number
}

/** 填空题：标准答案字符串 */
export interface BlankQuestion extends BaseQuestion {
  type: 'blank'
  answer: string
}

/** 判断题：答案布尔值 */
export interface JudgeQuestion extends BaseQuestion {
  type: 'judge'
  answer: boolean
}

/** 简答题：参考答案（不做自动判分，供自我对照） */
export interface ShortQuestion extends BaseQuestion {
  type: 'short'
  answer: string
}

/** 综合题（含代码/多步骤）：参考答案，不做自动判分 */
export interface ComprehensiveQuestion extends BaseQuestion {
  type: 'comprehensive'
  answer: string
}

export type Question =
  | SingleQuestion
  | BlankQuestion
  | JudgeQuestion
  | ShortQuestion
  | ComprehensiveQuestion

/** 用户的作答输入 */
export type AnswerInput = number | boolean | string

/** 单个题库的元信息 */
export interface QuestionBank {
  id: string
  name: string
  count: number
  counts: Partial<Record<QuestionType, number>>
  questions: Question[]
}

/** 顶层题库容器 */
export interface QuestionBundle {
  version: number
  generatedAt: string
  banks: QuestionBank[]
}
