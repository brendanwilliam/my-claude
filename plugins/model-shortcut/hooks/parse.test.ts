import { test, expect } from 'claude-code/testing'

import { parse } from './parse'

test('a bare tier stays the alias, which is always the latest version', () => {
  expect(parse('sonnet')).toEqual({ model: 'sonnet' })
  expect(parse('2')).toEqual({ model: 'sonnet' })
  expect(parse('op')).toEqual({ model: 'opus' })
})

test('a full id passes through as typed', () => {
  expect(parse('claude-sonnet-4-5 3')).toEqual({ model: 'claude-sonnet-4-5', effort: 'high' })
  expect(parse('claude-opus-4-6[1m] xh')).toEqual({ model: 'claude-opus-4-6[1m]', effort: 'xhigh' })
})

test('a tier with a version expands to the full id', () => {
  expect(parse('sonnet-4-5')).toEqual({ model: 'claude-sonnet-4-5' })
  expect(parse('opus4.6 2')).toEqual({ model: 'claude-opus-4-6', effort: 'medium' })
  expect(parse('haiku-4 low')).toEqual({ model: 'claude-haiku-4', effort: 'low' })
  expect(parse('opus-4-6[1m]')).toEqual({ model: 'claude-opus-4-6[1m]' })
})

test('a version counts as the model, so a second model is an error', () => {
  expect(parse('sonnet-4-5 opus')).toHaveProperty('error')
  expect(parse('sonnet sonnet-4-5')).toHaveProperty('error')
  expect(parse('sonnet-x')).toHaveProperty('error')
})

test('two digits are model then effort, with or without a space', () => {
  expect(parse('11')).toEqual({ model: 'haiku', effort: 'low' })
  expect(parse('23')).toEqual({ model: 'sonnet', effort: 'high' })
  expect(parse('35')).toEqual({ model: 'opus', effort: 'max' })
  expect(parse('1 1')).toEqual({ model: 'haiku', effort: 'low' })
  expect(parse('2  3')).toEqual({ model: 'sonnet', effort: 'high' })
})

test('one digit is a model', () => {
  expect(parse('3')).toEqual({ model: 'opus' })
})

test('full names work, in either order', () => {
  expect(parse('opus high')).toEqual({ model: 'opus', effort: 'high' })
  expect(parse('max sonnet')).toEqual({ model: 'sonnet', effort: 'max' })
  expect(parse('max')).toEqual({ effort: 'max' })
})

test('unambiguous prefixes work', () => {
  expect(parse('op xh')).toEqual({ model: 'opus', effort: 'xhigh' })
  expect(parse('xh op')).toEqual({ model: 'opus', effort: 'xhigh' })
  expect(parse('so lo')).toEqual({ model: 'sonnet', effort: 'low' })
  expect(parse('ma')).toEqual({ effort: 'max' })
})

test('names and digits mix, digits filling the empty slot', () => {
  expect(parse('op 3')).toEqual({ model: 'opus', effort: 'high' })
  expect(parse('3 op')).toEqual({ model: 'opus', effort: 'high' })
  expect(parse('3 xh')).toEqual({ model: 'opus', effort: 'xhigh' })
  expect(parse('op 2 3')).toHaveProperty('error')
})

test('rejects ambiguous prefixes, out-of-range numbers, repeats and unknown words', () => {
  expect(parse('h')).toHaveProperty('error')
  expect(parse('m')).toHaveProperty('error')
  expect(parse('06')).toHaveProperty('error')
  expect(parse('53')).toHaveProperty('error')
  expect(parse('111')).toHaveProperty('error')
  expect(parse('so op')).toHaveProperty('error')
  expect(parse('low max')).toHaveProperty('error')
  expect(parse('fast')).toHaveProperty('error')
})
