#!/usr/bin/env python3
"""
Research Agent CLI - Command-line interface for the research agent
"""

import argparse
import sys
from research_agent import ResearchAgent


def main():
    parser = argparse.ArgumentParser(
        description='Research Agent - AI-powered research assistant',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s research "machine learning trends 2026"
  %(prog)s search "python best practices" --results 10
  %(prog)s ask "what is quantum computing?"
  %(prog)s history
  %(prog)s fetch https://example.com/article
        """
    )
    
    parser.add_argument(
        '--output-dir',
        default='research_output',
        help='Directory to store research outputs (default: research_output)'
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Research command
    research_parser = subparsers.add_parser(
        'research',
        help='Conduct comprehensive research on a topic'
    )
    research_parser.add_argument('topic', help='Topic to research')
    research_parser.add_argument(
        '--depth',
        type=int,
        default=3,
        help='Number of sources to analyze (default: 3)'
    )
    
    # Search command
    search_parser = subparsers.add_parser(
        'search',
        help='Search the web for a query'
    )
    search_parser.add_argument('query', help='Search query')
    search_parser.add_argument(
        '--results',
        type=int,
        default=5,
        help='Number of results to return (default: 5)'
    )
    
    # Ask command
    ask_parser = subparsers.add_parser(
        'ask',
        help='Ask a question and get a researched answer'
    )
    ask_parser.add_argument('question', help='Question to answer')
    
    # History command
    subparsers.add_parser(
        'history',
        help='List past research sessions'
    )
    
    # Fetch command
    fetch_parser = subparsers.add_parser(
        'fetch',
        help='Fetch and display content from a URL'
    )
    fetch_parser.add_argument('url', help='URL to fetch content from')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Initialize agent
    agent = ResearchAgent(output_dir=args.output_dir)
    
    # Execute command
    try:
        if args.command == 'research':
            research = agent.research_topic(args.topic, depth=args.depth)
            print("\n" + "="*60)
            print(research['summary'])
            print("="*60)
            
        elif args.command == 'search':
            results = agent.search_web(args.query, num_results=args.results)
            print(f"\n🔍 Search Results for: {args.query}\n")
            for idx, result in enumerate(results, 1):
                print(f"{idx}. {result['title']}")
                print(f"   URL: {result['url']}")
                print(f"   {result['snippet'][:200]}...")
                print()
                
        elif args.command == 'ask':
            answer = agent.ask_question(args.question)
            print(f"\n💡 Answer:\n{answer}")
            
        elif args.command == 'history':
            history = agent.list_research_history()
            if not history:
                print("\n📚 No research history found.")
            else:
                print(f"\n📚 Research History ({len(history)} sessions):\n")
                for idx, item in enumerate(history, 1):
                    print(f"{idx}. {item['topic']}")
                    print(f"   Date: {item['timestamp']}")
                    print(f"   Sources: {item['num_sources']}")
                    print(f"   File: {item['filename']}")
                    print()
                    
        elif args.command == 'fetch':
            content = agent.fetch_content(args.url)
            if content:
                print(f"\n📄 Content from {args.url}:\n")
                print(content[:2000])
                if len(content) > 2000:
                    print("\n... (content truncated)")
            else:
                print(f"\n⚠️ Failed to fetch content from {args.url}")
                sys.exit(1)
                
    except KeyboardInterrupt:
        print("\n\n⚠️ Interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
