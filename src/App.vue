<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Question, QuestionBank, QuestionType } from './types'
import {
  allBanks,
  availableChapters,
  availableTypes,
  bankById,
  chapterList,
  filterQuestions,
  firstUnansweredIndex,
  nextUnansweredIndex,
  typeLabel,
} from './lib/questions'
import {
  loadBankId,
  loadProgress,
  loadTheme,
  resetProgress,
  saveAnswer,
  saveBankId,
  saveTheme,
  wrongIds,
  type ProgressRecord,
  type ThemeName,
} from './lib/progress'
import QuestionCard from './components/QuestionCard.vue'

/** 答对后自动跳到下一未答题的延迟（ms），用于短暂展示判分反馈 */
const ADVANCE_DELAY = 700

// ---------- 题库选择 ----------
const banks = allBanks()
const bankIdRef = ref(loadBankId(banks.map((b) => b.id)))
const currentBank = computed<QuestionBank>(() => bankById(bankIdRef.value))
const bankQuestions = computed<Question[]>(() => currentBank.value.questions)

function switchBank(id: string): void {
  bankIdRef.value = id
  saveBankId(id)
}

// ---------- 主题（暗色模式） ----------
const theme = ref<ThemeName>(loadTheme())
watch(
  theme,
  (t) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', t)
    }
    saveTheme(t)
  },
  { immediate: true },
)
function toggleTheme(): void {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

// ---------- 筛选 ----------
const selectedType = ref<QuestionType | 'all'>('all')
const selectedChapter = ref<string>('all')
const wrongMode = ref(false)
const viewMode = ref(false)

function toggleView(): void {
  viewMode.value = !viewMode.value
  if (viewMode.value) wrongMode.value = false
}
function toggleWrong(): void {
  wrongMode.value = !wrongMode.value
  if (wrongMode.value) viewMode.value = false
}

/** 当前题库实际有的题型（保留 all + 真实存在的） */
const typeOptions = computed<Array<QuestionType | 'all'>>(() => {
  return ['all', ...availableTypes(currentBank.value)]
})
/** 切换题库或题型时，若当前选择无效则回退全部 */
watch([currentBank, typeOptions], () => {
  const valid = typeOptions.value.includes(selectedType.value)
  if (!valid) selectedType.value = 'all'
  const chs = chapterList(currentBank.value.questions)
  if (!chs.includes(selectedChapter.value)) selectedChapter.value = 'all'
})
/** 是否展示章节筛选（只有 1 个章节不展示） */
const showChapterRow = computed(() => availableChapters(currentBank.value).length > 1)

const chapters = computed(() => chapterList(bankQuestions.value))

const basePool = computed<Question[]>(() => {
  if (wrongMode.value) {
    const wrong = new Set(wrongIds(progress.value))
    return bankQuestions.value.filter((q) => wrong.has(q.id))
  }
  const types = selectedType.value === 'all' ? [] : [selectedType.value]
  const chs = selectedChapter.value === 'all' ? [] : [selectedChapter.value]
  return filterQuestions(bankQuestions.value, types, chs)
})

// ---------- 进度 ----------
const progress = ref<ProgressRecord>(loadProgress())
const answeredIds = computed(() => new Set(Object.keys(progress.value)))

function onSubmit(payload: { questionId: string; input: string | number | boolean; correct: boolean }): void {
  progress.value = saveAnswer(payload.questionId, payload.correct)
  if (payload.correct && !wrongMode.value && !viewMode.value) scheduleAdvance()
}
function onResetProgress(): void {
  resetProgress()
  progress.value = {}
  // 清空进度后错题本里没有题目，退出错题本模式并回到第一题
  wrongMode.value = false
  currentIndex.value = 0
}

let advanceTimer: number | undefined
function scheduleAdvance(): void {
  if (advanceTimer !== undefined) window.clearTimeout(advanceTimer)
  advanceTimer = window.setTimeout(() => {
    advanceTimer = undefined
    const idx = nextUnansweredIndex(basePool.value, answeredIds.value, currentIndex.value)
    if (idx > -1) currentIndex.value = idx
  }, ADVANCE_DELAY)
}
onBeforeUnmount(() => {
  if (advanceTimer !== undefined) window.clearTimeout(advanceTimer)
})

// ---------- 当前题目导航 ----------
const currentIndex = ref(
  viewMode.value ? 0 : firstUnansweredIndex(basePool.value, answeredIds.value),
)
watch([basePool, viewMode, bankIdRef], () => {
  currentIndex.value = viewMode.value
    ? 0
    : firstUnansweredIndex(basePool.value, answeredIds.value)
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
/** 重置到当前筛选的第一题 */
function resetToFirst(): void {
  currentIndex.value = 0
}

// ---------- 统计 ----------
/** 当前题库内的统计（不跨题库） */
const statAnswered = computed(() =>
  bankQuestions.value.filter((q) => answeredIds.value.has(q.id)).length,
)
const statCorrect = computed(() =>
  bankQuestions.value.filter((q) => progress.value[q.id] === true).length,
)
const statWrong = computed(() => statAnswered.value - statCorrect.value)
const statRate = computed(() =>
  statAnswered.value === 0 ? 0 : Math.round((statCorrect.value / statAnswered.value) * 100),
)
const statCounts = computed(() => currentBank.value.counts)
const headerSubtitle = computed(() => {
  const names = availableTypes(currentBank.value).map((t) => typeLabel(t)).join(' / ')
  return `共 ${currentBank.value.count} 题 · ${names}`
})

// 保证 mounted 时文档根已设置 data-theme（覆盖 SSR/未命中的场合）
onMounted(() => {
  document.documentElement.setAttribute('data-theme', theme.value)
})
</script>

<template>
  <div class="app">
    <header class="app__header">
      <div class="app__title-row">
        <h1 class="app__title">{{ currentBank.name }} · 刷题库</h1>
        <button class="theme-toggle" :title="theme === 'dark' ? '切换到亮色' : '切换到暗色'" @click="toggleTheme">
          {{ theme === 'dark' ? '☀ 亮色' : '🌙 暗色' }}
        </button>
      </div>
      <p class="app__subtitle">{{ headerSubtitle }}</p>
    </header>

    <!-- 题库切换 -->
    <section class="banks">
      <button
        v-for="b in banks"
        :key="b.id"
        class="chip bank-chip"
        :class="{ active: currentBank.id === b.id }"
        @click="switchBank(b.id)"
      >
        <span class="bank-chip__name">{{ b.name }}</span>
        <span class="bank-chip__count">{{ b.count }}题</span>
      </button>
    </section>

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
            <span v-if="t !== 'all'" class="chip__badge">{{ statCounts[t] ?? 0 }}</span>
          </button>
        </div>
      </div>
      <div v-if="showChapterRow" class="filter-row">
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
          :class="{ active: viewMode }"
          data-kind="primary"
          @click="toggleView"
        >
          👁 看题（{{ basePool.length }}）
        </button>
        <button
          class="chip"
          :class="{ active: wrongMode }"
          data-kind="danger"
          @click="toggleWrong"
        >
          ★ 错题本（{{ statWrong }}）
        </button>
        <button class="chip" data-kind="ghost" @click="resetToFirst">↺ 回到第1题</button>
        <button class="chip" data-kind="ghost" @click="onResetProgress">重置进度</button>
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
          <span v-if="!viewMode && currentProgress !== null" class="progress-line__hint">
            {{ currentProgress ? '已答对' : '已答错' }}
          </span>
        </div>
        <QuestionCard
          :key="currentQuestion.id"
          :question="currentQuestion"
          :view-only="viewMode"
          @submit="onSubmit"
        />
        <div class="nav">
          <button class="nav__btn" :disabled="currentIndex === 0" @click="prev">上一题</button>
          <button class="nav__btn primary" @click="resetToFirst">回到第1题</button>
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
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 16px 48px;
}
.app__header {
  text-align: center;
  margin-bottom: 16px;
}
.app__title-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.app__title {
  font-size: 22px;
  color: var(--text);
  margin: 0;
}
.theme-toggle {
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-muted);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 13px;
  cursor: pointer;
}
.app__subtitle {
  font-size: 13px;
  color: var(--text-soft);
  margin: 4px 0 0;
}

/* 题库切换 */
.banks {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 14px;
}
.bank-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px !important;
  font-size: 14px !important;
}
.bank-chip__count {
  font-size: 12px;
  opacity: 0.8;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}
