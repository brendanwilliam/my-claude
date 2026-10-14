#!/bin/bash
# Claude Code status line: model and effort, context usage, usage limits, session cost.
# Claude Code sends session JSON on stdin; see https://code.claude.com/docs/en/statusline

input=$(cat)

model=$(echo "$input" | jq -r '.model.display_name // "?"')
effort=$(echo "$input" | jq -r '.effort.level // empty')
pct=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
in_tok=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
out_tok=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')
size=$(echo "$input" | jq -r '.context_window.context_window_size // 0')
cost=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')
five_h=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty' | cut -d. -f1)
seven_d=$(echo "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty' | cut -d. -f1)
# rate_limits is only sent for Pro and Max subscribers, so its presence marks a subscription session.
subscription=$(echo "$input" | jq -r 'if .rate_limits != null then "true" else "false" end')

# The context bar and percentage keep their threshold colors: green under 60%,
# yellow under 85%, red above.
if [ "$pct" -ge 85 ]; then color='\033[31m'
elif [ "$pct" -ge 60 ]; then color='\033[33m'
else color='\033[32m'
fi
reset='\033[0m'
dim='\033[2m'
divider="${dim}│${reset}"
model_color='\033[1;97m'  # bold bright white
effort_color='\033[95m'   # bright magenta
size_color='\033[90m'     # gray
in_color='\033[34m'       # blue
out_color='\033[35m'      # magenta
cost_color='\033[93m'     # bright yellow
five_h_color='\033[96m'   # bright cyan
seven_d_color='\033[94m'  # bright blue

# 10-character bar.
filled=$((pct / 10)); [ "$filled" -gt 10 ] && filled=10
bar=$(printf '%*s' "$filled" '' | tr ' ' '▓')$(printf '%*s' $((10 - filled)) '' | tr ' ' '░')

fmt() { awk -v n="$1" 'BEGIN { if (n >= 1000000) printf "%.1fM", n/1000000; else if (n >= 1000) printf "%.1fk", n/1000; else printf "%d", n }'; }

# Segment 1: current model and reasoning effort (effort only when the model supports it).
model_seg="${model_color}${model}${reset}"
[ -n "$effort" ] && model_seg="${model_seg} ${dim}effort${reset} ${effort_color}${effort}${reset}"

# Working directory shown on the first line, with the home directory shortened to ~.
cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // empty')
cwd_display="${cwd/#$HOME/~}"

# Segment 2: context window fill, plus tokens in and out.
context_seg="${dim}ctx${reset} ${color}${bar} ${pct}%${reset} ${dim}of${reset} ${size_color}$(fmt "$size")${reset}"
context_seg="${context_seg}  ${dim}in${reset} ${in_color}$(fmt "$in_tok")${reset}  ${dim}out${reset} ${out_color}$(fmt "$out_tok")${reset}"

# Segment 3: subscription usage limits (Pro/Max only; absent otherwise).
usage_seg=""
[ -n "$five_h" ] && usage_seg="${dim}5h${reset} ${five_h_color}${five_h}%${reset}"
[ -n "$seven_d" ] && usage_seg="${usage_seg:+${usage_seg} }${dim}7d${reset} ${seven_d_color}${seven_d}%${reset}"
[ -n "$usage_seg" ] && usage_seg="${dim}usage${reset} ${usage_seg}"

# Segment 4: session cost.
# Pro and Max plans include the usage, so the cost is an estimate; API-key sessions pay per token.
cost_label="cost"
[ "$subscription" = "true" ] && cost_label="est. cost"
cost_seg="${dim}${cost_label}${reset} ${cost_color}\$$(printf '%.2f' "$cost")${reset}"

# Wrap: segments go on one line while they fit the terminal width, then continue on the next line.
# Width comes from COLUMNS or the controlling terminal; the ANSI color codes are not counted.
strip_ansi() { printf '%b' "$1" | sed $'s/\x1b\\[[0-9;]*m//g'; }
visible_len() { strip_ansi "$1" | wc -m | tr -d ' '; }
tty_cols=$({ stty size </dev/tty; } 2>/dev/null | awk '{print $2}')
cols=${COLUMNS:-${tty_cols:-120}}
# Keep a small margin so a line never reaches the last column, where the TUI would truncate it.
cols=$((cols - 4))

segs=("$context_seg")
[ -n "$usage_seg" ] && segs+=("$usage_seg")
segs+=("$cost_seg")

sep_len=5  # two spaces, divider, two spaces
# The first line holds the model, effort, and working directory; the wrapped segments start on the line below.
out="[${model_seg}]  ${divider}  ${dim}${cwd_display}${reset}\n"
cur="${segs[0]}"
for seg in "${segs[@]:1}"; do
  if [ $(( $(visible_len "$cur") + sep_len + $(visible_len "$seg") )) -le "$cols" ]; then
    cur="${cur}  ${divider}  ${seg}"
  else
    out="${out}${cur}\n"
    cur="$seg"
  fi
done
out="${out}${cur}"

printf '%b\n' "$out"
