import subprocess
import re
import sys
from typing import List, Optional

def clear_screen() -> None:
    """Clear the terminal screen."""
    print("\033[H\033[J", end="")

def print_colored(text: str, color: str = "green") -> None:
    """
    Simple ANSI color printer. 
    Colors: green, red, yellow, cyan, bold
    """
    colors = {
        "green": "\033[92m",
        "red": "\033[91m",
        "yellow": "\033[93m",
        "cyan": "\033[96m",
        "bold": "\033[1m",
        "reset": "\033[0m"
    }
    prefix = colors.get(color, "")
    print(f"{prefix}{text}{colors['reset']}", file=sys.stderr)

def run_cmd(cmd: List[str], check: bool = True, capture: bool = False) -> subprocess.CompletedProcess:
    """Run a subprocess command safely."""
    return subprocess.run(cmd, check=check, capture_output=capture, text=True)

def extract_jira_id(input_str: str) -> Optional[str]:
    """
    Extract JIRA ticket ID (e.g. PROJ-123) from a string or URL.
    Returns None if no valid ticket ID is found.
    """
    input_str = input_str.strip()
    
    # Match something like /browse/PROJ-123 or just PROJ-123
    # We look for [A-Z]+ followed by a dash and digits.
    # We avoid matching version numbers or other IDs in URLs.
    match = re.search(r'(?<=browse/)([A-Z]+-\d+)', input_str, re.IGNORECASE)
    if not match:
        # If not in browse/ URL, check if the whole string is a ticket ID
        # or if it's a simple string containing a ticket ID.
        match = re.search(r'\b([A-Z]+-\d+)\b', input_str, re.IGNORECASE)
        
    if match:
        return match.group(1).upper()
    
    return None

def normalize_jira_link(ticket_input: str, base_url: str) -> str:
    """Convert ticket ID or URL to a markdown link with ID or fallback as label."""
    ticket_id = extract_jira_id(ticket_input)
    
    if ticket_id:
        # Ensure base_url ends with slash
        if not base_url.endswith("/"):
            base_url += "/"
        url = ticket_input if ticket_input.startswith("http") else f"{base_url}{ticket_id}"
        return f"[{ticket_id}]({url})"
    
    # Fallback for non-ticket URLs
    if ticket_input.startswith("http"):
        label = "[Link]"
        if "release" in ticket_input.lower():
            label = "[Release]"
        elif "version" in ticket_input.lower():
            label = "[Version]"
        return f"{label}({ticket_input})"
        
    return ticket_input
