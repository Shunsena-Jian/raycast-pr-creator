import json
import os
import sys
from pathlib import Path
from typing import Any, Dict

CONFIG_FILENAME = ".pr_creator_config.json"

def manual_load_env():
    """
    Manually load .env file from the current directory if it exists.
    This is used as a fallback if python-dotenv is not installed.
    """
    env_path = Path.cwd() / ".env"
    if env_path.exists():
        try:
            with open(env_path, "r") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        key, value = line.split("=", 1)
                        # Remove quotes if present
                        value = value.strip().strip("'\"")
                        if key.strip() not in os.environ:
                            os.environ[key.strip()] = value
        except Exception as e:
            print(f"Warning: Failed to load .env file: {e}", file=sys.stderr)

def load_config() -> Dict[str, Any]:
    """
    Load configuration from:
    1. .env file (manual load)
    2. Check current directory
    3. Check user home directory
    4. Return defaults if nothing found
    """
    manual_load_env()
    
    defaults = {
        "default_target_branch": "main",
        "jira_project_keys": [],
        "reviewer_groups": {},
        "github_user_map": {},
        "ignored_authors": [],
        "jira_base_url": "https://qualitytrade.atlassian.net/browse/",
        "personalized_reviewers": [],
        "slack_webhook_url": "",
        "slack_user_map": {},
        "code_review_channel": ""
    }

    # Search paths: Current dir, Home dir
    search_paths = [
        Path.cwd() / CONFIG_FILENAME,
        Path.home() / CONFIG_FILENAME
    ]

    for path in search_paths:
        if path.exists():
            try:
                with open(path, "r") as f:
                    user_config = json.load(f)
                    # Use update to merge, but ensure defaults are respected
                    for key, value in user_config.items():
                        defaults[key] = value
                    return defaults
            except json.JSONDecodeError:
                print(f"Warning: Failed to parse config file at {path}. Using defaults.", file=sys.stderr)
    
    return defaults

def save_config(config_dict: Dict[str, Any]):
    """
    Saves the configuration to .pr_creator_config.json in the current directory.
    """
    target_path = Path.cwd() / CONFIG_FILENAME
    
    # Load existing to merge if necessary, or just overwrite if it's meant to be full
    current_config = {}
    if target_path.exists():
        try:
            with open(target_path, "r") as f:
                current_config = json.load(f)
        except json.JSONDecodeError:
            pass
            
    current_config.update(config_dict)
    
    try:
        with open(target_path, "w") as f:
            json.dump(current_config, f, indent=4)
        print(f"Saved configuration to {target_path}", file=sys.stderr)
    except OSError as e:
        print(f"Warning: Failed to save config: {e}", file=sys.stderr)

def add_to_user_map(email: str, handle: str):
    """
    Updates the github_user_map in the config file.
    Prioritizes updating local config if it exists, otherwise home config.
    Creates home config if neither exists.
    """
    local_config = Path.cwd() / CONFIG_FILENAME
    home_config = Path.home() / CONFIG_FILENAME
    
    target_path = home_config
    if local_config.exists():
        target_path = local_config
    elif home_config.exists():
        target_path = home_config
        
    current_config = {}
    if target_path.exists():
        try:
            with open(target_path, "r") as f:
                current_config = json.load(f)
        except json.JSONDecodeError:
            pass # Start fresh if corrupt
            
    if "github_user_map" not in current_config:
        current_config["github_user_map"] = {}
        
    current_config["github_user_map"][email] = handle
    
    try:
        with open(target_path, "w") as f:
            json.dump(current_config, f, indent=4)
        print(f"Saved mapping for {email} to {target_path}", file=sys.stderr)
    except OSError as e:
        print(f"Warning: Failed to save config: {e}", file=sys.stderr)
