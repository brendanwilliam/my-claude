import type { Register } from 'claude-code'

// The status line command runs the script through bash, so the script needs no
// executable bit: `$.fs.write` writes text and cannot set one.
const STATUS_LINE = {
  type: 'command',
  command: 'bash ~/.claude/statusline.sh',
  padding: 0,
  refreshInterval: 5,
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'statusline',
      description: 'Turn the status line on or off',
      argumentHint: '[on | off]',
    })

    return next(e)
  })

  // The script is copied to a stable path under ~/.claude, since the plugin's own
  // folder changes with each version and a settings entry pointing into it would
  // break. The settings file is merged, never replaced: only `statusLine` changes.
  on('command.run', { command: 'statusline' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg !== '' && arg !== 'on' && arg !== 'off') return { text: '/statusline takes on or off' }

    try {
      const home = await $.env.get('HOME')
      if (!home) return { text: 'HOME is not set, so ~/.claude cannot be found' }

      const scriptPath = `${home}/.claude/statusline.sh`
      const settingsPath = `${home}/.claude/settings.json`
      const settings = (await $.fs.exists(settingsPath)) ? JSON.parse(await $.fs.read(settingsPath)) : {}

      if (arg === 'off') {
        if (!('statusLine' in settings)) return { text: 'The status line was already off.' }

        delete settings.statusLine
        await $.fs.write(settingsPath, `${JSON.stringify(settings, null, 2)}\n`)
        return { text: 'Status line turned off. The script stays at ~/.claude/statusline.sh.' }
      }

      const shipped = await $.fs.read(`${$.plugin.root}/statusline.sh`)
      const notes: string[] = []

      const existing = (await $.fs.exists(scriptPath)) ? await $.fs.read(scriptPath) : undefined
      if (existing !== shipped) {
        if (existing !== undefined) {
          await $.fs.write(`${scriptPath}.bak`, existing)
          notes.push('Backed up your script to ~/.claude/statusline.sh.bak.')
        }
        await $.fs.write(scriptPath, shipped)
        notes.push('Wrote ~/.claude/statusline.sh.')
      }

      if (JSON.stringify(settings.statusLine) !== JSON.stringify(STATUS_LINE)) {
        await $.fs.write(settingsPath, `${JSON.stringify({ ...settings, statusLine: STATUS_LINE }, null, 2)}\n`)
        notes.push('Set statusLine in ~/.claude/settings.json.')
      }

      return { text: notes.length === 0 ? 'The status line was already set up.' : `${notes.join(' ')} It appears on the next refresh. It needs jq.` }
    } catch (error) {
      return { text: `/statusline failed: ${error instanceof Error ? error.message : String(error)}` }
    }
  })
}
