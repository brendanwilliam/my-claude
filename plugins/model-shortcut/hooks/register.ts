import type { Register } from 'claude-code'

import { parse } from './parse'

const RESET = ['reset', 'off', 'default']

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'm',
      description: 'Set model and effort',
      argumentHint: '<model: 1-3 | haiku/sonnet/opus> <effort: 1-5 | low/medium/high/xhigh/max>',
    })

    return next(e)
  })

  // `/m` only types `/model` and `/effort` for the person, model first because
  // effort is saved per model. `$.command.run` called inside this hook would wait
  // on the turn the hook holds, so the hook answers and a timer runs them after.
  on('command.run', { command: 'm' }, async ($, e) => {
    const args = e.args.trim()

    if (args === '') {
      return { text: `The model is ${await $.session.model()}. /m 23 runs /model sonnet and /effort high.` }
    }

    const choice: { model?: string; effort?: string } | { error: string } = RESET.includes(args.toLowerCase())
      ? { model: 'default', effort: 'auto' }
      : parse(args)
    if ('error' in choice) return { text: choice.error }

    const steps: [string, string][] = []
    if (choice.model !== undefined) steps.push(['model', choice.model])
    if (choice.effort !== undefined) steps.push(['effort', choice.effort])

    $.clock.after(50, async () => {
      try {
        for (const [command, args] of steps) await $.command.run({ command, args })
      } catch (error) {
        $.ui.toast(`/m failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    })

    return { text: steps.map(([command, args]) => `/${command} ${args}`).join(' then ') }
  })
}
