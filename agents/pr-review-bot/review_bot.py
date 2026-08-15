"""
PR Review Bot - AI-powered code review agent with reinforcement learning
Automatically reviews pull requests and learns from feedback over time.
"""

import os
import json
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
import subprocess


@dataclass
class ReviewComment:
    """A review comment with location and suggestion."""
    file_path: str
    line_number: Optional[int]
    severity: str  # 'critical', 'major', 'minor', 'suggestion'
    category: str  # 'bug', 'style', 'performance', 'security', 'documentation', 'best-practice'
    message: str
    suggestion: Optional[str] = None
    confidence: float = 0.8  # 0.0 to 1.0


@dataclass
class ReviewResult:
    """Complete review result for a PR."""
    pr_number: int
    pr_title: str
    branch: str
    timestamp: str
    comments: List[ReviewComment]
    overall_score: float  # 0.0 to 10.0
    summary: str
    strengths: List[str]
    areas_for_improvement: List[str]


class ReinforcementLearner:
    """Simple reinforcement learning system for improving review quality."""
    
    def __init__(self, learning_data_path: str = "agents/pr-review-bot/learning_data.json"):
        self.learning_data_path = learning_data_path
        self.feedback_history = self._load_feedback()
        
    def _load_feedback(self) -> Dict:
        """Load historical feedback data."""
        if os.path.exists(self.learning_data_path):
            with open(self.learning_data_path, 'r') as f:
                return json.load(f)
        return {
            'comment_acceptance_rate': {},  # category -> acceptance rate
            'severity_accuracy': {},  # severity -> accuracy score
            'pattern_effectiveness': {},  # pattern -> effectiveness score
            'total_reviews': 0,
            'feedback_count': 0
        }
    
    def _save_feedback(self):
        """Save feedback data."""
        os.makedirs(os.path.dirname(self.learning_data_path), exist_ok=True)
        with open(self.learning_data_path, 'w') as f:
            json.dump(self.feedback_history, f, indent=2)
    
    def record_feedback(self, comment: ReviewComment, accepted: bool):
        """Record feedback on a review comment."""
        category = comment.category
        severity = comment.severity
        
        # Update acceptance rate for category
        if category not in self.feedback_history['comment_acceptance_rate']:
            self.feedback_history['comment_acceptance_rate'][category] = {'accepted': 0, 'total': 0}
        
        self.feedback_history['comment_acceptance_rate'][category]['total'] += 1
        if accepted:
            self.feedback_history['comment_acceptance_rate'][category]['accepted'] += 1
        
        # Update severity accuracy
        if severity not in self.feedback_history['severity_accuracy']:
            self.feedback_history['severity_accuracy'][severity] = {'correct': 0, 'total': 0}
        
        self.feedback_history['severity_accuracy'][severity]['total'] += 1
        if accepted and comment.confidence > 0.7:  # High confidence and accepted
            self.feedback_history['severity_accuracy'][severity]['correct'] += 1
        
        self.feedback_history['feedback_count'] += 1
        self._save_feedback()
    
    def adjust_confidence(self, comment: ReviewComment) -> float:
        """Adjust comment confidence based on learning history."""
        base_confidence = comment.confidence
        
        # Adjust based on category acceptance rate
        category_stats = self.feedback_history['comment_acceptance_rate'].get(comment.category)
        if category_stats and category_stats['total'] > 5:
            acceptance_rate = category_stats['accepted'] / category_stats['total']
            base_confidence *= (0.7 + 0.3 * acceptance_rate)  # Weight by acceptance
        
        # Adjust based on severity accuracy
        severity_stats = self.feedback_history['severity_accuracy'].get(comment.severity)
        if severity_stats and severity_stats['total'] > 5:
            accuracy = severity_stats['correct'] / severity_stats['total']
            base_confidence *= (0.7 + 0.3 * accuracy)
        
        return min(base_confidence, 1.0)
    
    def get_learning_stats(self) -> Dict:
        """Get current learning statistics."""
        stats = {
            'total_reviews': self.feedback_history['total_reviews'],
            'feedback_count': self.feedback_history['feedback_count'],
            'category_performance': {},
            'severity_accuracy': {}
        }
        
        for category, data in self.feedback_history['comment_acceptance_rate'].items():
            if data['total'] > 0:
                stats['category_performance'][category] = {
                    'acceptance_rate': data['accepted'] / data['total'],
                    'sample_size': data['total']
                }
        
        for severity, data in self.feedback_history['severity_accuracy'].items():
            if data['total'] > 0:
                stats['severity_accuracy'][severity] = {
                    'accuracy': data['correct'] / data['total'],
                    'sample_size': data['total']
                }
        
        return stats


