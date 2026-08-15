# SmartSalesGuy

Unicorn-founder sales agent. Checks out PulseMap, reads what is actually built, and writes a **one-page VC proposal**: core problem, solution, what's live, what's next.

It does extremely smart things: evidence from the git tree, not invented traction. If a number is not in the checkout, it does not appear on the page.

## What it does

| Step | Output |
|---|---|
| **Checkout** | Branch, commit, remote — and product files from `feat/booster-agent` if this CI branch is thin |
| **Read** | README, `docs/presentation/CORE_IDEA.md`, APIs, components, agents, research, improvisations |
| **Compose** | Founder-voice one-pager (problem / solution / live / next / ask) |
| **Score** | Partner-meeting gate: sections, word band, no hype, no fake ARR |
| **Publish** | `docs/presentation/VC_ONE_PAGER.md` plus a timestamped run |

## Quick start

```bash
# Write / refresh the canonical one-pager
python3 agents/smartsalesguy/smartsalesguy.py

# Self-check (no file writes)
python3 agents/smartsalesguy/smartsalesguy.py --self-check

# Tests
python3 agents/smartsalesguy/tests/test_smartsalesguy.py
```

Canonical investor asset: [docs/presentation/VC_ONE_PAGER.md](../../docs/presentation/VC_ONE_PAGER.md).

Runs land in `agents/smartsalesguy/runs/`.

## Voice

Act as the founder who intends to build a unicorn — category, wedge, why-now, receipts. Do not sound like a deck template.

- Lead with the pain a CMO / editor / growth lead already feels.
- Name the mechanism (capture → correlate → campaign), not "AI."
- Current features come from files that exist. Future features come from `IMPROVISATIONS.md` and `docs/presentation/CORE_IDEA.md`.
- Never invent users, ARR, or a fake WHY.

## North star

See [docs/presentation/CORE_IDEA.md](../../docs/presentation/CORE_IDEA.md). The product is still Booster + the map. SmartSalesGuy is how we sell it.
