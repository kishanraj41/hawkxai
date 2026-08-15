# PR Review Bot 🤖

An AI-powered code review agent with reinforcement learning capabilities that automatically reviews pull requests and learns from feedback over time.

## Features

### Core Capabilities
- 🔍 **Automated Code Review** - Analyzes code patterns, security issues, and best practices
- 🧠 **Reinforcement Learning** - Learns from feedback to improve review quality
- 📊 **Quality Scoring** - Provides 0-10 score for overall PR quality
- 📝 **Detailed Reports** - Generates JSON and Markdown review reports
- 🎯 **Smart Categorization** - Groups issues by severity and category
- 📈 **Learning Analytics** - Tracks improvement over time

### Review Categories
- **Security** - SQL injection, XSS, hardcoded secrets, unsafe operations
- **Bug Detection** - Common bugs, error handling, edge cases
- **Best Practices** - Code style, design patterns, maintainability
- **Performance** - Inefficient code, unnecessary operations
- **Documentation** - Missing docstrings, unclear comments
- **Style** - Code formatting, consistency

### Severity Levels
- 🚨 **Critical** - Security vulnerabilities, major bugs (blocks merge)
- ⚠️ **Major** - Significant issues that should be fixed
- 💡 **Minor** - Small improvements, style issues
- 💭 **Suggestion** - Nice-to-have improvements

## Installation

```bash
# No installation needed - uses Python standard library + gh CLI
# Ensure GitHub CLI is installed and authenticated
gh auth status
```

## Usage

### Review a Specific PR
```bash
python3 agents/pr-review-bot/review_bot.py 2
```

### Review All Open PRs
```bash
python3 agents/pr-review-bot/review_bot.py all
```

### Programmatic Usage
```python
from agents.pr_review_bot.review_bot import PRReviewBot

bot = PRReviewBot()
result = bot.review_pr(pr_number=2)

if result:
    print(f"Score: {result.overall_score}/10")
    print(f"Found {len(result.comments)} issues")
    bot.save_review(result)
```

## How It Works

### 1. Pattern Matching
The bot uses regex patterns to detect common issues:
- Security vulnerabilities (eval, shell=True, hardcoded secrets)
- Bad practices (bare except, print statements, var instead of let)
- Style issues (trailing whitespace, missing docstrings)
- Documentation gaps

### 2. Structural Analysis
Analyzes PR metadata:
- PR title and description quality
- Size (number of files and lines changed)
- File organization
- Commit structure

### 3. Scoring System
Calculates overall quality score (0-10):
- Starts at 10.0
- Deducts points based on severity
- Weights by confidence level
- Adjusts based on learning history

### 4. Reinforcement Learning

**Learning Mechanism:**
- Records feedback on comment acceptance
- Tracks which categories are most accurate
- Adjusts confidence scores based on history
- Improves over time with more data

**Feedback Loop:**
```
Review → Comments → Human Feedback → Learning Update → Improved Reviews
```

**Learning Data Stored:**
- Comment acceptance rates by category
- Severity accuracy scores
- Pattern effectiveness
- Total reviews and feedback count

## Review Output

### JSON Report
```json
{
  "pr_number": 2,
  "overall_score": 8.5,
  "summary": "Generally good! Found 3 minor improvements.",
  "strengths": [
    "Clear implementation with working code",
    "Well-documented PR"
  ],
  "areas_for_improvement": [
    "Add more documentation"
  ],
  "comments": [...]
}
```

### Markdown Report
```markdown
# PR Review Report: #2

**Overall Score:** 8.5/10

## Summary
✓ Generally good! Found 3 minor improvements.

## Strengths ✅
- Clear implementation with working code
- Well-documented PR

## Areas for Improvement 🔧
- Add more documentation

## Detailed Comments
...
```

## Configuration

Edit `config.yaml` to customize:
- Review patterns and rules
- Severity thresholds
- File exclusions
- Learning parameters
- Scoring weights

## Reinforcement Learning

### How Learning Works

1. **Initial Reviews** - Uses default confidence scores
2. **Feedback Collection** - Tracks which comments are accepted/rejected
3. **Pattern Recognition** - Identifies what works and what doesn't
4. **Confidence Adjustment** - Adjusts scores based on historical accuracy
5. **Continuous Improvement** - Gets better with each review

