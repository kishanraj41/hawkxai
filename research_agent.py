"""
Research Agent - A powerful AI-powered research assistant
Searches the web, fetches content, and organizes research findings.
"""

import os
import json
import requests
import logging
from datetime import datetime
from typing import List, Dict, Optional
from urllib.parse import quote_plus
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s: %(message)s'
)


class ResearchAgent:
    """Main Research Agent class for conducting web research and analysis."""
    
    def __init__(self, output_dir: str = "research_output"):
        """
        Initialize the Research Agent.
        
        Args:
            output_dir: Directory to store research outputs
        """
        self.output_dir = output_dir
        self.research_history = []
        self._ensure_output_dir()
        
    def _ensure_output_dir(self):
        """Create output directory if it doesn't exist."""
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
            
    def search_web(self, query: str, num_results: int = 5) -> List[Dict]:
        """
        Search the web using DuckDuckGo's API.
        
        Args:
            query: Search query string
            num_results: Number of results to return
            
        Returns:
            List of search results with title, url, and snippet
        """
        logging.info(f"🔍 Searching for: {query}")
        
        # Using DuckDuckGo HTML search (no API key needed)
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            # DuckDuckGo instant answer API
            url = f"https://api.duckduckgo.com/?q={quote_plus(query)}&format=json"
            response = requests.get(url, headers=headers, timeout=10)
            
            results = []
            if response.status_code == 200:
                data = response.json()
                
                # Extract related topics
                if data.get('RelatedTopics'):
                    for topic in data['RelatedTopics'][:num_results]:
                        if isinstance(topic, dict) and 'Text' in topic:
                            results.append({
                                'title': topic.get('Text', '')[:100],
                                'url': topic.get('FirstURL', ''),
                                'snippet': topic.get('Text', '')
                            })
                
                # If we got results, add abstract as first result
                if data.get('Abstract') and data.get('AbstractURL'):
                    results.insert(0, {
                        'title': data.get('Heading', query),
                        'url': data.get('AbstractURL', ''),
                        'snippet': data.get('Abstract', '')
                    })
                    
            # Fallback: create a result indicating search completed
            if not results:
                results = [{
                    'title': f'Search completed for: {query}',
                    'url': f'https://duckduckgo.com/?q={quote_plus(query)}',
                    'snippet': 'Search query processed. Visit DuckDuckGo for full results.'
                }]
                
            logging.info(f"✅ Found {len(results)} results")
            return results[:num_results]
            
        except Exception as e:
            logging.warning(f"⚠️ Search error: {str(e)}")
            return [{
                'title': f'Search for: {query}',
                'url': f'https://duckduckgo.com/?q={quote_plus(query)}',
                'snippet': 'Search completed. Visit link for results.',
                'error': str(e)
            }]
    
    def fetch_content(self, url: str) -> Optional[str]:
        """
        Fetch and extract main content from a URL.
        
        Args:
            url: URL to fetch content from
            
        Returns:
            Extracted text content or None if failed
        """
        logging.info(f"📥 Fetching content from: {url}")
        
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=15)
            response.raise_for_status()
            
            # Basic text extraction (in production, use BeautifulSoup or newspaper3k)
            content = response.text[:5000]  # Limit content size
            logging.info(f"✅ Fetched {len(content)} characters")
            return content
            
        except Exception as e:
            logging.warning(f"⚠️ Fetch error: {str(e)}")
            return None
    
    def research_topic(self, topic: str, depth: int = 3) -> Dict:
        """
        Conduct comprehensive research on a topic.
        
        Args:
            topic: Topic to research
            depth: Number of search results to analyze
            
        Returns:
            Research report dictionary
        """
        logging.info(f"\n🎯 Starting research on: {topic}\n")
        
        timestamp = datetime.now().isoformat()
        research_data = {
            'topic': topic,
            'timestamp': timestamp,
            'search_results': [],
            'sources': []
        }
        
        # Phase 1: Search
        search_results = self.search_web(topic, num_results=depth)
        research_data['search_results'] = search_results
        
        # Phase 2: Fetch content from top results
        for idx, result in enumerate(search_results[:depth], 1):
            logging.info(f"\n📄 Processing source {idx}/{depth}")
            
            source = {
                'title': result['title'],
                'url': result['url'],
                'snippet': result['snippet'],
                'content_preview': None
            }
            
            # Fetch full content
            if result['url']:
                content = self.fetch_content(result['url'])
                if content:
                    source['content_preview'] = content[:1000]
            
            research_data['sources'].append(source)
            time.sleep(1)  # Be respectful to servers
        
        # Phase 3: Generate summary
        research_data['summary'] = self._generate_summary(research_data)
        
        # Save research
        self._save_research(research_data)
        self.research_history.append(research_data)
        
        logging.info(f"\n✅ Research completed! Results saved to {self.output_dir}")
        return research_data
    
    def _generate_summary(self, research_data: Dict) -> str:
        """Generate a summary of research findings."""
        topic = research_data['topic']
        num_sources = len(research_data['sources'])
        
        summary = f"Research Summary for '{topic}'\n"
        summary += f"{'=' * 50}\n\n"
        summary += f"Total sources analyzed: {num_sources}\n"
        summary += f"Research conducted: {research_data['timestamp']}\n\n"
        
        summary += "Key Sources:\n"
        for idx, source in enumerate(research_data['sources'], 1):
            summary += f"\n{idx}. {source['title']}\n"
            summary += f"   URL: {source['url']}\n"
            summary += f"   Summary: {source['snippet'][:200]}...\n"
        
        return summary
    
    def _save_research(self, research_data: Dict):
        """Save research data to JSON file."""
        timestamp = research_data['timestamp'].replace(':', '-').replace('.', '-')
        filename = f"research_{timestamp}.json"
        filepath = os.path.join(self.output_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(research_data, f, indent=2, ensure_ascii=False)
        
        # Also save human-readable summary
        summary_file = filepath.replace('.json', '_summary.txt')
        with open(summary_file, 'w', encoding='utf-8') as f:
            f.write(research_data['summary'])
    
    def list_research_history(self) -> List[Dict]:
        """
        List all past research sessions.
        
        Returns:
            List of research session summaries
        """
        research_files = [f for f in os.listdir(self.output_dir) if f.endswith('.json')]
        history = []
        
        for filename in sorted(research_files, reverse=True):
            filepath = os.path.join(self.output_dir, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                history.append({
                    'topic': data['topic'],
                    'timestamp': data['timestamp'],
                    'num_sources': len(data['sources']),
                    'filename': filename
                })
        
        return history
    
    def ask_question(self, question: str) -> str:
        """
        Answer a question using research capabilities.
        
        Args:
            question: Question to answer
            
        Returns:
            Answer based on web research
        """
        logging.info(f"\n❓ Question: {question}\n")
        
        # Research the question
        research = self.research_topic(question, depth=3)
        
        # Formulate answer
        answer = f"Based on research from {len(research['sources'])} sources:\n\n"
        
        for idx, source in enumerate(research['sources'], 1):
            answer += f"{idx}. {source['title']}\n"
            answer += f"   {source['snippet'][:200]}...\n"
            answer += f"   Source: {source['url']}\n\n"
        
        return answer


def main():
    """Example usage of the Research Agent."""
    print("🤖 Research Agent Starting...\n")
    
    agent = ResearchAgent()
    
    # Example 1: Research a topic
    topic = "artificial intelligence latest developments"
    research = agent.research_topic(topic, depth=3)
    
    print("\n" + "="*60)
    print(research['summary'])
    print("="*60)
    
    # Example 2: Ask a question
    question = "What is machine learning?"
    answer = agent.ask_question(question)
    print(f"\n{answer}")
    
    # Example 3: Show research history
    print("\n📚 Research History:")
    history = agent.list_research_history()
    for item in history:
        print(f"  - {item['topic']} ({item['timestamp']}) - {item['num_sources']} sources")


if __name__ == "__main__":
    main()
