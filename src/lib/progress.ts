/** 答题进度存储：questionId -> 是否答对 */
export type ProgressRecord = Record<number, boolean>

const STORAGE_KEY = 'web-review-progress-v1'

/** 兼容无 localStorage 环境（如部分测试环境），退回内存存储 */
const memoryStore: Record<string, string> = {}

function hasStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage
}

function readJson(key: string): string | null {
  if (hasStorage()) return window.localStorage.getItem(key)
  return memoryStore[key] ?? null
}

function writeJson(key: string, value: string): void {
  if (hasStorage()) {
    window.localStorage.setItem(key, value)
  } else {
    memoryStore[key] = value
  }
}

/** 读取进度记录 */
export function loadProgress(): ProgressRecord {
  const str = readJson(STORAGE_KEY)
  if (!str) return {}
  try {
    const parsed = JSON.parse(str) as ProgressRecord
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

/** 记录一次答题结果 */
export function saveAnswer(questionId: number, correct: boolean): ProgressRecord {
  const record = loadProgress()
  record[questionId] = correct
  writeJson(STORAGE_KEY, JSON.stringify(record))
  return record
}

/** 已答题数 */
export function answeredCount(record: ProgressRecord): number {
  return Object.keys(record).length
}

/** 答对数 */
export function correctCount(record: ProgressRecord): number {
  return Object.values(record).filter(Boolean).length
}

/** 答错题 id 列表 */
export function wrongIds(record: ProgressRecord): number[] {
  return Object.entries(record)
    .filter(([, correct]) => !correct)
    .map(([id]) => Number(id))
}

/** 某题是否正确作答过 */
export function isAnswered(record: ProgressRecord, id: number): boolean {
  return Object.prototype.hasOwnProperty.call(record, id)
}

/** 清除所有进度 */
export function resetProgress(): void {
  if (hasStorage()) {
    window.localStorage.removeItem(STORAGE_KEY)
  } else {
    delete memoryStore[STORAGE_KEY]
  }
}