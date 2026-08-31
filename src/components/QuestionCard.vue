<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AnswerInput, Question } from '../types'
import { checkAnswer, correctIndexLabel, correctText, typeLabel } from '../lib/questions'

const props = defineProps<{ question: Question; viewOnly?: boolean }>()
const emit = defineEmits<{
  (e: 'submit', payload: { questionId: string; input: AnswerInput; correct: boolean }): void
}>()

/** 看题模式：只读展示题干与正确答案，不参与判分 */
const viewOnly = computed(() => props.viewOnly === true)

/** 单选：当前选中下标；判断：true/false；填空：输入文本；简答：文本框+是否已看参考答案 */
const selected = ref<number | null>(null)
const judgeValue = ref<boolean | null>(null)
const blankInput = ref('')
const shortInput = ref('')
const shortRevealed = ref(false)
// 是否已核对（填空需要点击按钮核对）
const revealed = ref(false)
// 填空已提交的一次结果
const blankResult = ref<boolean | null>(null)

// 切换题目后重置本地作答状态
watch(
  () => props.question.id,
  () => {
    selected.value = null
    judgeValue.value = null
    blankInput.value = ''
    shortInput.value = ''
    shortRevealed.value = false
    revealed.value = false
    blankResult.value = null
  },
  { immediate: true },
)

const isSingle = computed(() => props.question.type === 'single')
const isJudge = computed(() => props.question.type === 'judge')
const isBlank = computed(() => props.question.type === 'blank')
const isShort = computed(() => props.question.type === 'short')

// 类型安全的属性访问，供模板使用
const singleOptions = computed(() =>
  props.question.type === 'single' ? props.question.options : [],
)
const correctOptionIndex = computed(() =>
  props.question.type === 'single' ? props.question.answer : -1,
)
const judgeCorrect = computed(() => (props.question.type === 'judge' ? props.question.answer : false))

// 单选/判断即时判分后的正确性
const immediateCorrect = computed(() => {
  const q = props.question
  if (q.type === 'single' && selected.value !== null) {
    return checkAnswer(q, selected.value)
  }
  if (q.type === 'judge' && judgeValue.value !== null) {
    return checkAnswer(q, judgeValue.value)
  }
  return null
})

const hasAnswered = computed(() =>
  isBlank.value ? revealed.value : isShort.value ? shortRevealed.value : immediateCorrect.value !== null,
)
const isCorrect = computed(() =>
  isBlank.value ? blankResult.value : isShort.value ? null : immediateCorrect.value,
)
const correctAnswer = computed(() => correctText(props.question))
const indexLabel = computed(() => correctIndexLabel(props.question))

function pickSingle(index: number): void {
  if (selected.value !== null) return
  selected.value = index
  emit('submit', {
    questionId: props.question.id,
    input: index,
    correct: checkAnswer(props.question, index),
  })
}

function pickJudge(value: boolean): void {
  if (judgeValue.value !== null) return
  judgeValue.value = value
  emit('submit', {
    questionId: props.question.id,
    input: value,
    correct: checkAnswer(props.question, value),
  })
}

function submitBlank(): void {
  if (revealed.value) return
  const correct = checkAnswer(props.question, blankInput.value)
  blankResult.value = correct
  revealed.value = true
  emit('submit', { questionId: props.question.id, input: blankInput.value, correct })
}
</script>

