import fs from 'node:fs'
import path from 'node:path'

// 读取 _reconvert 已转成 utf-8 的临时文本，解析为结构化题目数组
// 输出 src/data/raw/newtech.json
const dir = 'd:\\Web\\WebReview\\scripts'
const outDir = 'd:\\Web\\WebReview\\src\\data\\raw'

function loadUtf8(name) {
  return fs.readFileSync(path.join(dir, name), 'utf-8')
}

function parseSingle(txt) {
  const questions = []
  const blocks = txt.split('【单选题】').slice(1)
  for (const b of blocks) {
    const stem = (b.match(/\[题干：\]([^\r\n]*)/) || [])[1]?.trim()
    const ans = (b.match(/\[正确答案：\]([^\r\n]*)/) || [])[1]?.trim()
    const knowledge = (b.match(/\[知识点：\]([^\r\n]*)/) || [])[1]?.trim()
    const opts = []
    for (const L of 'ABCDEFGH') {
      const m = b.match(new RegExp(`\\[${L}：\\]([^\\r\\n]*)`))
      if (!m) break
      const v = m[1].trim()
      if (!v) break
      opts.push(v)
    }
    if (!stem || !ans || opts.length === 0) continue
    const idx = 'ABCDEFGH'.indexOf(ans.toUpperCase())
    if (idx < 0 || idx >= opts.length) continue
    questions.push({ type: 'single', chapter: knowledge || '互联网前沿基础', question: stem, options: opts, answer: idx })
  }
  return questions
}

function parseJudge(txt) {
  const questions = []
  const blocks = txt.split('【判断题】').slice(1)
  for (const b of blocks) {
    const stem = (b.match(/\[题干：\]([^\r\n]*)/) || [])[1]?.trim()
    const ans = (b.match(/\[正确答案：\]([^\r\n]*)/) || [])[1]?.trim()
    const knowledge = (b.match(/\[知识点：\]([^\r\n]*)/) || [])[1]?.trim()
    if (!stem || !ans) continue
    const answer = ans === '对'
    questions.push({ type: 'judge', chapter: knowledge || '互联网前沿基础', question: stem, answer })
  }
  return questions
}

function parseBlank(txt) {
  const questions = []
  const blocks = txt.split('【填空题】').slice(1)
  for (const b of blocks) {
    const stem = (b.match(/\[题干：\]([^\r\n]*)/) || [])[1]?.trim()
    const knowledge = (b.match(/\[知识点：\]([^\r\n]*)/) || [])[1]?.trim()
    const ans = (b.match(/\[正确答案 1：\]([^\r\n]*)/) || [])[1]?.trim()
    if (!stem || !ans) continue
    questions.push({ type: 'blank', chapter: knowledge || '互联网前沿基础', question: stem, answer: ans })
  }
  return questions
}

function parseShort(txt) {
  const questions = []
  const blocks = txt.split('【简答题】').slice(1)
  for (const b of blocks) {
    const stem = (b.match(/\[题干：\]([^\r\n]*)/) || [])[1]?.trim()
    const knowledge = (b.match(/\[知识点：\]([^\r\n]*)/) || [])[1]?.trim()
    const ans = (b.match(/\[正确答案：\]([^\r\n]*)/) || [])[1]?.trim()
    if (!stem || !ans) continue
    questions.push({ type: 'short', chapter: knowledge || '互联网前沿基础', question: stem, answer: ans })
  }
  return questions
}

const data = [
  ...parseSingle(loadUtf8('_single.txt')),
  ...parseJudge(loadUtf8('_判断题.txt')),
  ...parseBlank(loadUtf8('_填空题.txt')),
  ...parseShort(loadUtf8('_简答题.txt')),
]

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'newtech.json'), JSON.stringify(data, null, 2), 'utf-8')

const counts = data.reduce((a, q) => ((a[q.type] = (a[q.type] || 0) + 1), a), {})
console.log('parsed:', data.length, counts)
const chapters = [...new Set(data.map((q) => q.chapter))]
console.log('chapters:', chapters.join(' | '))