.stat {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 12px 8px;
  text-align: center;
  box-shadow: var(--shadow-card);
}
.stat__num {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
}
.stat__num.ok {
  color: #16a34a;
}
.stat__num.ng {
  color: #dc2626;
}
.stat__label {
  font-size: 12px;
  color: var(--text-soft);
}
.filters {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-card);
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
  color: var(--text-soft);
  padding-top: 6px;
  white-space: nowrap;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  border: 1px solid var(--border);
  background: var(--bg-chip);
  color: var(--text-muted);
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.chip__badge {
  margin-left: 4px;
  font-size: 11px;
  opacity: 0.7;
}
.chip.active {
  background: var(--bg-chip-active);
  border-color: var(--bg-chip-active);
  color: var(--text-chip-active);
}
.chip:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.chip[data-kind='primary'].active {
  background: var(--bg-primary-active);
  border-color: var(--bg-primary-active);
}
.chip[data-kind='danger'].active {
  background: var(--bg-danger-active);
  border-color: var(--bg-danger-active);
}
.chip[data-kind='ghost'] {
  background: transparent;
}
.filter-row--actions {
  border-top: 1px dashed var(--border-dashed);
  padding-top: 10px;
}
.main {
  min-height: 200px;
}
.empty {
  text-align: center;
  color: var(--text-soft);
  padding: 60px 0;
  font-size: 15px;
}
.progress-line {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-soft);
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
  border: 1px solid var(--nav-btn-border);
  border-radius: 10px;
  background: var(--nav-btn-bg);
  font-size: 15px;
  cursor: pointer;
  color: var(--nav-btn-text);
}
.nav__btn.primary {
  background: var(--nav-btn-primary-bg);
  border-color: var(--nav-btn-primary-bg);
  color: var(--nav-btn-primary-text);
}
.nav__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 520px) {
  .app__title {
    font-size: 18px;
  }
  .stats {
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
  .stat {
    padding: 10px 4px;
  }
  .stat__num {
    font-size: 17px;
  }
  .nav {
    gap: 6px;
  }
  .nav__btn {
    padding: 10px 6px;
    font-size: 13px;
  }
}
</style>
