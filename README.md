# model-shortcut

`/m` is a keyboard shortcut for `/model` followed by `/effort`. It runs those two commands for you and keeps no state of its own, so the status line, `/model` and `/effort` all behave as if you had typed them.

```
/m 23                  /model sonnet, /effort high
/m op xh               /model opus, /effort xhigh
/m 1 1                 /model haiku, /effort low
/m op 3                /model opus, /effort high
/m sonnet-4-5 2        /model claude-sonnet-4-5, /effort medium
/m claude-opus-4-6 3   /model claude-opus-4-6, /effort high
/m reset               /model default, /effort auto
/m                     show the current model
```

Models are numbered 1-3 (haiku, sonnet, opus). Efforts are numbered 1-5 (low, medium, high, xhigh, max). Names work in full or as any prefix that matches only one name. Digits and names can be mixed in any order.

A bare model name is passed to `/model` as the alias (`sonnet`, `opus`, `haiku`), which Claude Code resolves to the latest version of that tier. To use an older version, give a full id (`claude-sonnet-4-5`) or a tier with a version (`sonnet-4-5`, `opus4.6`), which expands to the full id. Like `/model`, `/m` saves the model as your default for new sessions.

## Install

```
/plugin install model-shortcut --marketplace brendanwilliam/model-shortcut
```

Answer `y` to add the marketplace, then choose a scope. Needs Claude Code 2.1.275 or later.

## Develop

```
claude plugin validate .
claude plugin test .
```
