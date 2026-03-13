# Deliverance Tools — Solution Sales Brief

**Your AI Assistant, Deployed in Seconds. Always On. Fully Yours.**

---

## The Problem

Teams need AI assistants that are always available, secure, and integrated with the tools they already use — not another tab to manage. Most AI solutions force you into a single chat window, offer no persistence, require complex self-hosting, and can't reach your team where they already work: Slack, Discord, Telegram.

## The Solution: tools.deliverance.ai

Deliverance Tools is a fully managed, always-on AI assistant platform powered by Claude and built on Cloudflare's global edge network. It deploys in minutes, connects to every channel your team uses, and comes with built-in browser automation — no infrastructure to manage.

### How It Works

```
You → Slack / Discord / Telegram / Web UI → Deliverance Tools → Claude AI
                                                  ↓
                                        Cloudflare Edge (Global)
                                        Persistent Storage (R2)
                                        Browser Automation (CDP)
```

Your assistant lives at the edge, responds instantly, and remembers everything across sessions.

---

## Key Capabilities

### 1. Multi-Channel AI Assistant
Connect once, reach your team everywhere. A single AI assistant that responds across:
- **Web Control UI** — clean, responsive chat interface
- **Slack** — direct messages and channels
- **Discord** — server and DM support
- **Telegram** — bot conversations

Every channel shares context. Start a conversation on the web, continue it in Slack. Your assistant knows the full history.

### 2. Always-On, Zero Maintenance
- **Cloudflare Sandbox** — runs in a secure, isolated container on Cloudflare's network
- **Persistent storage** — conversations, configurations, and context survive restarts via R2
- **Automatic backups** — data syncs every 5 minutes, with on-demand backup from the admin panel
- **No servers to manage** — no VMs, no Docker hosts, no uptime monitoring

### 3. Browser Automation Built In
Your AI assistant can browse the web for you:
- **Screenshots** — capture any webpage on demand
- **Video capture** — record multi-page walkthroughs
- **Web scraping** — extract data from live sites
- **Headless Chrome** — full Chrome DevTools Protocol (CDP) access via Cloudflare Browser Rendering

### 4. Enterprise-Grade Security
- **Cloudflare Access** — SSO authentication (Google, GitHub, email OTP, SAML)
- **Device pairing** — every new device requires explicit admin approval
- **Gateway tokens** — cryptographic access control for API and UI
- **Zero Trust architecture** — no open ports, no public endpoints without authentication

### 5. Admin Dashboard
A purpose-built admin panel at `/_admin/` to manage your deployment:
- View and approve pending device pairing requests
- Monitor storage status and trigger manual backups
- Restart the gateway process
- Debug endpoints for troubleshooting

---

## Why Deliverance Tools?

| Traditional AI Setup | Deliverance Tools |
|---|---|
| Self-host on a VM or container | Fully managed on Cloudflare edge |
| Single chat interface | Slack + Discord + Telegram + Web |
| No browser access | Built-in headless Chrome |
| Manual backups | Automatic R2 persistence |
| Complex auth setup | Cloudflare Access + device pairing |
| Minutes to cold-start | Always on, globally distributed |
| Per-seat SaaS pricing | Your API key, your usage |

---

\pagebreak

## Use Cases

### For Sales & Marketing Teams
- "Summarize this competitor's pricing page" — the assistant browses the site, captures screenshots, and delivers a brief
- "Draft a follow-up email based on yesterday's Slack thread" — cross-channel context means your AI already knows the conversation

### For Engineering Teams
- "Take a screenshot of staging and compare it to prod" — browser automation captures both and highlights differences
- "Monitor this endpoint and alert me in Discord if it goes down" — always-on means always watching

### For Operations Teams
- "Pull the latest data from our dashboard and post a summary to Slack every morning" — scheduled automation across channels
- "What did the team discuss in Telegram yesterday?" — persistent memory across all channels

### For Executives
- "Brief me on what happened across all channels today" — one assistant, full visibility
- "Capture a walkthrough video of our product for the board deck" — browser video capture, no screen recording software needed

---

## Getting Started

Deployment takes under 5 minutes:

1. **Deploy** — one-click deploy to Cloudflare Workers
2. **Add your API key** — bring your own Anthropic API key (you control costs)
3. **Connect channels** — add Slack, Discord, or Telegram bot tokens
4. **Pair your device** — approve access from the admin panel
5. **Start talking** — your AI assistant is live

### Pricing Model

Deliverance Tools uses a transparent, infrastructure-based pricing model:

| Component | Cost |
|---|---|
| Cloudflare Workers Paid Plan | $5/month |
| Anthropic API (Claude) | Pay-per-use (your key) |
| R2 Storage (persistence) | Free tier available |
| Browser Rendering | Free tier available |
| Cloudflare Access (SSO) | Free tier available |

**No per-seat fees. No markup on AI usage. You own your data and your costs.**

---

## Technical Specifications

| Spec | Detail |
|---|---|
| Runtime | Cloudflare Workers + Sandbox Containers |
| AI Model | Claude (Anthropic) via direct API or AI Gateway |
| Channels | Web, Slack, Discord, Telegram |
| Auth | Cloudflare Access (SSO), device pairing, gateway tokens |
| Storage | Cloudflare R2 (S3-compatible) |
| Browser | Cloudflare Browser Rendering (headless Chrome, CDP) |
| Observability | Cloudflare Analytics, AI Gateway metrics, debug endpoints |
| Uptime | Always-on containers with configurable sleep policy |
| Open Source | Built on OpenClaw (MIT License) |

---

**Ready to see it in action?** Visit [tools.deliverance.ai](https://tools.deliverance.ai) or contact us for a live demo.

*Built on [OpenClaw](https://github.com/openclaw/openclaw) · Powered by [Cloudflare](https://cloudflare.com) · Intelligence by [Claude](https://anthropic.com)*
