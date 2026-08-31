/**
 * 多题库构建脚本（MVP 输出：src/data/questions.json）
 *   题库 1：Web前端开发实战复习题库.docx（解析 docx，题型：单选/填空/判断，排除简答）
 *   题库 2：Python复习题.xlsx（解析 xlsx，题型：单选/填空，排除简答）
 *
 * 产物结构：
 *   { version, generatedAt, banks: [{ id, name, count, counts, questions: [] }] }
 * question.id 为字符串，带 bank 前缀保证跨题库唯一（例如 "web:1" "py:300"）
 */
import JSZip from 'jszip'
import xlsxPkg from 'xlsx'
const { readFile: xlsxReadFile, utils: xlsxUtils } = xlsxPkg
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'src', 'data', 'questions.json')

/* ---------- 共用：HTML 实体解码 ---------- */
function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

/* ---------- docx 解析（Web 前端题库，保留原逻辑） ---------- */
const TYPE_HEADERS = {
  单选题库: 'single',
  填空题库: 'blank',
  判断题库: 'judge',
}

function isChapterLine(line, sectionType) {
  if (/^\d+、/.test(line)) return false
  if (/^答案：/.test(line)) return false
  if (/^[A-H][：:]\s*\S/.test(line)) return false
  if (/[对错】]?答案：/.test(line)) return false
  if (sectionType) return true
  return false
}

const CHAPTER_RULES = [
  [/前后端分离\s*&?.*SpringBoot|SpringBoot.*前后端分离/i, 'SpringBoot 与前后端分离'],
  [/SpringBoot/i, 'SpringBoot'],
  [/MyBatis/i, 'MyBatis 与 Druid'],
  [/组件/i, 'Vue3 组件与通信'],
  [/路由/i, 'Vue3 路由与 Axios'],
  [/项目搭建/i, 'Vue3 项目搭建与指令'],
  [/Vue3?[^\n]*基础语法|基础语法/i, 'Vue3 基础'],
  [/JSON|JWT|FastJSON|Security/i, 'JSON 与 JWT'],
]
function normalizeChapter(src) {
  for (const [re, name] of CHAPTER_RULES) {
    if (re.test(src)) return name
  }
  return src
}

