# Bug Bot 🐛

An intelligent bug detection and tracking agent that automatically scans code for bugs, security vulnerabilities, and code smells.

## Features

### Core Capabilities
- 🔍 **Automated Bug Detection** - Pattern-based bug finding
- 🚨 **Security Scanning** - Detects vulnerabilities (SQL injection, XSS, code injection)
- 🎯 **Multi-Language Support** - Python, JavaScript, TypeScript
- 📊 **Severity Classification** - Critical, High, Medium, Low
- 📝 **Detailed Reports** - JSON and Markdown output
- 💡 **Fix Suggestions** - Actionable recommendations
- 📈 **Bug Tracking** - Historical data and trends

### Bug Categories
- **Security** - Injection vulnerabilities, hardcoded secrets, unsafe operations
- **Logic** - Incorrect conditionals, infinite loops, division by zero
- **Null/Type** - Missing None checks, type conversion errors
- **Memory** - Resource leaks, unclosed files
- **Performance** - Inefficient code patterns
- **Code Smells** - TODO/FIXME comments, bad practices

### Severity Levels
- 🚨 **Critical** - Security vulnerabilities, data loss risks (fix immediately)
- ⚠️ **High** - Logic errors, resource leaks (fix soon)
- 💡 **Medium** - Type issues, potential bugs (should fix)
- 🔸 **Low** - Performance, code smells (nice to fix)

## Installation

```bash
# No external dependencies needed - uses Python standard library
python3 --version  # Requires Python 3.7+
```

## Usage

### Scan Current Directory
```bash
python3 agents/bug-bot/bug_bot.py
```

### Scan Specific Directory
```bash
python3 agents/bug-bot/bug_bot.py path/to/code
```

### Programmatic Usage
```python
from agents.bug_bot.bug_bot import BugDetector

detector = BugDetector()
bugs = detector.scan_directory("src/")
report = detector.generate_report(bugs)

print(f"Found {report.total_bugs} bugs")
print(f"Critical: {report.critical_bugs}")

detector.save_report(report)
```

## How It Works

### 1. Pattern Matching
Uses regex patterns to detect common bugs:

**Python:**
- `eval()`, `exec()` - Code injection
- `shell=True` - Shell injection
- Hardcoded passwords/API keys
- SQL injection patterns
- Silent exception handling
- Resource leaks (unclosed files)
- Division by zero
- Mutable default arguments

**JavaScript/TypeScript:**
- `eval()` - Code injection
- `innerHTML` - XSS vulnerabilities
- `==` vs `===` - Type coercion bugs
- `var` vs `let/const` - Scoping issues
- Empty catch blocks
- Console.log in production

### 2. Severity Assignment
Automatically classifies bugs:
- Security vulnerabilities → Critical
- Logic errors, resource leaks → High
- Type issues, None checks → Medium
- Performance, code smells → Low

### 3. Context Extraction
Provides code snippets with surrounding context for each bug.

### 4. Fix Suggestions
Offers actionable recommendations for fixing bugs.

## Bug Detection Examples

### Example 1: Security Vulnerability (Critical)
```python
# ❌ Bug detected
password = "admin123"  # Hardcoded password

# ✅ Fix
import os
password = os.getenv('PASSWORD')
```

### Example 2: Logic Error (High)
```python
# ❌ Bug detected
try:
    risky_operation()
except:
    pass  # Silent failure

# ✅ Fix
try:
    risky_operation()
except SpecificError as e:
    logger.error(f"Operation failed: {e}")
    raise
```

### Example 3: Resource Leak (High)
```python
# ❌ Bug detected
f = open('file.txt')
data = f.read()
# File never closed

# ✅ Fix
with open('file.txt') as f:
    data = f.read()
# Automatically closed
```

### Example 4: Type Issue (Medium)
```python
# ❌ Bug detected
value = int(user_input)  # Can raise ValueError

# ✅ Fix
try:
    value = int(user_input)
except ValueError:
    value = default_value
```

## Report Output

### Console Output
```
🔍 Scanning . for bugs...
  📄 research_agent.py
  📄 cli.py
  📄 config.py

✅ Scanned 3 files, found 15 potential bugs

============================================================
⚠️ HIGH: 5 high-severity bug(s) found - should fix soon.
============================================================

Total: 15 bugs
  🚨 Critical: 0
  ⚠️ High: 5
  💡 Medium: 8
  🔸 Low: 2
```

