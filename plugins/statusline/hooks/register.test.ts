import { test, expect, mock } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const HOME = '/home/test'
const SCRIPT = `${HOME}/.claude/statusline.sh`
const SETTINGS = `${HOME}/.claude/settings.json`
const SHIPPED = '#!/bin/bash\n# shipped script\n'

const STATUS_LINE = { type: 'command', command: 'bash ~/.claude/statusline.sh', padding: 0, refreshInterval: 5 }

// A disk in memory beneath the plugin. The plugin's own statusline.sh, which
// lives outside HOME, reads as the shipped script.
function disk(on: On, files: Record<string, string> = {}) {
  const store = new Map(Object.entries(files))
  mock.env(on, { HOME })

  on('fs.exists', async (_$, e) => ({ value: store.has(e.path) }))
  on('fs.read', async (_$, e) => {
    if (store.has(e.path)) return { value: store.get(e.path)! }
    if (!e.path.startsWith(HOME) && e.path.endsWith('/statusline.sh')) return { value: SHIPPED }
    throw new Error(`no such file: ${e.path}`)
  })
  on('fs.write', async (_$, e) => {
    store.set(e.path, e.text)
    return { value: undefined }
  })

  return store
}

const run = ($: Engine, args = '') => $.command.run({ command: 'statusline', args })

test('session start registers the statusline command', async ($, on) => {
  const registered: string[] = []
  on('command.register', async (_$, e) => {
    registered.push(e.name)
    return { value: { command: e.name } }
  })
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  expect(registered).toEqual(['statusline'])
})

test('a fresh setup writes the script and the statusLine setting', async ($, on) => {
  const store = disk(on)

  const result = await run($)

  expect(store.get(SCRIPT)).toBe(SHIPPED)
  expect(JSON.parse(store.get(SETTINGS)!)).toEqual({ statusLine: STATUS_LINE })
  expect(store.has(`${SCRIPT}.bak`)).toBe(false)
  expect(result.text).toContain('Set statusLine')
})

test('setup merges into the settings and keeps every other key', async ($, on) => {
  const store = disk(on, { [SETTINGS]: JSON.stringify({ model: 'sonnet', enabledPlugins: { a: true } }) })

  await run($, 'on')

  expect(JSON.parse(store.get(SETTINGS)!)).toEqual({
    model: 'sonnet',
    enabledPlugins: { a: true },
    statusLine: STATUS_LINE,
  })
})

test('a different existing script is backed up before it is replaced', async ($, on) => {
  const store = disk(on, { [SCRIPT]: '#!/bin/bash\n# mine\n' })

  const result = await run($)

  expect(store.get(`${SCRIPT}.bak`)).toBe('#!/bin/bash\n# mine\n')
  expect(store.get(SCRIPT)).toBe(SHIPPED)
  expect(result.text).toContain('Backed up')
})

test('running setup again changes nothing', async ($, on) => {
  const store = disk(on, { [SCRIPT]: SHIPPED, [SETTINGS]: JSON.stringify({ statusLine: STATUS_LINE }) })
  const before = new Map(store)

  const result = await run($)

  expect(store).toEqual(before)
  expect(result.text).toBe('The status line was already set up.')
})

test('off removes statusLine and leaves the rest and the script', async ($, on) => {
  const store = disk(on, {
    [SCRIPT]: SHIPPED,
    [SETTINGS]: JSON.stringify({ model: 'sonnet', statusLine: STATUS_LINE }),
  })

  const result = await run($, 'off')

  expect(JSON.parse(store.get(SETTINGS)!)).toEqual({ model: 'sonnet' })
  expect(store.get(SCRIPT)).toBe(SHIPPED)
  expect(result.text).toContain('turned off')
})

test('off with no statusLine says so and writes nothing', async ($, on) => {
  const store = disk(on, { [SETTINGS]: JSON.stringify({ model: 'sonnet' }) })

  const result = await run($, 'off')

  expect(result.text).toBe('The status line was already off.')
  expect(JSON.parse(store.get(SETTINGS)!)).toEqual({ model: 'sonnet' })
})

test('unknown arguments are refused and write nothing', async ($, on) => {
  const store = disk(on)

  const result = await run($, 'bright')

  expect(result.text).toBe('/statusline takes on or off')
  expect(store.size).toBe(0)
})

test('a settings file that is not JSON is reported, not overwritten', async ($, on) => {
  const store = disk(on, { [SETTINGS]: '{ not json' })

  const result = await run($)

  expect(result.text).toContain('/statusline failed:')
  expect(store.get(SETTINGS)).toBe('{ not json')
  expect(store.has(SCRIPT)).toBe(false)
})
