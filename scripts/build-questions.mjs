/**
 * 将 Web前端开发实战复习题库.docx 解析为结构化 JSON
 * 仅保留：单选、填空、判断三中题型（简答无参考答案，已排除）
 * 输出：src/data/questions.json
 */
import JSZip from 'jszip'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DOCX = path.join(ROOT, 'Web前端开发实战复习题库.docx')
const OUT = path.join(ROOT, 'src', 'data', 'questions.json')

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

async function extractText(pathName) {
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

const TYPE_HEADERS = {
  单选题库: 'single',
  填空题库: 'blank',
  判断题库: 'judge',
}

/** 章节行：非题号、非答案、非选项的短文本行 */
function isChapterLine(line, sectionType) {
  if (/^\d+、/.test(line)) return false
  if (/^答案：/.test(line)) return false
  if (/^[A-H][：:]\s*\S/.test(line)) return false
  if (/[对错】]?答案：/.test(line)) return false
  // 已进入具体题型章节范围后，纯文本行即视为章节
  if (sectionType) return true
  return false
}

/** 将不同题型中的章节名归一化为统一章节，便于跨题型筛选 */
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

export function normalizeChapter(src) {
  for (const [re, name] of CHAPTER_RULES) {
    if (re.test(src)) return name
  }
  return src
}

export function parseLines(lines) {
  const questions = []
  let sectionType = null
  let chapter = null
  let single = null
  let pendingBlank = null

  const flushSingle = () => {
    if (single) {
      questions.push({
        id: questions.length + 1,
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
    // 题型分节头
    if (Object.prototype.hasOwnProperty.call(TYPE_HEADERS, line)) {
      flushSingle()
      sectionType = TYPE_HEADERS[line]
      chapter = null
      continue
    }
    // 到简答/综合即停止（无参考文献）
    if (line.includes('简答题库') || line.includes('综合题库') || line.startsWith('五、')) {
      break
    }
    if (!sectionType) continue

    // 章节行
    if (isChapterLine(line, sectionType)) {
      flushSingle()
      chapter = normalizeChapter(line)
      continue
    }

    // 单选：题 / 选项 / 答案
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

    // 填空：题目行 + 下一行“答案：xxx”
    if (sectionType === 'blank') {
      const mQ = line.match(/^(\d+)、(.+)$/)
      if (mQ) {
        questions.push({ id: questions.length + 1, type: 'blank', chapter, question: mQ[2] })
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

    // 判断：题目行内嵌“答案：对/错”
    if (sectionType === 'judge') {
      const mQ = line.match(/^(\d+)、(.+?)答案：([对错])$/)
      if (mQ) {
        questions.push({
          id: questions.length + 1,
          type: 'judge',
          chapter,
          question: mQ[2],
          answer: mQ[3] === '对',
        })
        continue
      }
      continue
    }
  }
  flushSingle()
  return questions
}

async function main() {
  const lines = await extractText(DOCX)
  const questions = parseLines(lines)
  const counts = questions.reduce((acc, q) => {
    acc[q.type] = (acc[q.type] || 0) + 1
    return acc
  }, {})

  const data = {
    version: 1,
    generatedAt: new Date().toISOString(),
    count: questions.length,
    counts,
    questions,
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2), 'utf-8')
  console.log(`生成完成：共 ${questions.length} 题`, counts)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})