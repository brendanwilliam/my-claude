import { test, expect, mock } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

// What `/m` types for the person: each `/model` or `/effort` it runs, in order,
// and each toast it raises. The test's hooks stand beneath the plugin, in place
// of the engine, so they see exactly what the plugin asked for.
function watch(on: On) {
  const clock = mock.clock(on)
  const ran: string[] = []
  const toasts: string[] = []

  on('command.run', { command: 'model' }, async (_$, e) => {
    ran.push(`model ${e.args}`)
    return {}
  })
  on('command.run', { command: 'effort' }, async (_$, e) => {
    ran.push(`effort ${e.args}`)
    return {}
  })
  on('ui.toast', async (_$, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })

  return { clock, ran, toasts }
}

const m = ($: Engine, args: string) => $.command.run({ command: 'm', args })

test('session start registers the m command', async ($, on) => {
  const registered: string[] = []
  on('command.register', async (_$, e) => {
    registered.push(e.name)
    return { value: { command: e.name } }
  })
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  expect(registered).toEqual(['m'])
})

test('/m with no args shows the model and runs nothing', async ($, on) => {
  const { clock, ran } = watch(on)
  on('session.model', async () => ({ value: 'claude-sonnet-5-5' }))

  const result = await m($, '')
  await clock.advance(100)

  expect(result.text).toContain('claude-sonnet-5-5')
  expect(ran).toEqual([])
})

test('/m 23 runs /model sonnet then /effort high after the timer', async ($, on) => {
  const { clock, ran } = watch(on)

  const result = await m($, '23')
  expect(result.text).toBe('/model sonnet then /effort high')
  expect(ran).toEqual([])

  await clock.advance(50)
  expect(ran).toEqual(['model sonnet', 'effort high'])
})

test('/m with only an effort runs just /effort', async ($, on) => {
  const { clock, ran } = watch(on)

  const result = await m($, 'max')
  expect(result.text).toBe('/effort max')

  await clock.advance(50)
  expect(ran).toEqual(['effort max'])
})

test('/m reset runs /model default then /effort auto', async ($, on) => {
  const { clock, ran } = watch(on)

  for (const word of ['reset', 'off', 'default']) {
    ran.length = 0
    const result = await m($, word)
    expect(result.text).toBe('/model default then /effort auto')

    await clock.advance(50)
    expect(ran).toEqual(['model default', 'effort auto'])
  }
})

test('bad input answers with the error and runs nothing', async ($, on) => {
  const { clock, ran } = watch(on)

  const result = await m($, 'fast')
  await clock.advance(100)

  expect(result.text).toContain('"fast" is not a model or effort')
  expect(ran).toEqual([])
})

test('a failing /model raises a toast and skips /effort', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  const ran: string[] = []

  on('command.run', { command: 'model' }, async () => {
    throw new Error('no such model')
  })
  on('command.run', { command: 'effort' }, async (_$, e) => {
    ran.push(e.args)
    return {}
  })
  on('ui.toast', async (_$, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })

  await m($, '23')
  await clock.advance(50)

  expect(toasts).toHaveLength(1)
  expect(toasts[0]).toContain('/m failed:')
  expect(ran).toEqual([])
})
