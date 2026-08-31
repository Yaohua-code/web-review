/** 答题进度存储：questionId(string) -> 是否答对 */
export type ProgressRecord = Record<string, boolean>

const STORAGE_KEY_PROGRESS = 'web-review-progress-v2'
const STORAGE_KEY_BANK = 'web-review-bank-v1'
const STORAGE_KEY_THEME = 'web-review-theme-v1'

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

function removeKey(key: string): void {
  if (hasStorage()) {
    window.localStorage.removeItem(key)
  } else {
    delete memoryStore[key]
  }
}

/* ---------- 进度 ---------- */

/** 读取进度记录 */
export function loadProgress(): ProgressRecord {
  const str = readJson(STORAGE_KEY_PROGRESS)
  if (!str) return {}
  try {
    const parsed = JSON.parse(str) as ProgressRecord
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

/** 记录一次答题结果 */
export function saveAnswer(questionId: string, correct: boolean): ProgressRecord {
  const record = loadProgress()
  record[questionId] = correct
  writeJson(STORAGE_KEY_PROGRESS, JSON.stringify(record))
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
export function wrongIds(record: ProgressRecord): string[] {
  return Object.entries(record)
    .filter(([, correct]) => !correct)
    .map(([id]) => id)
}

/** 某题是否正确作答过 */
export function isAnswered(record: ProgressRecord, id: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, id)
}

/** 清除所有进度 */
export function resetProgress(): void {
  removeKey(STORAGE_KEY_PROGRESS)
}

/* ---------- 当前题库选择（持久化到 v2 里独立 key） ---------- */

const DEFAULT_BANK_ID = 'web'

/** 读取上次选择的题库 id */
export function loadBankId(bankIds: string[]): string {
  const id = readJson(STORAGE_KEY_BANK)
  if (id && bankIds.includes(id)) return id
  return DEFAULT_BANK_ID
}

/** 保存当前题库 id */
export function saveBankId(id: string): void {
  writeJson(STORAGE_KEY_BANK, id)
}

/* ---------- 主题（暗色模式） ---------- */

export type ThemeName = 'light' | 'dark'

const DEFAULT_THEME: ThemeName = 'light'

/** 读取上次保存的主题；若无则跟随系统 */
export function loadTheme(): ThemeName {
  const saved = readJson(STORAGE_KEY_THEME) as ThemeName | null
  if (saved === 'light' || saved === 'dark') return saved
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return DEFAULT_THEME
}

/** 保存当前主题选择 */
export function saveTheme(theme: ThemeName): void {
  writeJson(STORAGE_KEY_THEME, theme)
}
