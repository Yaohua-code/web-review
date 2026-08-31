import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { Question } from '../types'
import QuestionCard from './QuestionCard.vue'

type Payload = { questionId: string; input: number | boolean | string; correct: boolean }

function toPayload(wrapper: ReturnType<typeof mount>): Payload {
  const emitted = wrapper.emitted('submit')!
  return emitted[emitted.length - 1][0] as Payload
}

describe('QuestionCard 即时判分', () => {
  const singleQuestion: Question = {
    id: 't:1',
    type: 'single',
    chapter: 'SpringBoot',
    question: '题干',
    options: ['A1', 'B2', 'C3', 'D4'],
    answer: 2, // C
  }
  const blankQuestion: Question = {
    id: 't:2',
    type: 'blank',
    chapter: 'SpringBoot',
    question: '题干',
    answer: 'tomcat',
  }
  const judgeQuestion: Question = {
    id: 't:3',
    type: 'judge',
    chapter: 'SpringBoot',
    question: '题干',
    answer: true,
  }

  it('单选点击选项即判分并 emit submit', async () => {
    const wrapper = mount(QuestionCard, { props: { question: singleQuestion } })
    await wrapper.findAll('.option')[2].trigger('click') // 选 C(index 2)，正确答案
    expect(toPayload(wrapper)).toMatchObject({ questionId: 't:1', input: 2, correct: true })
    // 只允许作答一次
    await wrapper.findAll('.option')[0].trigger('click')
    expect(wrapper.emitted('submit')).toHaveLength(1)
  })

  it('单选答错后显示正确答案', async () => {
    const wrapper = mount(QuestionCard, { props: { question: singleQuestion } })
    await wrapper.findAll('.option')[0].trigger('click') // 选 A，答错
    expect(toPayload(wrapper).correct).toBe(false)
    expect(wrapper.find('.feedback').text()).toContain('C3')
  })

  it('填空：输入后点击核对才判分', async () => {
    const wrapper = mount(QuestionCard, { props: { question: blankQuestion } })
    expect(wrapper.find('.feedback').exists()).toBe(false)
    const input = wrapper.find('input')
    await input.setValue('Tomcat')
    await wrapper.find('.btn').trigger('click')
    expect(toPayload(wrapper)).toMatchObject({ correct: true, input: 'Tomcat' })
    expect(wrapper.find('.feedback').text()).toContain('回答正确')
  })

  it('判断：点击对/错即判分', async () => {
    const wrapper = mount(QuestionCard, { props: { question: judgeQuestion } })
    await wrapper.findAll('.option')[0].trigger('click') // 对
    expect(toPayload(wrapper)).toMatchObject({ correct: true, input: true })
  })
})

describe('QuestionCard 看题模式（viewOnly）', () => {
  const singleQuestion: Question = {
    id: 't:10',
    type: 'single',
    chapter: 'Vue3 基础',
    question: '题干',
    options: ['A1', 'B2', 'C3', 'D4'],
    answer: 2, // C
  }
  const blankQuestion: Question = {
    id: 't:11',
    type: 'blank',
    chapter: 'Vue3 基础',
    question: '题干',
    answer: 'v-bind',
  }
  const judgeQuestion: Question = {
    id: 't:12',
    type: 'judge',
    chapter: 'Vue3 基础',
    question: '题干',
    answer: true,
  }

  it('看题模式直接展示正确答案，点击选项不判分不 emit', async () => {
    const wrapper = mount(QuestionCard, { props: { question: singleQuestion, viewOnly: true } })
    // 正确答案 C 高亮为 correct
    expect(wrapper.findAll('.option')[2].classes()).toContain('correct')
    // 点击任意选项不 emit
    await wrapper.findAll('.option')[0].trigger('click')
    expect(wrapper.emitted('submit')).toBeUndefined()
    // 反馈区直接展示正确答案 C3
    expect(wrapper.find('.feedback').text()).toContain('C3')
  })

  it('看题模式：填空直接展示答案，无输入框', async () => {
    const wrapper = mount(QuestionCard, { props: { question: blankQuestion, viewOnly: true } })
    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.find('.blank__answer').text()).toContain('v-bind')
  })

  it('看题模式：判断直接展示正确答案', async () => {
    const wrapper = mount(QuestionCard, { props: { question: judgeQuestion, viewOnly: true } })
    expect(wrapper.find('.options.judge .option').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.feedback').text()).toContain('对')
  })
})

describe('QuestionCard 简答题', () => {
  const shortQuestion: Question = {
    id: 't:20',
    type: 'short',
    chapter: 'Python 简答',
    question: '简述 Python 内存管理',
    answer: 'Python 采用基于值的内存管理方式。',
  }

  it('练习模式：显示文本框，点“查看参考答案”展示答案，再点可隐藏且不 emit submit', async () => {
    const wrapper = mount(QuestionCard, { props: { question: shortQuestion } })
    // 初始只有输入框与按钮，无反馈
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.find('.feedback').exists()).toBe(false)

    // 点“查看参考答案”→ 展示参考答案
    await wrapper.find('.btn').trigger('click')
    expect(wrapper.find('.feedback--short').text()).toContain('Python 采用基于值的内存管理方式。')
    expect(wrapper.find('.btn').text()).toContain('隐藏参考答案')

    // 再点一次 → 隐藏参考答案
    await wrapper.find('.btn').trigger('click')
    expect(wrapper.find('.feedback--short').exists()).toBe(false)
    expect(wrapper.find('.btn').text()).toContain('查看参考答案')

    // 简答不参与判分，不应触发 submit
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('看题模式：直接展示参考答案，无输入框', () => {
    const wrapper = mount(QuestionCard, { props: { question: shortQuestion, viewOnly: true } })
    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(wrapper.find('.blank__answer').text()).toContain('Python 采用基于值的内存管理方式。')
  })
})
