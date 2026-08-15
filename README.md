# Research Agent 🤖

An intelligent AI-powered research assistant that searches the web, fetches content, and organizes research findings.

## Features

- 🔍 **Web Search**: Search the web using DuckDuckGo API (no API key needed)
- 📥 **Content Fetching**: Fetch and extract content from URLs
- 📊 **Comprehensive Research**: Conduct multi-source research on any topic
- 💡 **Question Answering**: Ask questions and get researched answers
- 📚 **Research History**: Track and review past research sessions
- 💾 **Auto-Save**: Automatically save all research to JSON and text files
- 🎯 **CLI & Library**: Use as a command-line tool or Python library

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd grokhackx
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Quick Start

### As a Command-Line Tool

```bash
# Research a topic
python cli.py research "artificial intelligence trends"

# Search the web
python cli.py search "python best practices" --results 10

# Ask a question
python cli.py ask "what is machine learning?"

# View research history
python cli.py history

# Fetch content from a URL
python cli.py fetch https://example.com/article
```

### As a Python Library

```python
from research_agent import ResearchAgent

# Create an agent
agent = ResearchAgent()

# Research a topic
research = agent.research_topic("quantum computing", depth=3)
print(research['summary'])

# Search the web
results = agent.search_web("python tutorials", num_results=5)

# Ask a question
answer = agent.ask_question("What is cloud computing?")
print(answer)

# View research history
history = agent.list_research_history()
```

## Usage Examples

Run the example script to see all features in action:

```bash
python example_usage.py
```

Or run the built-in demo:

```bash
python research_agent.py
```

## Project Structure

```
grokhackx/
├── research_agent.py    # Main research agent library
├── cli.py              # Command-line interface
├── config.py           # Configuration settings
├── example_usage.py    # Usage examples
├── requirements.txt    # Python dependencies
├── README.md          # This file
└── research_output/   # Auto-generated research files (gitignored)
```

## CLI Commands

### Research Command
Conduct comprehensive research on a topic:
```bash
python cli.py research "topic" --depth 3
```

Options:
- `--depth`: Number of sources to analyze (default: 3)
- `--output-dir`: Custom output directory

### Search Command
Search the web:
```bash
python cli.py search "query" --results 5
```

Options:
- `--results`: Number of results to return (default: 5)

### Ask Command
Ask a question and get a researched answer:
```bash
python cli.py ask "your question here"
```

### History Command
View past research sessions:
```bash
python cli.py history
```

### Fetch Command
Fetch content from a URL:
```bash
python cli.py fetch https://example.com
```

## API Reference

### ResearchAgent Class

#### `__init__(output_dir='research_output')`
Initialize the research agent.

#### `search_web(query, num_results=5)`
Search the web for a query.

#### `fetch_content(url)`
Fetch and extract content from a URL.

#### `research_topic(topic, depth=3)`
Conduct comprehensive research on a topic.

#### `ask_question(question)`
Answer a question using research capabilities.

#### `list_research_history()`
List all past research sessions.

## Output Format

Research results are automatically saved in two formats:

1. **JSON file**: Complete research data including all sources and metadata
2. **Text summary**: Human-readable summary of findings

Files are saved to `research_output/` by default.

## Configuration

Edit `config.py` to customize:
- Output directory
- Search result limits
- Request timeouts
- Content size limits
- And more...

## Requirements

- Python 3.7+
- requests library

## How It Works

1. **Search Phase**: Queries DuckDuckGo API for relevant sources
2. **Fetch Phase**: Retrieves content from top search results
3. **Analysis Phase**: Organizes and summarizes findings
4. **Save Phase**: Stores research in JSON and text formats

## Features in Detail

### Web Search
Uses DuckDuckGo's free API to search the web without requiring API keys. Returns titles, URLs, and snippets for each result.

### Content Fetching
Fetches full content from URLs with proper error handling and rate limiting to be respectful to web servers.

### Research Reports
Generates comprehensive research reports including:
- Search query and timestamp
- List of sources with URLs
- Content previews from each source
- Human-readable summary

### Research History
Maintains a history of all research sessions with easy access to past research data.

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## License

See LICENSE file for details.

## Tips

- Start with a depth of 3-5 sources for most research tasks
- Use specific search queries for better results
- Check `research_output/` directory for saved research
- Use the CLI for quick tasks, the library for integration

## Future Enhancements

Potential improvements:
- Additional search engines (Google, Bing)
- Advanced content extraction (BeautifulSoup, newspaper3k)
- AI-powered summarization
- PDF and document support
- Citation management
- Export to various formats (PDF, Markdown, HTML)

---

Built with ❤️ for researchers, students, and knowledge seekers