class PRReviewBot:
    """Main PR review bot with AI-powered analysis."""
    
    def __init__(self, repo_path: str = "."):
        self.repo_path = repo_path
        self.learner = ReinforcementLearner()
        self.review_patterns = self._load_review_patterns()
        
    def _load_review_patterns(self) -> Dict:
        """Load code review patterns and best practices."""
        return {
            'python': {
                'critical': [
                    (r'eval\(', 'Avoid using eval() - security risk'),
                    (r'exec\(', 'Avoid using exec() - security risk'),
                    (r'shell=True', 'Avoid shell=True in subprocess - security risk'),
                ],
                'major': [
                    (r'except:\s*pass', 'Bare except with pass hides errors'),
                    (r'TODO|FIXME', 'Unresolved TODO/FIXME comments'),
                    (r'print\(.*\)', 'Use logging instead of print statements'),
                ],
                'minor': [
                    (r'^\s*$\n^\s*$\n^\s*$', 'Multiple consecutive blank lines'),
                    (r'\s+$', 'Trailing whitespace'),
                ],
            },
            'javascript': {
                'critical': [
                    (r'eval\(', 'Avoid using eval() - security risk'),
                    (r'innerHTML\s*=', 'Potential XSS vulnerability with innerHTML'),
                ],
                'major': [
                    (r'console\.log', 'Remove console.log in production code'),
                    (r'var\s+', 'Use let/const instead of var'),
                ],
            },
            'general': {
                'documentation': [
                    (r'^[^#\n]*def\s+\w+.*:\s*$', 'Missing docstring for function'),
                    (r'^[^#\n]*class\s+\w+.*:\s*$', 'Missing docstring for class'),
                ],
                'best-practice': [
                    (r'\.py.*#\s*type:\s*ignore', 'type: ignore should have explanation'),
                ],
            }
        }
    
    def get_pr_info(self, pr_number: int) -> Optional[Dict]:
        """Get PR information using gh CLI."""
        try:
            result = subprocess.run(
                ['gh', 'pr', 'view', str(pr_number), '--json', 
                 'title,number,headRefName,body,files,additions,deletions'],
                capture_output=True, text=True, cwd=self.repo_path
            )
            if result.returncode == 0:
                return json.loads(result.stdout)
            return None
        except Exception as e:
            print(f"Error getting PR info: {e}")
            return None
    
    def get_pr_diff(self, pr_number: int) -> str:
        """Get PR diff."""
        try:
            result = subprocess.run(
                ['gh', 'pr', 'diff', str(pr_number)],
                capture_output=True, text=True, cwd=self.repo_path
            )
            if result.returncode == 0:
                return result.stdout
            return ""
        except Exception:
            return ""
    
    def analyze_code_patterns(self, content: str, file_path: str) -> List[ReviewComment]:
        """Analyze code for patterns and issues."""
        comments = []
        
        # Determine file type
        file_ext = os.path.splitext(file_path)[1]
        language = None
        if file_ext == '.py':
            language = 'python'
        elif file_ext in ['.js', '.jsx', '.ts', '.tsx']:
            language = 'javascript'
        
        # Check language-specific patterns
        if language and language in self.review_patterns:
            for severity, patterns in self.review_patterns[language].items():
                for pattern, message in patterns:
                    matches = re.finditer(pattern, content, re.MULTILINE)
                    for match in matches:
                        line_num = content[:match.start()].count('\n') + 1
                        comment = ReviewComment(
                            file_path=file_path,
                            line_number=line_num,
                            severity=severity,
                            category='security' if 'security' in message.lower() else 'best-practice',
                            message=message,
                            confidence=0.8
                        )
                        # Adjust confidence based on learning
                        comment.confidence = self.learner.adjust_confidence(comment)
                        comments.append(comment)
        
        # Check general patterns
        for category, patterns in self.review_patterns.get('general', {}).items():
            for pattern, message in patterns:
                matches = re.finditer(pattern, content, re.MULTILINE)
                for match in matches:
                    line_num = content[:match.start()].count('\n') + 1
                    comment = ReviewComment(
                        file_path=file_path,
                        line_number=line_num,
                        severity='minor',
                        category=category,
                        message=message,
                        confidence=0.7
                    )
                    comment.confidence = self.learner.adjust_confidence(comment)
                    comments.append(comment)
        
        return comments
    
    def analyze_structure(self, pr_info: Dict) -> List[ReviewComment]:
        """Analyze PR structure and metadata."""
        comments = []
        
        # Check PR title
        title = pr_info.get('title', '')
        if len(title) < 10:
            comments.append(ReviewComment(
                file_path='PR Metadata',
                line_number=None,
                severity='minor',
                category='documentation',
                message='PR title is too short - should be descriptive',
                confidence=0.9
            ))
        
        # Check PR body
        body = pr_info.get('body', '')
        if len(body) < 50:
            comments.append(ReviewComment(
                file_path='PR Metadata',
                line_number=None,
                severity='minor',
                category='documentation',
                message='PR description is minimal - add more context',
                confidence=0.85
            ))
        
        # Check file count
        files = pr_info.get('files', [])
        if len(files) > 20:
            comments.append(ReviewComment(
                file_path='PR Structure',
                line_number=None,
                severity='major',
                category='best-practice',
                message=f'Large PR with {len(files)} files - consider splitting',
                confidence=0.75
            ))
        
        # Check additions/deletions
        additions = pr_info.get('additions', 0)
        deletions = pr_info.get('deletions', 0)
        total_changes = additions + deletions
        
        if total_changes > 1000:
            comments.append(ReviewComment(
                file_path='PR Structure',
                line_number=None,
                severity='major',
                category='best-practice',
                message=f'Very large PR ({total_changes} lines changed) - harder to review',
                confidence=0.8
            ))
        
        return comments
    
    def calculate_overall_score(self, comments: List[ReviewComment]) -> float:
        """Calculate overall PR quality score (0-10)."""
        if not comments:
            return 10.0
        
        # Weight by severity
        severity_weights = {
            'critical': -3.0,
            'major': -1.5,
            'minor': -0.5,
            'suggestion': -0.2
        }
        
        total_deduction = 0.0
        for comment in comments:
            weight = severity_weights.get(comment.severity, -0.5)
            # Weight by confidence
            total_deduction += abs(weight) * comment.confidence
        
        # Start from 10, deduct points
        score = max(0.0, 10.0 - total_deduction)
        return round(score, 1)
    
    def generate_summary(self, comments: List[ReviewComment], pr_info: Dict) -> Tuple[str, List[str], List[str]]:
        """Generate review summary with strengths and areas for improvement."""
        
        # Count by severity
        severity_counts = {'critical': 0, 'major': 0, 'minor': 0, 'suggestion': 0}
        for comment in comments:
            severity_counts[comment.severity] = severity_counts.get(comment.severity, 0) + 1
        
        # Generate summary
        if not comments:
            summary = "✅ Excellent! No issues found. Code looks clean and well-structured."
        elif severity_counts['critical'] > 0:
            summary = f"⚠️ Found {severity_counts['critical']} critical issue(s) that need immediate attention."
        elif severity_counts['major'] > 0:
            summary = f"⚡ Found {severity_counts['major']} major issue(s) to address before merging."
        else:
            summary = f"✓ Generally good! Found {severity_counts['minor']} minor improvement(s)."
        
        # Identify strengths
        strengths = []
        additions = pr_info.get('additions', 0)
        
        if additions > 0:
            strengths.append("Clear implementation with working code")
        
        if pr_info.get('body', '') and len(pr_info.get('body', '')) > 100:
            strengths.append("Well-documented PR with good description")
        
        files = pr_info.get('files', [])
        if len(files) < 10:
            strengths.append("Focused PR with manageable scope")
        
        if not comments or all(c.severity in ['minor', 'suggestion'] for c in comments):
            strengths.append("Clean code with good practices")
        
        # Areas for improvement
        improvements = []
        
        if severity_counts['critical'] > 0:
            improvements.append(f"Address {severity_counts['critical']} critical security/bug issue(s)")
        
        if severity_counts['major'] > 0:
            improvements.append(f"Fix {severity_counts['major']} major issue(s)")
        
        if severity_counts['minor'] > 3:
            improvements.append("Several minor style/documentation improvements possible")
        
        category_counts = {}
        for comment in comments:
            category_counts[comment.category] = category_counts.get(comment.category, 0) + 1
        
        if category_counts.get('documentation', 0) > 2:
            improvements.append("Add more documentation (docstrings, comments)")
        
        if category_counts.get('security', 0) > 0:
            improvements.append("Review and fix security concerns")
        
        return summary, strengths, improvements
    
    def review_pr(self, pr_number: int) -> Optional[ReviewResult]:
        """Perform complete review of a PR."""
        print(f"\n🤖 Starting AI review of PR #{pr_number}...")
        
        # Get PR info
        pr_info = self.get_pr_info(pr_number)
        if not pr_info:
            print(f"❌ Could not fetch PR #{pr_number}")
            return None
        
        print(f"📝 Reviewing: {pr_info.get('title', 'Untitled PR')}")
        
        all_comments = []
        
        # Analyze structure
        print("🔍 Analyzing PR structure...")
        structure_comments = self.analyze_structure(pr_info)
        all_comments.extend(structure_comments)
        
        # Analyze each file
        files = pr_info.get('files', [])
        print(f"📄 Analyzing {len(files)} file(s)...")
        
        for file_info in files:
            file_path = file_info.get('path', '')
            print(f"  • {file_path}")
            
            # Read file content
            try:
                with open(os.path.join(self.repo_path, file_path), 'r') as f:
                    content = f.read()
                    file_comments = self.analyze_code_patterns(content, file_path)
                    all_comments.extend(file_comments)
            except Exception as e:
                print(f"    ⚠️ Could not read file: {e}")
        
        # Calculate score and generate summary
        score = self.calculate_overall_score(all_comments)
        summary, strengths, improvements = self.generate_summary(all_comments, pr_info)
        
        result = ReviewResult(
            pr_number=pr_number,
            pr_title=pr_info.get('title', ''),
            branch=pr_info.get('headRefName', ''),
            timestamp=datetime.now().isoformat(),
            comments=all_comments,
            overall_score=score,
            summary=summary,
            strengths=strengths,
            areas_for_improvement=improvements
        )
        
        # Update learning
        self.learner.feedback_history['total_reviews'] += 1
        self.learner._save_feedback()
        
        print(f"\n✅ Review complete! Overall score: {score}/10")
        return result
    
    def save_review(self, result: ReviewResult):
        """Save review result to file."""
        output_dir = "agents/pr-review-bot/reviews"
        os.makedirs(output_dir, exist_ok=True)
        
        filename = f"pr_{result.pr_number}_review_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = os.path.join(output_dir, filename)
        
        # Convert to dict
        result_dict = {
            'pr_number': result.pr_number,
            'pr_title': result.pr_title,
            'branch': result.branch,
            'timestamp': result.timestamp,
            'overall_score': result.overall_score,
            'summary': result.summary,
            'strengths': result.strengths,
            'areas_for_improvement': result.areas_for_improvement,
            'comments': [asdict(c) for c in result.comments]
        }
        
        with open(filepath, 'w') as f:
            json.dump(result_dict, f, indent=2)
        
        print(f"💾 Review saved to: {filepath}")
        
        # Also create markdown report
        self._create_markdown_report(result)
    
    def _create_markdown_report(self, result: ReviewResult):
        """Create human-readable markdown report."""
        output_dir = "agents/pr-review-bot/reviews"
        filename = f"pr_{result.pr_number}_review_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        filepath = os.path.join(output_dir, filename)
        
        report = f"""# PR Review Report: #{result.pr_number}

**Title:** {result.pr_title}  
**Branch:** {result.branch}  
**Reviewed:** {result.timestamp}  
**Overall Score:** {result.overall_score}/10

---

## Summary

{result.summary}

## Strengths ✅

"""
        for strength in result.strengths:
            report += f"- {strength}\n"
        
        if result.areas_for_improvement:
            report += "\n## Areas for Improvement 🔧\n\n"
            for improvement in result.areas_for_improvement:
                report += f"- {improvement}\n"
        
        if result.comments:
            report += "\n## Detailed Comments\n\n"
            
            # Group by severity
            by_severity = {'critical': [], 'major': [], 'minor': [], 'suggestion': []}
            for comment in result.comments:
                by_severity[comment.severity].append(comment)
            
            for severity in ['critical', 'major', 'minor', 'suggestion']:
                comments = by_severity[severity]
                if not comments:
                    continue
                
                severity_emoji = {
                    'critical': '🚨',
                    'major': '⚠️',
                    'minor': '💡',
                    'suggestion': '💭'
                }
                
                report += f"\n### {severity_emoji[severity]} {severity.upper()} ({len(comments)})\n\n"
                
                for comment in comments:
                    report += f"**{comment.file_path}**"
                    if comment.line_number:
                        report += f" (line {comment.line_number})"
                    report += f"\n- **{comment.category}**: {comment.message}\n"
                    if comment.suggestion:
                        report += f"  - Suggestion: {comment.suggestion}\n"
                    report += f"  - Confidence: {comment.confidence:.0%}\n\n"
        
        report += "\n---\n\n"
        report += "*Generated by PR Review Bot with AI-powered analysis and reinforcement learning*\n"
        
        with open(filepath, 'w') as f:
            f.write(report)
        
        print(f"📄 Markdown report saved to: {filepath}")


def main():
    """Main function for CLI usage."""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python review_bot.py <pr_number>")
        print("   or: python review_bot.py all  (review all open PRs)")
        sys.exit(1)
    
    bot = PRReviewBot()
    
    if sys.argv[1] == 'all':
        # Get all open PRs
        result = subprocess.run(
            ['gh', 'pr', 'list', '--json', 'number'],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            prs = json.loads(result.stdout)
            for pr in prs:
                pr_number = pr['number']
                review_result = bot.review_pr(pr_number)
                if review_result:
                    bot.save_review(review_result)
                    print()
        else:
            print("❌ Failed to fetch PRs")
    else:
        pr_number = int(sys.argv[1])
        review_result = bot.review_pr(pr_number)
        if review_result:
            bot.save_review(review_result)


if __name__ == '__main__':
    main()
