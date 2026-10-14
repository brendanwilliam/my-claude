# my-claude

Custom Claude Code features, installed one at a time. Each folder under `plugins/` is its own plugin, so you add only what you want.

```
/plugin marketplace add brendanwilliam/my-claude
```

| Plugin | What it does | Install |
| --- | --- | --- |
| [model-shortcut](plugins/model-shortcut) | `/m 23` sets the model and effort in one command | `/plugin install model-shortcut@my-claude` |
| [statusline](plugins/statusline) | `/statusline` turns on a multi-line status line with context, usage and cost | `/plugin install statusline@my-claude` |

Needs Claude Code 2.1.275 or later.

## Adding a plugin

1. Create `plugins/<name>/` with `.claude-plugin/plugin.json` and its hooks.
2. Add an entry to `.claude-plugin/marketplace.json` with `"source": "./plugins/<name>"`.
3. Check it: `claude plugin validate . --strict` from the root, then `claude plugin validate` and `claude plugin test` in the plugin folder.

## License

MIT
