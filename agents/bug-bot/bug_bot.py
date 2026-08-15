"""
Bug Bot - Intelligent bug detection and tracking agent
Automatically finds bugs, tracks issues, and suggests fixes.
"""

import os
import json
import re
import subprocess
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict


@dataclass
class Bug:
    """Represents a detected bug."""
    bug_id: str
    severity: str  # 'critical', 'high', 'medium', 'low'
    category: str  # 'logic', 'security', 'performance', 'memory', 'null-check', 'type-error'
    file_path: str
    line_number: int
    code_snippet: str
    description: str
    suggestion: Optional[str] = None
    confidence: float = 0.8
    detected_at: str = None
    
    def __post_init__(self):
        if self.detected_at is None:
            self.detected_at = datetime.now().isoformat()


@dataclass
class BugReport:
    """Complete bug analysis report."""
    timestamp: str
    total_bugs: int
    critical_bugs: int
    high_bugs: int
    medium_bugs: int
    low_bugs: int
    bugs_by_category: Dict[str, int]
    bugs_by_file: Dict[str, int]
    all_bugs: List[Bug]
    summary: str


class BugDetector:
    """Main bug detection engine."""
    
    def __init__(self, repo_path: str = "."):
        self.repo_path = repo_path
        self.bug_patterns = self._load_bug_patterns()
        self.bug_history = self._load_bug_history()
        
    def _load_bug_patterns(self) -> Dict:
        """Load bug detection patterns."""
        return {
            'python': {
                'critical': [
                    # Security vulnerabilities
                    (r'eval\([^)]*\)', 'Code injection vulnerability with eval()', 
                     'Avoid eval() - use ast.literal_eval() for safe evaluation'),
                    
                    (r'exec\([^)]*\)', 'Code execution vulnerability with exec()',
                     'Avoid exec() - refactor to use safe alternatives'),
                    
                    (r'pickle\.loads?\([^)]*\)', 'Arbitrary code execution with pickle',
                     'Use json instead of pickle for untrusted data'),
                    
                    (r'shell=True', 'Shell injection vulnerability',
                     'Use shell=False and pass command as list'),
                    
                    (r'PASSWORD\s*=\s*["\'][^"\']+["\']', 'Hardcoded password',
                     'Use environment variables or secure vault'),
                    
                    (r'API[_-]?KEY\s*=\s*["\'][^"\']+["\']', 'Hardcoded API key',
                     'Use environment variables for API keys'),
                    
                    # SQL Injection
                    (r'execute\(["\'].*%s.*["\']', 'Potential SQL injection',
                     'Use parameterized queries instead of string formatting'),
                    
                    (r'\.format\(.*\).*execute', 'SQL injection via format()',
                     'Use parameterized queries with ? or %s placeholders'),
                ],
                
                'high': [
                    # Logic errors
                    (r'except\s*:\s*pass', 'Silent exception handling - errors are hidden',
                     'Log exceptions or handle specific exception types'),
                    
                    (r'except\s+Exception\s*:\s*pass', 'Catching and ignoring all exceptions',
                     'Handle specific exceptions or at least log them'),
                    
                    (r'if\s+.*=(?!=)', 'Assignment in conditional (should be ==)',
                     'Use == for comparison, not = for assignment'),
                    
                    # Resource leaks
                    (r'open\([^)]+\)(?!.*with)', 'File not closed - resource leak',
                     'Use "with open(...) as f:" to ensure file is closed'),
                    
                    # Infinite loops
                    (r'while\s+True\s*:(?!.*break)', 'Potential infinite loop without break',
                     'Add a break condition or timeout mechanism'),
                    
                    # Division by zero
                    (r'/\s*0(?!\w)', 'Division by zero',
                     'Check for zero before division'),
                    
                    (r'/\s*\((?!.*!=.*0)', 'Potential division by zero',
                     'Validate denominator is non-zero'),
                ],
                
                'medium': [
                    # Null/None issues
                    (r'\.(?:get|pop)\([^)]*\)(?!.*if)', 'Accessing dict without None check',
                     'Check if key exists or use .get() with default'),
                    
                    (r'\[.*\](?!.*try|.*if.*len)', 'Index access without bounds check',
                     'Check list length before accessing index'),
                    
                    # Type issues
                    (r'\+\s*None', 'Adding None to something',
                     'Check for None before operations'),
                    
                    (r'int\([^)]*\)(?!.*try)', 'Type conversion without error handling',
                     'Wrap in try-except to handle ValueError'),
                    
                    # Mutable defaults
                    (r'def\s+\w+\([^)]*=\s*\[\]', 'Mutable default argument []',
                     'Use None as default and create list inside function'),
                    
                    (r'def\s+\w+\([^)]*=\s*\{\}', 'Mutable default argument {}',
                     'Use None as default and create dict inside function'),
                ],
                
                'low': [
                    # Performance
                    (r'for\s+\w+\s+in\s+range\(len\(', 'Inefficient iteration',
                     'Use "for item in list:" instead of range(len())'),
                    
                    (r'\+=\s*\[', 'Inefficient list concatenation',
                     'Use list.extend() or list comprehension'),
                    
                    # Code smell
                    (r'TODO|FIXME|XXX|HACK', 'Unresolved TODO/FIXME comment',
                     'Address or create an issue to track'),
                ]
            },
            
            'javascript': {
                'critical': [
                    (r'eval\(', 'Code injection with eval()',
                     'Avoid eval() - use JSON.parse() or safe alternatives'),
                    
                    (r'innerHTML\s*=(?!.*sanitize)', 'XSS vulnerability with innerHTML',
                     'Use textContent or sanitize input'),
                    
                    (r'dangerouslySetInnerHTML', 'React XSS risk',
                     'Sanitize HTML or use safe React patterns'),
                ],
                
                'high': [
                    (r'==(?!=)', 'Using == instead of ===',
                     'Use === for strict equality check'),
                    
                    (r'var\s+\w+', 'Using var instead of let/const',
                     'Use let or const for block scoping'),
                    
                    (r'catch\s*\(\w*\)\s*\{\s*\}', 'Empty catch block',
                     'Handle or log errors properly'),
                ],
                
                'medium': [
                    (r'console\.log', 'Console.log in production code',
                     'Remove or use proper logging library'),
                    
                    (r'setTimeout\([^,]+,\s*0\)', 'setTimeout with 0 delay',
                     'Consider using requestAnimationFrame or microtask'),
                ],
            },
            
            'typescript': {
                'high': [
                    (r'@ts-ignore', 'TypeScript error suppression',
                     'Fix the type issue instead of ignoring'),
                    
                    (r'as\s+any', 'Type cast to any',
                     'Use proper types instead of any'),
                ],
            }
        }
    
    def _load_bug_history(self) -> Dict:
        """Load historical bug data."""
        history_file = "agents/bug-bot/bug_history.json"
        if os.path.exists(history_file):
            with open(history_file, 'r') as f:
                return json.load(f)
        return {
            'total_bugs_found': 0,
            'bugs_fixed': 0,
            'false_positives': 0,
            'bugs_by_type': defaultdict(int),
            'scans_performed': 0
        }
    
    def _save_bug_history(self):
        """Save bug history."""
        os.makedirs("agents/bug-bot", exist_ok=True)
        with open("agents/bug-bot/bug_history.json", 'w') as f:
            json.dump(self.bug_history, f, indent=2)
    
    def scan_file(self, file_path: str) -> List[Bug]:
        """Scan a single file for bugs."""
        bugs = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"⚠️  Could not read {file_path}: {e}")
            return bugs
        
        # Determine language
        ext = os.path.splitext(file_path)[1]
        language_map = {
            '.py': 'python',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript'
        }
        
        language = language_map.get(ext)
        if not language:
            return bugs
        
        # Check patterns for this language
        for severity, patterns in self.bug_patterns.get(language, {}).items():
            for pattern in patterns:
                if len(pattern) == 2:
                    regex, description = pattern
                    suggestion = None
                elif len(pattern) == 3:
                    regex, description, suggestion = pattern
                else:
                    continue
                
                matches = re.finditer(regex, content, re.MULTILINE | re.IGNORECASE)
                for match in matches:
                    line_num = content[:match.start()].count('\n') + 1
                    
                    # Get code snippet (context)
                    lines = content.split('\n')
                    snippet_start = max(0, line_num - 2)
                    snippet_end = min(len(lines), line_num + 2)
                    snippet = '\n'.join(lines[snippet_start:snippet_end])
                    
                    # Determine category from description
                    category = 'logic'
                    if 'inject' in description.lower() or 'security' in description.lower() or 'vulnerability' in description.lower():
                        category = 'security'
                    elif 'performance' in description.lower() or 'inefficient' in description.lower():
                        category = 'performance'
                    elif 'leak' in description.lower():
                        category = 'memory'
                    elif 'none' in description.lower() or 'null' in description.lower():
                        category = 'null-check'
                    elif 'type' in description.lower():
                        category = 'type-error'
                    
                    bug = Bug(
                        bug_id=f"{file_path}:{line_num}",
                        severity=severity,
                        category=category,
                        file_path=file_path,
                        line_number=line_num,
                        code_snippet=snippet,
                        description=description,
                        suggestion=suggestion,
                        confidence=0.8
                    )
                    
                    bugs.append(bug)
        
        return bugs
    
    def scan_directory(self, directory: str = None, exclude_patterns: List[str] = None) -> List[Bug]:
        """Scan entire directory for bugs."""
        if directory is None:
            directory = self.repo_path
        
        if exclude_patterns is None:
            exclude_patterns = [
                '__pycache__',
                'node_modules',
                '.git',
                'venv',
                'env',
                '.eggs',
                'build',
                'dist',
                '*.pyc',
                '*.min.js',
                '*.min.css'
            ]
        
        all_bugs = []
        file_count = 0
        
        print(f"\n🔍 Scanning {directory} for bugs...")
        
        for root, dirs, files in os.walk(directory):
            # Filter out excluded directories
            dirs[:] = [d for d in dirs if not any(ex in d for ex in exclude_patterns)]
            
            for file in files:
                # Skip excluded files
                if any(file.endswith(ex.replace('*', '')) for ex in exclude_patterns if '*' in ex):
                    continue
                
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, self.repo_path)
                
                # Only scan code files
                if file.endswith(('.py', '.js', '.jsx', '.ts', '.tsx')):
                    file_count += 1
                    print(f"  📄 {rel_path}")
                    bugs = self.scan_file(file_path)
                    all_bugs.extend(bugs)
        
        print(f"\n✅ Scanned {file_count} files, found {len(all_bugs)} potential bugs")
        
        # Update history
        self.bug_history['scans_performed'] += 1
        self.bug_history['total_bugs_found'] += len(all_bugs)
        self._save_bug_history()
        
        return all_bugs
    
    def generate_report(self, bugs: List[Bug]) -> BugReport:
        """Generate comprehensive bug report."""
        # Count by severity
        severity_counts = {
            'critical': sum(1 for b in bugs if b.severity == 'critical'),
            'high': sum(1 for b in bugs if b.severity == 'high'),
            'medium': sum(1 for b in bugs if b.severity == 'medium'),
            'low': sum(1 for b in bugs if b.severity == 'low'),
        }
        
        # Count by category
        bugs_by_category = defaultdict(int)
        for bug in bugs:
            bugs_by_category[bug.category] += 1
        
        # Count by file
        bugs_by_file = defaultdict(int)
        for bug in bugs:
            bugs_by_file[bug.file_path] += 1
        
        # Generate summary
        if not bugs:
            summary = "✅ Excellent! No bugs detected."
        elif severity_counts['critical'] > 0:
            summary = f"🚨 CRITICAL: {severity_counts['critical']} critical bug(s) found - immediate action required!"
        elif severity_counts['high'] > 0:
            summary = f"⚠️  HIGH: {severity_counts['high']} high-severity bug(s) found - should fix soon."
        else:
            summary = f"💡 Found {len(bugs)} potential issue(s) - mostly minor."
        
        report = BugReport(
            timestamp=datetime.now().isoformat(),
            total_bugs=len(bugs),
            critical_bugs=severity_counts['critical'],
            high_bugs=severity_counts['high'],
            medium_bugs=severity_counts['medium'],
            low_bugs=severity_counts['low'],
            bugs_by_category=dict(bugs_by_category),
            bugs_by_file=dict(bugs_by_file),
            all_bugs=bugs,
            summary=summary
        )
        
        return report
    
    def save_report(self, report: BugReport):
        """Save bug report to files."""
        output_dir = "agents/bug-bot/reports"
        os.makedirs(output_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Save JSON
        json_file = os.path.join(output_dir, f"bug_report_{timestamp}.json")
        with open(json_file, 'w') as f:
            report_dict = {
                'timestamp': report.timestamp,
                'total_bugs': report.total_bugs,
                'critical_bugs': report.critical_bugs,
                'high_bugs': report.high_bugs,
                'medium_bugs': report.medium_bugs,
                'low_bugs': report.low_bugs,
                'bugs_by_category': report.bugs_by_category,
                'bugs_by_file': report.bugs_by_file,
                'summary': report.summary,
                'bugs': [asdict(b) for b in report.all_bugs]
            }
            json.dump(report_dict, f, indent=2)
        
        print(f"💾 JSON report saved to: {json_file}")
        
        # Save Markdown
        md_file = os.path.join(output_dir, f"bug_report_{timestamp}.md")
        self._create_markdown_report(report, md_file)
        
        return json_file, md_file
    
    def _create_markdown_report(self, report: BugReport, filepath: str):
        """Create markdown bug report."""
        md = f"""# Bug Detection Report

**Scan Date:** {report.timestamp}  
**Total Bugs Found:** {report.total_bugs}

---

## Summary

{report.summary}

## Severity Breakdown

- 🚨 **Critical:** {report.critical_bugs}
- ⚠️  **High:** {report.high_bugs}
- 💡 **Medium:** {report.medium_bugs}
- 🔸 **Low:** {report.low_bugs}

## Category Breakdown

"""
        for category, count in sorted(report.bugs_by_category.items(), key=lambda x: -x[1]):
            md += f"- **{category.title()}:** {count}\n"
        
        md += "\n## Files with Most Bugs\n\n"
        top_files = sorted(report.bugs_by_file.items(), key=lambda x: -x[1])[:10]
        for file_path, count in top_files:
            md += f"- `{file_path}`: {count} bug(s)\n"
        
        if report.all_bugs:
            md += "\n## Detailed Bug List\n\n"
            
            # Group by severity
            for severity in ['critical', 'high', 'medium', 'low']:
                bugs_in_severity = [b for b in report.all_bugs if b.severity == severity]
                if not bugs_in_severity:
                    continue
                
                severity_emoji = {
                    'critical': '🚨',
                    'high': '⚠️',
                    'medium': '💡',
                    'low': '🔸'
                }
                
                md += f"\n### {severity_emoji[severity]} {severity.upper()} ({len(bugs_in_severity)})\n\n"
                
                for bug in bugs_in_severity:
                    md += f"#### {bug.file_path}:{bug.line_number}\n\n"
                    md += f"**Category:** {bug.category}  \n"
                    md += f"**Issue:** {bug.description}  \n"
                    md += f"**Confidence:** {bug.confidence:.0%}  \n"
                    
                    if bug.suggestion:
                        md += f"**Fix:** {bug.suggestion}  \n"
                    
                    md += f"\n**Code:**\n```python\n{bug.code_snippet}\n```\n\n"
                    md += "---\n\n"
        
        md += "\n---\n\n*Generated by Bug Bot - Intelligent Bug Detection Agent*\n"
        
        with open(filepath, 'w') as f:
            f.write(md)
        
        print(f"📄 Markdown report saved to: {filepath}")


def main():
    """Main CLI interface."""
    import sys
    
    detector = BugDetector()
    
    if len(sys.argv) > 1:
        target = sys.argv[1]
    else:
        target = "."
    
    # Scan for bugs
    bugs = detector.scan_directory(target)
    
    # Generate report
    report = detector.generate_report(bugs)
    
    # Display summary
    print(f"\n{'='*60}")
    print(report.summary)
    print(f"{'='*60}")
    print(f"\nTotal: {report.total_bugs} bugs")
    print(f"  🚨 Critical: {report.critical_bugs}")
    print(f"  ⚠️  High: {report.high_bugs}")
    print(f"  💡 Medium: {report.medium_bugs}")
    print(f"  🔸 Low: {report.low_bugs}")
    
    # Save report
    detector.save_report(report)


if __name__ == '__main__':
    main()
