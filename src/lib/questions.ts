import type { AnswerInput, Question, QuestionBank, QuestionBundle, QuestionType } from '../types'
import raw from '../data/questions.json'

const bundle = raw as unknown as QuestionBundle

/** 全部题库（按源顺序） */
export function allBanks(): QuestionBank[] {
  return bundle.banks
}

/** 按 id 取题库；找不到返回第一个题库 */
export function bankById(id: string): QuestionBank {
  return bundle.banks.find((b) => b.id === id) ?? bundle.banks[0]
}

/** 返回指定题库的全部题目（默认取第一个题库） */
export function allQuestions(bankId?: string): Question[] {
  return bankId ? bankById(bankId).questions : bundle.banks[0].questions
}

/** 返回某题库实际出现的题型集合（按 single/blank/judge/short 固定顺序） */
export function availableTypes(bank: QuestionBank): QuestionType[] {
  const order: QuestionType[] = ['single', 'blank', 'judge', 'short']
  return order.filter((t) => (bank.counts[t] ?? 0) > 0)
}

/** 题库内可用章节数；仅 1 个章节时 UI 可不再重复渲染章节筛选 */
export function availableChapters(bank: QuestionBank): string[] {
  return chapterList(bank.questions)
}

/** 题型中文标签 */
export function typeLabel(type: QuestionType): string {
  switch (type) {
    case 'single':
      return '单选'
    case 'blank':
      return '填空'
    case 'judge':
      return '判断'
    case 'short':
      return '简答'
  }
}

/** 归一化文本对比（去首尾空白、压缩连续空白、忽略大小写） */
export function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

/** 题目正确性判断 */
export function checkAnswer(question: Question, input: AnswerInput): boolean {
  switch (question.type) {
    case 'single':
      return question.answer === (input as number)
    case 'judge':
      return question.answer === (input as boolean)
    case 'blank':
      return normalizeText(question.answer) === normalizeText(String(input))
    case 'short':
      // 简答无自动判分基础，始终不判对错
      return false
  }
}

/** 返回正确答案的展示文本 */
export function correctText(question: Question): string {
  switch (question.type) {
    case 'single':
      return question.options[question.answer] ?? ''
    case 'judge':
      return question.answer ? '对' : '错'
    case 'blank':
      return question.answer
    case 'short':
      return question.answer
  }
}

/** 单选正确答案对应的标签，如 A/B/C/D */
export function correctIndexLabel(question: Question): string | null {
  if (question.type !== 'single') return null
  return String.fromCharCode(65 + question.answer)
}

/** 按题型与章节筛选题目（空数组表示不限） */
export function filterQuestions(
  questions: Question[],
  types: QuestionType[],
  chapters: string[],
): Question[] {
  return questions.filter((q) => {
    if (types.length > 0 && !types.includes(q.type)) return false
    if (chapters.length > 0 && !chapters.includes(q.chapter)) return false
    return true
  })
}

/** 获取题库中的所有章节（按出现顺序） */
export function chapterList(questions: Question[]): string[] {
  const seen: string[] = []
  for (const q of questions) {
    if (!seen.includes(q.chapter)) seen.push(q.chapter)
  }
  return seen
}

/** 在 fromIndex 之后找第一个未答题的下标；找不到返回 -1 */
export function nextUnansweredIndex(
  questions: Question[],
  answeredIds: ReadonlySet<string>,
  fromIndex: number,
): number {
  for (let i = fromIndex + 1; i < questions.length; i++) {
    if (!answeredIds.has(questions[i].id)) return i
  }
  return -1
}

/** 第一个未答题的下标；全部已答时返回 0 */
export function firstUnansweredIndex(
  questions: Question[],
  answeredIds: ReadonlySet<string>,
): number {
  const i = questions.findIndex((q) => !answeredIds.has(q.id))
  return i === -1 ? 0 : i
}
