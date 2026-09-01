import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App.vue'
import { resetProgress } from './lib/progress'

type Wrapper = ReturnType<typeof mount>

function progressLine(wrapper: Wrapper): string {
  return wrapper.find('.progress-line').text()
}

function btnByText(wrapper: Wrapper, selector: string, text: string): ReturnType<Wrapper['findAll']>[number] {
  const btn = wrapper.findAll(selector).find((b) => b.text().trim() === text)
  if (!btn) throw new Error(`未找到按钮：${text}`)
  return btn
}

beforeEach(() => {
  window.localStorage.clear()
  resetProgress()
})

describe('App 重置进度', () => {
  it('重置进度后回到第一题', async () => {
    const wrapper = mount(App)
    // 初始在第 1 题
    expect(progressLine(wrapper)).toContain('第 1 / 358 题')

    // 点两次“下一题”到第 3 题
    const next = () => btnByText(wrapper, '.nav__btn', '下一题')
    await next().trigger('click')
    await next().trigger('click')
    expect(progressLine(wrapper)).toContain('第 3 / 358 题')

    // 点“重置进度”后回到第 1 题
    await btnByText(wrapper, '.chip', '重置进度').trigger('click')
    expect(progressLine(wrapper)).toContain('第 1 / 358 题')
  })

  it('重置进度时若在错题本模式，退出错题本并回到第一题', async () => {
    const wrapper = mount(App)
    // 无错题时进入错题本显示空态
    await btnByText(wrapper, '.chip', '★ 错题本（0）').trigger('click')
    expect(wrapper.find('.empty').exists()).toBe(true)

    await btnByText(wrapper, '.chip', '重置进度').trigger('click')
    expect(wrapper.find('.empty').exists()).toBe(false)
    expect(progressLine(wrapper)).toContain('第 1 / 358 题')
  })
})

describe('App 选题面板', () => {
  it('点击选题按钮弹出面板，选择题号跳转并关闭面板', async () => {
    const wrapper = mount(App)
    expect(progressLine(wrapper)).toContain('第 1 / 358 题')

    // 打开选题面板
    await btnByText(wrapper, '.nav__btn', '📖 选题').trigger('click')
    const grid = wrapper.find('.picker__grid')
    expect(grid.exists()).toBe(true)
    // 面板渲染了全部题号按钮
    expect(grid.findAll('.picker__item').length).toBe(358)

    // 点击第 8 题
    await grid.findAll('.picker__item')[7].trigger('click')
    expect(progressLine(wrapper)).toContain('第 8 / 358 题')
    // 跳转后面板关闭
    expect(wrapper.find('.picker').exists()).toBe(false)
  })

  it('当前题号在选题面板中高亮', async () => {
    const wrapper = mount(App)
    // 先跳到第 3 题
    const next = () => btnByText(wrapper, '.nav__btn', '下一题')
    await next().trigger('click')
    await next().trigger('click')
    expect(progressLine(wrapper)).toContain('第 3 / 358 题')

    await btnByText(wrapper, '.nav__btn', '📖 选题').trigger('click')
    const items = wrapper.findAll('.picker__item')
    expect(items[2].classes()).toContain('current')
  })
})