async function extractDocxLines(pathName) {
  const buf = fs.readFileSync(pathName)
  const zip = await JSZip.loadAsync(buf)
  const xml = await zip.file('word/document.xml').async('string')
  const text = xml
    .replace(/<w:tab[^>]*\/>/g, '  ')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
  return decodeEntities(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}

function parseDocxQuestions(lines) {
  const questions = []
  let sectionType = null
  let chapter = null
  let single = null
  let pendingBlank = null

  const flushSingle = () => {
    if (single) {
      questions.push({
        type: 'single',
        chapter,
        question: single.question,
        options: single.options,
        answer: single.answer,
      })
    }
    single = null
  }

  for (const line of lines) {
    if (Object.prototype.hasOwnProperty.call(TYPE_HEADERS, line)) {
      flushSingle()
      sectionType = TYPE_HEADERS[line]
      chapter = null
      continue
    }
    if (line.includes('简答题库') || line.includes('综合题库') || line.startsWith('五、')) break
    if (!sectionType) continue

    if (isChapterLine(line, sectionType)) {
      flushSingle()
      chapter = normalizeChapter(line)
      continue
    }

    if (sectionType === 'single') {
      const mQ = line.match(/^(\d+)、(.+)$/)
      if (mQ) {
        flushSingle()
        single = { question: mQ[2], options: [] }
        continue
      }
      const mOpt = line.match(/^([A-H])[：:]\s*(.+)$/)
      if (mOpt && single) {
        single.options.push(mOpt[2])
        continue
      }
      const mAns = line.match(/^答案：([A-H])$/)
      if (mAns && single) {
        single.answer = mAns[1].charCodeAt(0) - 65
        flushSingle()
        continue
      }
      continue
    }

    if (sectionType === 'blank') {
      const mQ = line.match(/^(\d+)、(.+)$/)
      if (mQ) {
        questions.push({ type: 'blank', chapter, question: mQ[2] })
        pendingBlank = questions[questions.length - 1]
        continue
      }
      const mAns = line.match(/^答案：(.+)$/)
      if (mAns && pendingBlank) {
        pendingBlank.answer = mAns[1]
        pendingBlank = null
        continue
      }
      continue
    }

    if (sectionType === 'judge') {
      const mQ = line.match(/^(\d+)、(.+?)答案：([对错])$/)
      if (mQ) {
        questions.push({
          type: 'judge',
          chapter,
          question: mQ[2],
          answer: mQ[3] === '对',
        })
      }
    }
  }
  flushSingle()
  return questions
}

/* ---------- xlsx 解析（Python 题库） ---------- */
const OPTION_COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

function normalizeAnswerLetter(v) {
  return String(v ?? '').trim().toUpperCase()
}

function parseXlsxQuestions(xlsxPath) {
  const questions = []
  const wb = xlsxReadFile(xlsxPath)
  // Sheet: 单选（200）/ 填空（100）/ 简答（跳过，无判分基础）
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const rows = xlsxUtils.sheet_to_json(ws, { defval: '', raw: false })
    if (sheetName === '单选') {
      for (const r of rows) {
        const stem = cleanStr(r['题干'])
        const answerLetter = normalizeAnswerLetter(r['正确答案'])
        const answerIndex = OPTION_COLS.indexOf(answerLetter)
        if (!stem || answerIndex < 0) continue
        const opts = OPTION_COLS.map((c) => cleanStr(r[c])).filter((s) => s.length > 0)
        if (answerIndex >= opts.length) continue
        questions.push({
          type: 'single',
          chapter: 'Python 单选',
          question: stem,
          options: opts,
          answer: answerIndex,
        })
      }
    } else if (sheetName === '填空') {
      for (const r of rows) {
        const stem = cleanStr(r['题干'])
        // 答案放在列名为 "1" 的位置，"2" 是空备用列
        const ans = cleanStr(r['1'])
        if (!stem || !ans) continue
        questions.push({ type: 'blank', chapter: 'Python 填空', question: stem, answer: ans })
      }
    }
    // 简答：跳过
  }
  return questions
}

function cleanStr(v) {
  return String(v ?? '').replace(/\r/g, '').trim()
}

/* ---------- 主流程：读取 2 个源 → 聚合写入 ---------- */
/** 在 ROOT 下（含一级子目录）查找匹配文件名的文件（忽略大小写） */
function findAnywhere(filename) {
  const target = filename.toLowerCase()
  const candidates = [ROOT, path.join(ROOT, 'questionBank')]
  for (const dir of candidates) {
    if (!fs.existsSync(dir)) continue
    for (const f of fs.readdirSync(dir)) {
      if (f.toLowerCase() === target) return path.join(dir, f)
    }
  }
  return null
}

async function main() {
  // --- Web ---
  const docxPath = findAnywhere('Web前端开发实战复习题库.docx')
  if (!docxPath) throw new Error('找不到 Web前端开发实战复习题库.docx')
  const webRaw = parseDocxQuestions(await extractDocxLines(docxPath))
  const web = assignIds(webRaw, 'web')
  // --- Python ---
  const pyXlsx = findAnywhere('Python复习题.xlsx')
  if (!pyXlsx) throw new Error('找不到 Python复习题.xlsx')
  const pyRaw = parseXlsxQuestions(pyXlsx)
  const py = assignIds(pyRaw, 'py')

  const banks = [
    buildBankMeta({ id: 'web', name: 'Web前端题库', questions: web }),
    buildBankMeta({ id: 'py', name: 'Python题库', questions: py }),
  ]
  const payload = {
    version: 2,
    generatedAt: new Date().toISOString(),
    banks,
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf-8')
  console.log(`\n题库生成完成`)
  for (const b of banks) {
    console.log(`  - ${b.name}（${b.id}）：共 ${b.count} 题`, b.counts)
  }
}

function assignIds(qs, prefix) {
  return qs.map((q, i) => ({ ...q, id: `${prefix}:${i + 1}` }))
}
function buildBankMeta({ id, name, questions }) {
  const counts = questions.reduce((acc, q) => {
    acc[q.type] = (acc[q.type] || 0) + 1
    return acc
  }, {})
  return { id, name, count: questions.length, counts, questions }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