### JSON Report
```json
{
  "timestamp": "2026-08-15T16:30:00",
  "total_bugs": 15,
  "critical_bugs": 0,
  "high_bugs": 5,
  "bugs_by_category": {
    "logic": 5,
    "null-check": 3,
    "performance": 2
  },
  "bugs": [...]
}
```

### Markdown Report
```markdown
# Bug Detection Report

**Total Bugs Found:** 15

## Summary
⚠️ HIGH: 5 high-severity bug(s) found - should fix soon.

## Severity Breakdown
- 🚨 Critical: 0
- ⚠️ High: 5
- 💡 Medium: 8
- 🔸 Low: 2

## Detailed Bug List
...
```

## Configuration

### Exclude Patterns
Edit `bug_bot.py` to customize excluded directories:
```python
exclude_patterns = [
    '__pycache__',
    'node_modules',
    '.git',
    'venv',
    'test_*',  # Exclude test files
    'mock_*'   # Exclude mocks
]
```

### Add Custom Patterns
```python
'python': {
    'high': [
        (r'your_pattern', 'Description', 'Fix suggestion'),
    ]
}
```

## CI/CD Integration

### GitHub Actions
```yaml
name: Bug Detection

on: [push, pull_request]

jobs:
  bug-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Bug Bot
        run: |
          python3 agents/bug-bot/bug_bot.py
          # Fail if critical bugs found
          if grep -q '"critical_bugs": [1-9]' agents/bug-bot/reports/*.json; then
            echo "Critical bugs found!"
            exit 1
          fi
```

### Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

python3 agents/bug-bot/bug_bot.py

# Check for critical bugs
CRITICAL=$(jq '.critical_bugs' agents/bug-bot/reports/*.json | tail -1)
if [ "$CRITICAL" -gt 0 ]; then
    echo "❌ Commit blocked: Critical bugs detected!"
    exit 1
fi
```

## Best Practices

### For Developers
1. Run bug bot before committing
2. Fix critical and high-severity bugs immediately
3. Address medium bugs based on context
4. Review low-severity findings periodically
5. Use suggestions as starting points

### For Teams
1. Run in CI/CD pipeline
2. Block merges with critical bugs
3. Track bug trends over time
4. Review reports in code reviews
5. Customize patterns for your codebase

## Comparison with PR Review Bot

| Feature | Bug Bot | PR Review Bot |
|---------|---------|---------------|
| **Focus** | Bug detection | Code quality review |
| **Targets** | Security, logic errors | Style, docs, best practices |
| **Severity** | Critical → Low | Critical → Suggestion |
| **Learning** | Pattern-based | Reinforcement learning |
| **Scope** | Entire codebase | Pull request changes |
| **Usage** | Periodic scans | Per-PR review |

**Use together for comprehensive code quality!**

## Limitations

- **Pattern-based**: May miss complex logic bugs
- **False positives**: Some patterns may flag valid code
- **Language coverage**: Python, JS, TS only (for now)
- **Context-limited**: Doesn't understand full program flow
- **Not a replacement**: Complements testing and human review

## Future Enhancements

Potential improvements:
- [ ] AST-based analysis (deeper inspection)
- [ ] Machine learning for bug prediction
- [ ] Integration with linters (pylint, eslint)
- [ ] More languages (Go, Rust, Java)
- [ ] Automatic fix generation
- [ ] Bug priority ranking
- [ ] Historical trend analysis
- [ ] False positive learning

## Bug Statistics

View bug detection history:
```python
from agents.bug_bot.bug_bot import BugDetector

detector = BugDetector()
print(detector.bug_history)
```

Output:
```json
{
  "total_bugs_found": 127,
  "scans_performed": 15,
  "bugs_by_type": {
    "security": 8,
    "logic": 45,
    "performance": 23
  }
}
```

## Extending Bug Bot

### Add New Language
```python
'go': {
    'critical': [
        (r'defer\s+.*\.Close\(\)', 'Deferred close in loop', 'Move defer outside loop'),
    ]
}
```

### Add New Category
```python
@dataclass
class Bug:
    category: str  # Add: 'concurrency', 'api-misuse', etc.
```

### Custom Confidence Scoring
```python
def calculate_confidence(self, bug: Bug) -> float:
    # Adjust confidence based on context
    if bug.category == 'security':
        return 0.9  # High confidence on security patterns
    return 0.7
```

## Contributing

To improve Bug Bot:
1. Add new bug patterns
2. Enhance detection algorithms
3. Add language support
4. Improve fix suggestions
5. Reduce false positives

## License

Same as project license.

---

**Built with ❤️ to catch bugs before they catch you!** 🐛
