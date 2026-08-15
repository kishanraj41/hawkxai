#!/usr/bin/env python3
"""
Example usage of the Research Agent
Demonstrates various ways to use the research agent programmatically
"""

from research_agent import ResearchAgent


def example_basic_research():
    """Example: Basic research on a topic"""
    print("="*60)
    print("Example 1: Basic Research")
    print("="*60)
    
    agent = ResearchAgent()
    research = agent.research_topic("Python programming best practices", depth=3)
    
    print("\n📊 Research Results:")
    print(f"Topic: {research['topic']}")
    print(f"Sources found: {len(research['sources'])}")
    print(f"\nSummary:\n{research['summary']}")


def example_web_search():
    """Example: Simple web search"""
    print("\n" + "="*60)
    print("Example 2: Web Search")
    print("="*60)
    
    agent = ResearchAgent()
    results = agent.search_web("artificial intelligence 2026", num_results=5)
    
    print("\n🔍 Search Results:")
    for idx, result in enumerate(results, 1):
        print(f"\n{idx}. {result['title']}")
        print(f"   URL: {result['url']}")
        print(f"   Snippet: {result['snippet'][:150]}...")


def example_question_answering():
    """Example: Ask a question"""
    print("\n" + "="*60)
    print("Example 3: Question Answering")
    print("="*60)
    
    agent = ResearchAgent()
    question = "What are the benefits of cloud computing?"
    answer = agent.ask_question(question)
    
    print(f"\n❓ Question: {question}")
    print(f"\n💡 Answer:\n{answer}")


def example_fetch_content():
    """Example: Fetch content from a URL"""
    print("\n" + "="*60)
    print("Example 4: Fetch Content")
    print("="*60)
    
    agent = ResearchAgent()
    url = "https://www.python.org"
    content = agent.fetch_content(url)
    
    if content:
        print(f"\n📄 Fetched content from {url}")
        print(f"Content length: {len(content)} characters")
        print(f"Preview:\n{content[:500]}...")


def example_research_history():
    """Example: View research history"""
    print("\n" + "="*60)
    print("Example 5: Research History")
    print("="*60)
    
    agent = ResearchAgent()
    history = agent.list_research_history()
    
    if history:
        print(f"\n📚 Found {len(history)} past research sessions:")
        for item in history:
            print(f"\n  Topic: {item['topic']}")
            print(f"  Date: {item['timestamp']}")
            print(f"  Sources: {item['num_sources']}")
    else:
        print("\n📚 No research history found yet.")


def example_custom_output_dir():
    """Example: Use custom output directory"""
    print("\n" + "="*60)
    print("Example 6: Custom Output Directory")
    print("="*60)
    
    agent = ResearchAgent(output_dir="my_research")
    research = agent.research_topic("machine learning trends", depth=2)
    
    print(f"\n✅ Research saved to: {agent.output_dir}")


def main():
    """Run all examples"""
    print("\n🤖 Research Agent - Example Usage\n")
    
    try:
        # Run examples
        example_basic_research()
        example_web_search()
        example_question_answering()
        example_fetch_content()
        example_research_history()
        example_custom_output_dir()
        
        print("\n" + "="*60)
        print("✅ All examples completed!")
        print("="*60)
        
    except KeyboardInterrupt:
        print("\n\n⚠️ Examples interrupted by user")
    except Exception as e:
        print(f"\n❌ Error running examples: {str(e)}")


if __name__ == "__main__":
    main()
