"""
Configuration settings for the Research Agent
"""

import os

# Output settings
DEFAULT_OUTPUT_DIR = "research_output"
MAX_CONTENT_SIZE = 5000  # Maximum characters to fetch from a URL
MAX_SNIPPET_LENGTH = 200  # Maximum length for text snippets

# Search settings
DEFAULT_SEARCH_RESULTS = 5
DEFAULT_RESEARCH_DEPTH = 3

# Network settings
REQUEST_TIMEOUT = 15  # seconds
RATE_LIMIT_DELAY = 1  # seconds between requests

# User agent for web requests
USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

# API endpoints
DUCKDUCKGO_API = "https://api.duckduckgo.com/"

# File settings
RESEARCH_FILE_PREFIX = "research_"
SUMMARY_FILE_SUFFIX = "_summary.txt"
