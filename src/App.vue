<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Question, QuestionType } from './types'
import { allQuestions, chapterList, filterQuestions, typeLabel } from './lib/questions'
import {
  answeredCount,
  correctCount,
  loadProgress,
  resetProgress,
  saveAnswer,
  wrongIds,
  type ProgressRecord,
} from './lib/progress'
import QuestionCard from './components/QuestionCard.vue'

const bank = allQuestions()

// ---------- 筛选 ----------
const typeOptions: Array<QuestionType | 'all'> = ['all', 'single', 'blank', 'judge']
const selectedType = ref<QuestionType | 'all'>('all')
const selectedChapter = ref<string>('all')
const wrongMode = ref(false)

const chapters = computed(() => chapterList(bank))

const basePool = computed<Question[]>(() => {
  if (wrongMode.value) {
    const wrong = new Set(wrongIds(progress.value))
    return bank.filter((q) => wrong.has(q.id))
  }
  const types = selectedType.value === 'all' ? [] : [selectedType.value]
  const chs = selectedChapter.value === 'all' ? [] : [selectedChapter.value]
  return filterQuestions(bank, types, chs)
})

// ---------- 进度 ----------
const progress = ref<ProgressRecord>(loadProgress())
function onSubmit(payload: { questionId: number; correct: boolean }): void {
  progress.value = saveAnswer(payload.questionId, payload.correct)
}
function onReset(): void {
  resetProgress()
  progress.value = {}
}

// ---------- 当前题目导航 ----------
const currentIndex = ref(0)
watch(basePool, () => {
  currentIndex.value = 0
})
const currentQuestion = computed<Question | null>(() => basePool.value[currentIndex.value] ?? null)
const currentProgress = computed(() =>
  currentQuestion.value ? progress.value[currentQuestion.value.id] ?? null : null,
)

function prev(): void {
  if (currentIndex.value > 0) currentIndex.value--
}
function next(): void {
  if (currentIndex.value < basePool.value.length - 1) currentIndex.value++
}

const statAnswered = computed(() => answeredCount(progress.value))
const statCorrect = computed(() => correctCount(progress.value))
const statWrong = computed(() => statAnswered.value - statCorrect.value)
const statRate = computed(() =>
  statAnswered.value === 0 ? 0 : Math.round((statCorrect.value / statAnswered.value) * 100),
)
</script>

<template>
  <div class="app">
    <header class="app__header">
      <h1 class="app__title">Web前端复习 · 刷题库</h1>
      <p class="app__subtitle">共 {{ bank.length }} 题 · 单选 / 填空 / 判断</p>
    </header>

    <!-- 统计条 -->
    <section class="stats">
      <div class="stat">
        <span class="stat__num">{{ statAnswered }}</span><span class="stat__label">已答</span>
      </div>
      <div class="stat">
        <span class="stat__num ok">{{ statCorrect }}</span><span class="stat__label">答对</span>
      </div>
      <div class="stat">
        <span class="stat__num ng">{{ statWrong }}</span><span class="stat__label">答错</span>
      </div>
      <div class="stat">
        <span class="stat__num">{{ statRate }}%</span><span class="stat__label">正确率</span>
      </div>
    </section>

    <!-- 筛选 -->
    <section class="filters">
      <div class="filter-row">
        <span class="filter-title">题型</span>
        <div class="chips">
          <button
            v-for="t in typeOptions"
            :key="t"
            class="chip"
            :class="{ active: !wrongMode && selectedType === t }"
            :disabled="wrongMode"
            @click="selectedType = t"
          >
            {{ t === 'all' ? '全部' : typeLabel(t) }}
          </button>
        </div>
      </div>
      <div class="filter-row">
        <span class="filter-title">章节</span>
        <div class="chips">
          <button
            class="chip"
            :class="{ active: !wrongMode && selectedChapter === 'all' }"
            :disabled="wrongMode"
            @click="selectedChapter = 'all'"
          >
            全部
          </button>
          <button
            v-for="c in chapters"
            :key="c"
            class="chip"
            :class="{ active: !wrongMode && selectedChapter === c }"
            :disabled="wrongMode"
            @click="selectedChapter = c"
          >
            {{ c }}
          </button>
        </div>
      </div>
      <div class="filter-row filter-row--actions">
        <button
          class="chip"
          :class="{ active: wrongMode }"
          data-kind="danger"
          @click="wrongMode = !wrongMode"
        >
          ★ 错题本（{{ statWrong }}）
        </button>
        <button class="chip" data-kind="ghost" @click="onReset">重置进度</button>
      </div>
    </section>

    <!-- 题目区 -->
    <main class="main">
      <div v-if="!currentQuestion" class="empty">
        <p>{{ wrongMode ? '暂无错题，继续加油！' : '当前筛选下没有题目' }}</p>
      </div>
      <template v-else>
        <div class="progress-line">
          <span>第 {{ currentIndex + 1 }} / {{ basePool.length }} 题</span>
          <span v-if="currentProgress !== null" class="progress-line__hint">
            {{ currentProgress ? '已答对' : '已答错' }}
          </span>
        </div>
        <QuestionCard :key="currentQuestion.id" :question="currentQuestion" @submit="onSubmit" />
        <div class="nav">
          <button class="nav__btn" :disabled="currentIndex === 0" @click="prev">上一题</button>
          <button
            class="nav__btn primary"
            :disabled="currentIndex === basePool.length - 1"
            @click="next"
          >
            下一题
          </button>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.app {
  max-width: 680px;
  margin: 0 auto;
  padding: 24px 16px 48px;
}
.app__header {
  text-align: center;
  margin-bottom: 18px;
}
.app__title {
  font-size: 24px;
  color: #0f172a;
  margin: 0 0 4px;
}
.app__subtitle {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}
.stat {
  background: #fff;
  border-radius: 12px;
  padding: 12px 8px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}
.stat__num {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}
.stat__num.ok {
  color: #16a34a;
}
.stat__num.ng {
  color: #dc2626;
}
.stat__label {
  font-size: 12px;
  color: #94a3b8;
}
.filters {
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}
.filter-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}
.filter-row:last-child {
  margin-bottom: 0;
}
.filter-title {
  font-size: 13px;
  color: #64748b;
  padding-top: 6px;
  white-space: nowrap;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 13px;
  cursor: pointer;
}
.chip.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
}
.chip:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.chip[data-kind='danger'].active {
  background: #ef4444;
  border-color: #ef4444;
}
.chip[data-kind='ghost'] {
  background: transparent;
}
.filter-row--actions {
  border-top: 1px dashed #e2e8f0;
  padding-top: 10px;
}
.main {
  min-height: 200px;
}
.empty {
  text-align: center;
  color: #94a3b8;
  padding: 60px 0;
  font-size: 15px;
}
.progress-line {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #64748b;
  margin-bottom: 10px;
}
.progress-line__hint.ok {
  color: #16a34a;
}
.progress-line__hint.ng {
  color: #dc2626;
}
.nav {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}
.nav__btn {
  flex: 1;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  font-size: 15px;
  cursor: pointer;
  color: #475569;
}
.nav__btn.primary {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
}
.nav__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>