### Learning Statistics

View learning progress:
```python
bot = PRReviewBot()
stats = bot.learner.get_learning_stats()
print(stats)
```

Output:
```json
{
  "total_reviews": 25,
  "feedback_count": 47,
  "category_performance": {
    "security": {"acceptance_rate": 0.95, "sample_size": 12},
    "best-practice": {"acceptance_rate": 0.78, "sample_size": 23}
  },
  "severity_accuracy": {
    "critical": {"accuracy": 0.92, "sample_size": 10},
    "major": {"accuracy": 0.81, "sample_size": 15}
  }
}
```

### Providing Feedback

To improve the bot, record feedback:
```python
from agents.pr_review_bot.review_bot import ReinforcementLearner, ReviewComment

learner = ReinforcementLearner()

# Comment was accepted/fixed
learner.record_feedback(comment, accepted=True)

# Comment was rejected/ignored
learner.record_feedback(comment, accepted=False)
```

## Extending the Bot

### Add Custom Patterns

Edit `review_bot.py` or `config.yaml`:
```python
'python': {
    'critical': [
        (r'your_pattern', 'Your message'),
    ]
}
```

### Add New Categories

Extend the `ReviewComment` categories:
- security
- bug
- style
- performance
- documentation
- best-practice
- testing (new)
- accessibility (new)

### Integrate with CI/CD

```yaml
# .github/workflows/pr-review.yml
name: PR Review Bot
on: pull_request

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Review Bot
        run: |
          python3 agents/pr-review-bot/review_bot.py ${{ github.event.pull_request.number }}
```

## Learning Data

Learning data is stored in `learning_data.json`:
- **Comment acceptance rates** - Which comment types are most accurate
- **Severity accuracy** - How well severity classifications match reality
- **Pattern effectiveness** - Which patterns catch real issues
- **Feedback history** - All learning over time

**Privacy:** Learning data is local and never sent externally.

## Advanced Features

### Batch Review
```bash
# Review multiple PRs
for pr in 1 2 3; do
  python3 agents/pr-review-bot/review_bot.py $pr
done
```

### Compare Reviews
```python
# Compare review scores over time
import json
import glob

reviews = []
for file in glob.glob('agents/pr-review-bot/reviews/*.json'):
    with open(file) as f:
        reviews.append(json.load(f))

avg_score = sum(r['overall_score'] for r in reviews) / len(reviews)
print(f"Average PR score: {avg_score:.1f}/10")
```

### Export Learning Stats
```python
bot = PRReviewBot()
stats = bot.learner.get_learning_stats()

# Export to CSV
import csv
with open('learning_stats.csv', 'w') as f:
    writer = csv.DictWriter(f, fieldnames=['category', 'acceptance_rate'])
    writer.writeheader()
    for cat, data in stats['category_performance'].items():
        writer.writerow({'category': cat, 'acceptance_rate': data['acceptance_rate']})
```

## Best Practices

### For Developers
1. Run review bot before requesting human review
2. Address critical and major issues first
3. Consider minor issues based on context
4. Provide feedback when comments are incorrect

### For Maintainers
1. Review bot findings alongside code
2. Record feedback to improve learning
3. Customize patterns for your codebase
4. Monitor learning statistics
5. Update patterns as codebase evolves

## Limitations

- **Pattern-based**: May miss complex logic issues
- **Context-limited**: Doesn't understand full business logic
- **Learning needs data**: Requires feedback to improve
- **Not a replacement**: Complements human review, doesn't replace it

## Future Enhancements

Potential improvements:
- [ ] AST-based analysis (beyond regex)
- [ ] Integration with static analysis tools (pylint, eslint)
- [ ] ML model for code quality prediction
- [ ] Automatic fix suggestions
- [ ] Test coverage analysis
- [ ] Performance benchmarking
- [ ] Git history analysis
- [ ] Team-specific learning profiles

## Contributing

To improve the review bot:
1. Add new patterns in `review_patterns`
2. Enhance learning algorithm
3. Add new review categories
4. Improve scoring algorithm
5. Add language support (Go, Rust, etc.)

## License

Same as project license.

---

**Built with ❤️ for better code quality through AI and reinforcement learning**
