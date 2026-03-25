import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict

CONFIG_FILENAME = ".pr_creator_config.json"

def load_config() -> Dict[str, Any]:
    """
    Load configuration from:
    1. Check current directory
    2. Check user home directory
    3. Return defaults if nothing found
    """
    defaults = {
        "default_target_branch": "main",
        "jira_project_keys": [],
        "reviewer_groups": {},
        "github_user_map": {},
        "ignored_authors": [],
        "jira_base_url": "https://qualitytrade.atlassian.net/browse/",
        "personalized_reviewers": []
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
                logging.warning(f"Failed to parse config file at {path}. Using defaults.")
    
    return defaults

def save_config(config_dict: Dict[str, Any]) -> None:
    """
    Saves the configuration to .pr_creator_config.json in the current directory.

    Args:
        config_dict: Dictionary containing configuration values to save.
    """
    target_path = Path.cwd() / CONFIG_FILENAME

    # Load existing to merge if necessary, or just overwrite if it's meant to be full
    current_config: Dict[str, Any] = {}
    if target_path.exists():
        try:
            with open(target_path, "r") as f:
                current_config = json.load(f)
        except json.JSONDecodeError:
            logging.warning(f"Failed to parse existing config at {target_path}. Starting fresh.")

    current_config.update(config_dict)

    try:
        with open(target_path, "w") as f:
            json.dump(current_config, f, indent=4)
        logging.info(f"Saved configuration to {target_path}")
    except OSError as e:
        logging.warning(f"Failed to save config: {e}")

def add_to_user_map(email: str, handle: str) -> None:
    """
    Updates the github_user_map in the config file.

    Prioritizes updating local config if it exists, otherwise home config.
    Creates home config if neither exists.

    Args:
        email: The git email address to map.
        handle: The GitHub username to map to.
    """
    local_config = Path.cwd() / CONFIG_FILENAME
    home_config = Path.home() / CONFIG_FILENAME

    target_path = home_config
    if local_config.exists():
        target_path = local_config
    elif home_config.exists():
        target_path = home_config

    current_config: Dict[str, Any] = {}
    if target_path.exists():
        try:
            with open(target_path, "r") as f:
                current_config = json.load(f)
        except json.JSONDecodeError:
            logging.warning(f"Failed to parse config at {target_path}. Starting fresh.")

    if "github_user_map" not in current_config:
        current_config["github_user_map"] = {}

    current_config["github_user_map"][email] = handle

    try:
        with open(target_path, "w") as f:
            json.dump(current_config, f, indent=4)
        logging.info(f"Saved mapping for {email} to {target_path}")
    except OSError as e:
        logging.warning(f"Failed to save config: {e}")
