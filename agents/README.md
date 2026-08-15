# Agents Directory 🤖

This directory contains autonomous AI agents that enhance the development workflow.

## Available Agents

### 1. Booster Agent (`booster-agent/`) — **core idea**

Captures trending hashtags, QRs, phrases, and URLs; correlates why they are trending; translates insights for every age group and for campaign competitors; and keeps improvising the dashboard.

```bash
python3 agents/booster-agent/booster_agent.py --self-check
python3 agents/booster-agent/booster_agent.py --file agents/booster-agent/fixtures/sample_trends.json
```

[See full documentation →](booster-agent/README.md) · [Core idea →](../docs/CORE_IDEA.md)

### 2. PR Review Bot (`pr-review-bot/`)

An AI-powered code review agent with reinforcement learning capabilities.

**Features:**
- 🔍 Automated code review
- 🧠 Reinforcement learning
- 📊 Quality scoring (0-10)
- 📝 Detailed reports (JSON + Markdown)
- 🎯 Smart categorization
- 📈 Learning analytics

[See full documentation →](pr-review-bot/README.md)

### 3. Bug Bot (`bug-bot/`)

Intelligent bug detection and tracking agent that finds security vulnerabilities and logic errors.

**Quick Start:**
```bash
# PR Review Bot
python3 agents/pr-review-bot/review_bot.py 2

# Booster Agent
python3 agents/booster-agent/booster_agent.py --self-check

# Bug Bot
python3 agents/bug-bot/bug_bot.py
```

[See full documentation →](pr-review-bot/README.md) | [Bug Bot docs →](bug-bot/README.md)

---

## Example Results

### PR Review Bot

#### PR #2: Documentation (Score: 9.7/10)
```markdown
## Summary
✓ Generally good! Found 1 minor improvement(s).

## Strengths ✅
- Clear implementation with working code
- Well-documented PR with good description
- Focused PR with manageable scope
- Clean code with good practices
```

#### PR #1: Research Agent (Score: 0.0/10)
```markdown
## Summary
⚡ Found 82 major issue(s) to address before merging.

## Areas for Improvement 🔧
- Fix 82 major issue(s)
- Several minor style/documentation improvements possible
- Add more documentation (docstrings, comments)
```

Issues found:
- 82 major: Print statements (should use logging)
- 132 minor: Trailing whitespace, missing docstrings

### Bug Bot

#### Full Repository Scan
```markdown
## Summary
🚨 CRITICAL: 13 critical bug(s) found - immediate action required!

Total: 390 bugs
  🚨 Critical: 13 (security vulnerabilities)
  ⚠️  High: 37 (logic errors, resource leaks)
  💡 Medium: 330 (type issues, None checks)
  🔸 Low: 10 (performance, code smells)
```

Critical issues found:
- Hardcoded passwords/API keys
- Potential SQL injection
- Code injection with eval()
- Shell injection vulnerabilities

---

## Adding New Agents

To add a new agent:

1. Create directory: `agents/your-agent-name/`
2. Add main script: `agent.py` or similar
3. Add README.md with documentation
4. Add config file if needed
5. Update this README

### Agent Structure Template

```
agents/
└── your-agent-name/
    ├── README.md           # Documentation
    ├── agent.py            # Main agent code
    ├── config.yaml         # Configuration
    ├── requirements.txt    # Dependencies
    └── tests/              # Tests
```

### Agent Best Practices

✅ **DO:**
- Document usage clearly
- Include configuration options
- Provide examples
- Handle errors gracefully
- Support batch operations
- Save results for later review

❌ **DON'T:**
- Hardcode values
- Ignore edge cases
- Skip error handling
- Forget to document
- Make breaking changes without versioning

---

## Future Agents (Ideas)

Potential agents to build:
- **Test Coverage Agent** - Ensure adequate test coverage
- **Security Audit Agent** - Deep security analysis
- **Performance Profiler** - Find performance bottlenecks
- **Dependency Updater** - Keep dependencies current
- **Documentation Generator** - Auto-generate docs
- **Code Refactoring Agent** - Suggest refactorings
- **API Design Reviewer** - Review API consistency
- **Accessibility Checker** - Ensure accessibility standards

---

## Agent Integration

### CI/CD Integration

```yaml
# .github/workflows/agents.yml
name: AI Agents

on: pull_request

jobs:
  pr-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: PR Review Bot
        run: python3 agents/pr-review-bot/review_bot.py ${{ github.event.pull_request.number }}
```

### Pre-commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash
python3 agents/pr-review-bot/review_bot.py $(gh pr view --json number -q .number)
```

### CLI Integration

```bash
# Add to package.json or Makefile
review-pr:
    python3 agents/pr-review-bot/review_bot.py $(PR)

# Usage: make review-pr PR=2
```

---

## Agent Analytics

Track agent performance:

```bash
# View learning statistics
python3 -c "from agents.pr_review_bot.review_bot import PRReviewBot; import json; print(json.dumps(PRReviewBot().learner.get_learning_stats(), indent=2))"

# Count reviews
ls agents/pr-review-bot/reviews/*.json | wc -l

# Average score
python3 -c "import json, glob; scores = [json.load(open(f))['overall_score'] for f in glob.glob('agents/pr-review-bot/reviews/*.json')]; print(f'Average: {sum(scores)/len(scores):.1f}/10')"
```

---

## Contributing

To contribute new agents or improve existing ones:

1. Fork the repository
2. Create your agent in `agents/your-agent/`
3. Add comprehensive documentation
4. Test thoroughly
5. Submit a pull request

---

**Built to make development smarter, faster, and better!** 🚀