<template>
  <div class="card">
    <div class="card__head">
      <span class="badge" :data-type="question.type">{{ typeLabel(question.type) }}</span>
      <span class="chapter">{{ question.chapter }}</span>
    </div>

    <p class="question">{{ question.question }}</p>

    <!-- 单选 -->
    <div v-if="isSingle" class="options">
      <button
        v-for="(opt, i) in singleOptions"
        :key="i"
        class="option"
        :class="{
          selected: !viewOnly && selected === i,
          correct: viewOnly ? i === correctOptionIndex : selected !== null && i === correctOptionIndex,
          wrong: !viewOnly && selected === i && i !== correctOptionIndex,
        }"
        :disabled="viewOnly || selected !== null"
        @click="pickSingle(i)"
      >
        <span class="option__label">{{ String.fromCharCode(65 + i) }}</span>
        <span>{{ opt }}</span>
      </button>
    </div>

    <!-- 判断 -->
    <div v-if="isJudge" class="options judge">
      <button
        class="option"
        :class="{
          selected: !viewOnly && judgeValue === true,
          correct: viewOnly ? judgeCorrect === true : judgeValue !== null && judgeCorrect === true,
          wrong: !viewOnly && judgeValue === true && judgeCorrect !== true,
        }"
        :disabled="viewOnly || judgeValue !== null"
        @click="pickJudge(true)"
      >
        <span class="option__label">✓</span><span>对</span>
      </button>
      <button
        class="option"
        :class="{
          selected: !viewOnly && judgeValue === false,
          correct: viewOnly ? judgeCorrect === false : judgeValue !== null && judgeCorrect === false,
          wrong: !viewOnly && judgeValue === false && judgeCorrect !== false,
        }"
        :disabled="viewOnly || judgeValue !== null"
        @click="pickJudge(false)"
      >
        <span class="option__label">✗</span><span>错</span>
      </button>
    </div>

    <!-- 填空 -->
    <div v-if="isBlank" class="blank">
      <div v-if="viewOnly" class="blank__answer">
        <span class="blank__answer-label">答案：</span
        ><span class="blank__answer-text">{{ correctAnswer }}</span>
      </div>
      <div v-else class="blank__row">
        <input
          v-model="blankInput"
          class="blank__input"
          placeholder="请输入答案"
          :disabled="revealed"
          @keyup.enter="submitBlank"
        />
        <button class="btn" :disabled="revealed" @click="submitBlank">核对</button>
      </div>
    </div>

    <!-- 简答 -->
    <div v-if="isShort" class="short">
      <div v-if="viewOnly" class="blank__answer">
        <span class="blank__answer-label">参考答案：</span
        ><span class="blank__answer-text">{{ correctAnswer }}</span>
      </div>
      <div v-else class="short__row">
        <textarea
          v-model="shortInput"
          class="short__input"
          placeholder="先在脑中/纸上作答，完成后点击下方查看参考答案"
          rows="4"
        ></textarea>
        <button class="btn" @click="shortRevealed = !shortRevealed">
          {{ shortRevealed ? '隐藏参考答案' : '查看参考答案' }}
        </button>
      </div>
    </div>

    <!-- 简答：参考答案反馈（中性，不判对错） -->
    <div v-if="isShort && (shortRevealed || viewOnly)" class="feedback feedback--short">
      <span class="feedback__icon">参考答案：</span>
      <div class="feedback__answer short__answer-text">{{ correctAnswer }}</div>
    </div>

    <!-- 判分 / 答案反馈 -->
    <div
      v-if="!isShort && (hasAnswered || viewOnly)"
      class="feedback"
      :data-correct="viewOnly ? true : isCorrect"
    >
      <template v-if="viewOnly">
        <span>正确答案<template v-if="indexLabel">（{{ indexLabel }}）</template>：</span>
        <span class="feedback__answer">{{ correctAnswer }}</span>
      </template>
      <template v-else>
        <span v-if="isCorrect" class="feedback__icon">✓ 回答正确</span>
        <span v-else class="feedback__icon">
          ✗ 回答错误，正确答案<template v-if="indexLabel">（{{ indexLabel }}）</template>：
        </span>
        <span v-if="!isCorrect" class="feedback__answer">{{ correctAnswer }}</span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--bg-card);
  border-radius: 14px;
  padding: 20px;
  box-shadow: var(--shadow-card);
}
.card__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 6px;
  color: #fff;
}
.badge[data-type='single'] {
  background: #3b82f6;
}
.badge[data-type='blank'] {
  background: #8b5cf6;
}
.badge[data-type='judge'] {
  background: #f59e0b;
}
.badge[data-type='short'] {
  background: #0d9488;
}
.chapter {
  font-size: 12px;
  color: var(--text-soft);
}
.question {
  font-size: 17px;
  line-height: 1.7;
  color: var(--text);
  margin-bottom: 16px;
  white-space: pre-wrap;
}
.options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--option-border);
  border-radius: 10px;
  background: var(--option-bg);
  font-size: 15px;
  color: var(--option-text);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}
.option:hover:not(:disabled) {
  border-color: var(--option-selected-border);
}
.option__label {
  font-weight: 600;
  color: var(--text-soft);
  min-width: 18px;
}
.option.selected {
  border-color: var(--option-selected-border);
  background: var(--option-selected-bg);
  color: var(--option-selected-text);
}
.option.correct {
  border-color: var(--option-correct-border);
  background: var(--option-correct-bg);
  color: var(--option-correct-text);
}
.option.correct .option__label {
  color: inherit;
  filter: brightness(0.95);
}
.option.wrong {
  border-color: var(--option-wrong-border);
  background: var(--option-wrong-bg);
  color: var(--option-wrong-text);
}
.option.wrong .option__label {
  color: inherit;
}
.judge {
  flex-direction: row;
}
.judge .option {
  flex: 1;
  justify-content: center;
}
.blank__row {
  display: flex;
  gap: 10px;
}
.blank__answer {
  padding: 12px 14px;
  border: 1px solid var(--blank-answer-border);
  border-radius: 10px;
  background: var(--blank-answer-bg);
  font-size: 15px;
  color: var(--blank-answer-text);
}
.blank__answer-label {
  color: var(--text-soft);
}
.blank__answer-text {
  font-weight: 600;
}
.blank__input {
  flex: 1;
  padding: 12px 14px;
  border: 1px solid var(--input-border);
  border-radius: 10px;
  font-size: 15px;
  background: var(--input-bg);
  color: var(--input-text);
}
.blank__input:focus {
  outline: none;
  border-color: #3b82f6;
}
/* 简答 */
.short__row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.short__input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--input-border);
  border-radius: 10px;
  font-size: 15px;
  line-height: 1.6;
  background: var(--input-bg);
  color: var(--input-text);
  resize: vertical;
  font-family: inherit;
}
.short__input:focus {
  outline: none;
  border-color: #3b82f6;
}
.feedback--short {
  background: var(--option-selected-bg);
  border-color: var(--option-selected-border);
  color: var(--option-selected-text);
}
.short__answer-text {
  margin-top: 4px;
  white-space: pre-wrap;
  line-height: 1.7;
}
.btn {
  padding: 0 18px;
  border: none;
  border-radius: 10px;
  background: #3b82f6;
  color: #fff;
  font-size: 15px;
  cursor: pointer;
}
.btn:disabled {
  background: #64748b;
  cursor: not-allowed;
}
.feedback {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid transparent;
  font-size: 15px;
}
.feedback[data-correct='true'] {
  background: var(--feedback-correct-bg);
  border-color: var(--feedback-correct-border);
  color: var(--feedback-correct-text);
}
.feedback[data-correct='false'] {
  background: var(--feedback-wrong-bg);
  border-color: var(--feedback-wrong-border);
  color: var(--feedback-wrong-text);
}
.feedback__answer {
  font-weight: 600;
}
</style>