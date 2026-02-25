import os
import re
from pathlib import Path
from typing import List, Optional

def parse_codeowners(content: str) -> List[tuple[str, List[str]]]:
    """Parse CODEOWNERS content into a list of (pattern, owners) tuples."""
    rules = []
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        parts = line.split()
        if len(parts) >= 2:
            pattern = parts[0]
            owners = parts[1:]
            rules.append((pattern, owners))
    return rules

def get_codeowners_content() -> Optional[str]:
    """Check common locations for a CODEOWNERS file and read it."""
    locations = ['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS']
    for p in locations:
        if os.path.isfile(p):
            try:
                with open(p, 'r') as f:
                    return f.read()
            except Exception:
                pass
    return None

def match_pattern(path: str, pattern: str) -> bool:
    """Basic matching for CODEOWNERS patterns."""
    import fnmatch
    
    # Clean pattern
    orig_pattern = pattern
    
    # If it starts with '/', it matches from the root
    root_match = False
    if pattern.startswith('/'):
        root_match = True
        pattern = pattern[1:]
        
    # If it ends with '/', it's a directory match
    is_dir = False
    if pattern.endswith('/'):
        is_dir = True
        pattern = pattern[:-1]

    # Convert CODEOWNERS rules to fnmatch globs
    if not root_match:
        # If it doesn't start with /, it can match anywhere
        if not pattern.startswith('*'):
            pattern = f"*{pattern}"
    
    if is_dir:
        # Directory match means it matches the directory or anything inside it
        return fnmatch.fnmatch(path, pattern) or fnmatch.fnmatch(path, f"{pattern}/*")
    
    # Standard file/glob match
    return fnmatch.fnmatch(path, pattern)

def get_owners_for_files(changed_files: List[str], valid_reviewers: List[str]) -> List[str]:
    """
    Get the CODEOWNERS for a list of changed files, filtering by valid_reviewers map.
    The rules are evaluated top-to-bottom, with the last matching rule taking precedence.
    """
    content = get_codeowners_content()
    if not content:
        return []
        
    rules = parse_codeowners(content)
    if not rules:
        return []

    matched_owners_set = set()
    
    # We want to match case-insensitively for simplicity when comparing to valid_reviewers
    valid_reviewers_lower = {r.lower(): r for r in valid_reviewers}

    for file_path in changed_files:
        if not file_path: continue
        
        file_owners = []
        # Last matching rule takes precedence
        for pattern, owners in rules:
            if match_pattern(file_path, pattern):
                file_owners = owners
                
        # Add to the set
        for owner in file_owners:
            # Strip leading @ from GitHub handles
            clean_owner = owner.lstrip('@')
            
            # Filter against personalized config if applicable
            if not valid_reviewers:
                matched_owners_set.add(clean_owner)
            elif clean_owner.lower() in valid_reviewers_lower:
                matched_owners_set.add(valid_reviewers_lower[clean_owner.lower()])

    return list(matched_owners_set)
