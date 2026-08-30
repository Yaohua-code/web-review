/** 题型枚举 */
export type QuestionType = 'single' | 'blank' | 'judge'

export interface BaseQuestion {
  /** 唯一标识 */
  id: number
  type: QuestionType
  /** 归一化章节名 */
  chapter: string
  question: string
}

/** 单选题：A-D 选项 + 正确答案下标 */
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

export type Question = SingleQuestion | BlankQuestion | JudgeQuestion

/** 用户的作答输入 */
export type AnswerInput = number | boolean | string

export interface QuestionBank {
  version: number
  generatedAt: string
  count: number
  counts: Partial<Record<QuestionType, number>>
  questions: Question[]
}