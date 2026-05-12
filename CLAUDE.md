# The Talent Memo

Weekly AI talent intelligence digest. Pulls from 20+ RSS feeds and web search, uses Claude to editorially route and write each item, and delivers a branded HTML email every Monday morning.

## Trigger: `run digest`

When you see `run digest`, execute the full pipeline:

1. Run `npm install` if `node_modules` doesn't exist
2. Run `node generate.js` to fetch, write, and send the digest
3. Report: how many items per section, whether the email sent successfully

For a preview without sending:
- Run `node generate.js --dry-run`
- Open `last-dry-run.html` in a browser to review

## One-time setup (required before first run)

Create a `.env` file in this directory with:

```
ANTHROPIC_API_KEY=your_key_here
GMAIL_USER=your_gmail@gmail.com
GMAIL_APP_PASSWORD=your_app_password_here
```

To get a Gmail App Password:
1. Go to myaccount.google.com → Security → 2-Step Verification → App passwords
2. Create a new app password for "Mail"
3. Paste the 16-character password as GMAIL_APP_PASSWORD

## Project structure

```
radical-intel/
├── CLAUDE.md         # This file
├── generate.js       # Main orchestrator: fetch → Claude → render → send
├── template.js       # HTML email renderer (matches preview.html design)
├── sources.js        # RSS feeds + search queries + lookback windows
├── preview.html      # Static design reference (not used in production)
├── archive.json      # Sent article URLs — auto-updated, do not edit
├── last-dry-run.html # Output of most recent --dry-run
└── .env              # Credentials — never commit this file
```

## Sections

| Section | What it covers |
|---|---|
| 📈 Market Signals | Funding, layoffs, headcount freezes, M&A — each with a talent implication |
| 🔄 Talent Trends | Exec moves, team hires, departure patterns, skillset demand shifts |
| 🛠️ Field Notes | Comp data, sourcing tactics, market shifts affecting how recruiters work |
| 🔭 On Our Radar | Forward-looking patterns: companies quietly building, emerging role types |

## Editorial rules (baked into Claude's prompt)

- Every item must answer: is this helpful? is it relevant? what's the talent implication?
- Each story appears once, in the best-fit section
- Skip tool/platform announcements unless they meaningfully change recruiter workflows
- On Our Radar = forward-looking inference, not just more news
- Lookback: 7 days for news sections, 30 days for On Our Radar pattern recognition

## Scheduling

To automate weekly Monday 7am ET delivery, use `/schedule` to create a remote agent
that runs `node generate.js` on a cron schedule.
