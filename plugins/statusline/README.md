# statusline

`/statusline` turns on a multi-line status line: model and effort, context window fill with tokens in and out, subscription usage limits (Pro and Max), and session cost. It wraps to the terminal width and refreshes every 5 seconds. It needs `jq`.

```
/statusline        set it up
/statusline off    remove the statusLine setting
```

Setup copies the script to `~/.claude/statusline.sh` (a different script already there is saved as `statusline.sh.bak`) and sets `statusLine` in `~/.claude/settings.json`, leaving every other setting as it was. It runs the script through `bash`, so the file needs no executable bit. Run it again after updating the plugin to pick up a new script.

## Install

```
/plugin marketplace add brendanwilliam/my-claude
/plugin install statusline@my-claude
```

## Develop

```
claude plugin validate .
claude plugin test .
```
