export const MODELS = ['haiku', 'sonnet', 'opus'] as const
export const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const

export type Model = (typeof MODELS)[number]
export type Effort = (typeof EFFORTS)[number]
// `model` is what `/model` takes: a bare tier (`sonnet`, always the latest) or an
// explicit older version (`claude-sonnet-4-5`).
export type Choice = { model?: string; effort?: Effort }

type Name = { kind: 'model'; value: Model } | { kind: 'effort'; value: Effort }

const NAMES: Name[] = [
  ...MODELS.map(value => ({ kind: 'model' as const, value })),
  ...EFFORTS.map(value => ({ kind: 'effort' as const, value })),
]

// A full name, or a prefix that only one name starts with (`op`, `xh`, `ma`).
function fromWord(word: string): Name | { error: string } {
  const exact = NAMES.find(name => name.value === word)
  if (exact) return exact

  const hits = NAMES.filter(name => name.value.startsWith(word))
  if (hits.length === 1) return hits[0]
  if (hits.length === 0) return { error: `"${word}" is not a model or effort` }
  return { error: `"${word}" could be ${hits.map(hit => hit.value).join(' or ')}` }
}

// An older model: a full id (`claude-sonnet-4-5`) as typed, or a tier with a
// version (`sonnet-4-5`, `opus4.6`) expanded to the full id.
function explicitModel(word: string): string | undefined {
  if (word.startsWith('claude-')) return word

  const match = /^(haiku|sonnet|opus)-?(\d+)(?:[-.](\d+))?(\[1m\])?$/.exec(word)
  if (!match) return undefined

  const [, tier, major, minor, window = ''] = match
  return `claude-${tier}-${major}${minor === undefined ? '' : `-${minor}`}${window}`
}

// `/m` arguments in any mix of names, prefixes and digits. Digits fill the slots
// the names left empty, model first: `11`, `1 1`, `op 3` and `3 op` all work.
export function parse(args: string): Choice | { error: string } {
  const choice: Choice = {}
  const digits: number[] = []

  for (const word of args.trim().toLowerCase().split(/\s+/).filter(Boolean)) {
    if (/^\d+$/.test(word)) {
      digits.push(...word.split('').map(Number))
      continue
    }

    const older = explicitModel(word)
    if (older !== undefined) {
      if (choice.model) return { error: `two models given: ${choice.model} and ${older}` }
      choice.model = older
      continue
    }

    const name = fromWord(word)
    if ('error' in name) return name
    if (name.kind === 'model') {
      if (choice.model) return { error: `two models given: ${choice.model} and ${name.value}` }
      choice.model = name.value
    } else {
      if (choice.effort) return { error: `two efforts given: ${choice.effort} and ${name.value}` }
      choice.effort = name.value
    }
  }

  for (const digit of digits) {
    if (choice.model === undefined) {
      const model = MODELS[digit - 1]
      if (!model) return { error: `${digit} is not a model (1-3)` }
      choice.model = model
    } else if (choice.effort === undefined) {
      const effort = EFFORTS[digit - 1]
      if (!effort) return { error: `${digit} is not an effort (1-5)` }
      choice.effort = effort
    } else {
      return { error: `too many values: model and effort are already set` }
    }
  }

  return choice
}
