

# linear-tui

A keyboard-first Linear client for the terminal, built with Bun, React, OpenTUI, and the Linear SDK.

This is in no way affiliated with Linear, Inc.

I love linear, I just wanted it in a tui for some reason.

<img width="1768" height="1028" alt="Screenshot 2026-05-02 at 11 06 24" src="https://github.com/user-attachments/assets/f0e34640-4d22-4dc6-b148-45b25aef0bbc" />

View Current Cycle, Group by assignee, order by status.
<img width="1760" height="1037" alt="Screenshot 2026-05-02 at 11 56 26" src="https://github.com/user-attachments/assets/032af3b4-6ac7-4d91-81fc-bd2687024537" />

## Setup

```sh
bun install
cp .env.example .env
```

Create a personal API key in Linear from [Settings > Account > Security & Access](https://linear.app/settings/account/security), then set `LINEAR_API_KEY` in `.env`. Linear documents API keys in [API and Webhooks](https://linear.app/docs/api-and-webhooks).

Run:

```sh
bun run start
```

## Homebrew

```sh
brew install oven-sh/bun/bun
brew tap wsoule/tap
brew install linear-tui
```

For development:

```sh
bun run dev
```

## Keybindings

Defaults:

- `m`, `i`, `p`, `c`, `/` switch views.
- `j`/`k`, arrows, `g`, `G`, `enter`, and `esc` navigate.
- `s`, `a`, `c`, and `n` update the selected issue.
- `p` sets priority while viewing an individual issue.
- `y` copies the branch name, `Y` copies the issue id, and `B` switches to the branch.
- `f`, `ctrl+g`, and `ctrl+o` edit saved list filtering, grouping, and ordering.
- `r` reloads the current page, `,` opens settings, `?` opens help, and `q` quits.

Keybindings are stored in `~/.config/linear-tui/keybindings.json`.

## Configuration

Viewing preferences are stored in `~/.config/linear-tui/viewing.json`.

Theme overrides can be placed at `~/.config/linear-tui/theme.json`:

```json
{
  "accent": "#5e6ad2",
  "bg": "#0e0e10",
  "bgPanel": "#16161a"
}
```

## Verification

```sh
bun run typecheck
```
