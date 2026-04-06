import json
import logging
from pathlib import Path
from typing import Any, Dict

CONFIG_FILENAME = ".pr_creator_config.json"


def _normalize_string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, str)]


def _normalize_string_map(value: object) -> dict[str, str]:
    if not isinstance(value, dict):
        return {}

    normalized: dict[str, str] = {}
    for key, item in value.items():
        if isinstance(key, str) and isinstance(item, str):
            normalized[key] = item
    return normalized


def _merge_config(base: Dict[str, Any], user_config: object) -> Dict[str, Any]:
    if not isinstance(user_config, dict):
        logging.warning("Config file must contain a JSON object. Using defaults.")
        return base

    merged = dict(base)
    default_target_branch = user_config.get("default_target_branch")
    jira_base_url = user_config.get("jira_base_url")

    merged["default_target_branch"] = (
        default_target_branch
        if isinstance(default_target_branch, str) and default_target_branch
        else base["default_target_branch"]
    )
    merged["jira_project_keys"] = _normalize_string_list(
        user_config.get("jira_project_keys")
    )
    merged["reviewer_groups"] = (
        user_config.get("reviewer_groups")
        if isinstance(user_config.get("reviewer_groups"), dict)
        else {}
    )
    merged["github_user_map"] = _normalize_string_map(
        user_config.get("github_user_map")
    )
    merged["ignored_authors"] = _normalize_string_list(
        user_config.get("ignored_authors")
    )
    merged["jira_base_url"] = (
        jira_base_url
        if isinstance(jira_base_url, str) and jira_base_url
        else base["jira_base_url"]
    )
    merged["personalized_reviewers"] = _normalize_string_list(
        user_config.get("personalized_reviewers")
    )
    return merged


def load_config() -> Dict[str, Any]:
    """
    Load configuration from home directory only for security.
    Config files in project directories (cwd) are not loaded to prevent
    injection attacks via malicious config files in repositories.
    """
    defaults: Dict[str, Any] = {
        "default_target_branch": "main",
        "jira_project_keys": [],
        "reviewer_groups": {},
        "github_user_map": {},
        "ignored_authors": [],
        "jira_base_url": "https://qualitytrade.atlassian.net/browse/",
        "personalized_reviewers": [],
    }

    home_config_path = Path.home() / CONFIG_FILENAME

    if home_config_path.exists():
        try:
            with open(home_config_path, "r", encoding="utf-8") as file_handle:
                user_config = json.load(file_handle)
                return _merge_config(defaults, user_config)
        except json.JSONDecodeError:
            logging.warning(
                f"Failed to parse config file at {home_config_path}. Using defaults."
            )
        except OSError as exc:
            logging.warning(f"Failed to read config file at {home_config_path}: {exc}")

    return defaults


def _safe_write_config(path: Path, payload: Dict[str, Any]) -> None:
    if path.is_symlink():
        logging.warning(f"Refusing to write config to symlinked path: {path}")
        return

    try:
        with open(path, "w", encoding="utf-8") as file_handle:
            json.dump(payload, file_handle, indent=4)
        logging.info(f"Saved configuration to {path}")
    except OSError as exc:
        logging.warning(f"Failed to save config: {exc}")


def save_config(config_dict: Dict[str, Any]) -> None:
    """
    Saves the configuration to .pr_creator_config.json in the home directory only.
    """
    target_path = Path.home() / CONFIG_FILENAME
    current_config: Dict[str, Any] = {}

    if target_path.exists():
        try:
            with open(target_path, "r", encoding="utf-8") as file_handle:
                current_config = json.load(file_handle)
        except json.JSONDecodeError:
            logging.warning(
                f"Failed to parse existing config at {target_path}. Starting fresh."
            )
        except OSError as exc:
            logging.warning(f"Failed to read existing config at {target_path}: {exc}")

    if not isinstance(current_config, dict):
        current_config = {}

    current_config.update(config_dict)
    _safe_write_config(target_path, current_config)


def add_to_user_map(email: str, handle: str) -> None:
    """
    Updates the github_user_map in the config file in the home directory.
    """
    target_path = Path.home() / CONFIG_FILENAME
    if target_path.is_symlink():
        logging.warning(f"Refusing to write config to symlinked path: {target_path}")
        return

    current_config: Dict[str, Any] = {}
    if target_path.exists():
        try:
            with open(target_path, "r", encoding="utf-8") as file_handle:
                current_config = json.load(file_handle)
        except json.JSONDecodeError:
            logging.warning(f"Failed to parse config at {target_path}. Starting fresh.")
        except OSError as exc:
            logging.warning(f"Failed to read config at {target_path}: {exc}")

    if not isinstance(current_config, dict):
        current_config = {}

    github_user_map = _normalize_string_map(current_config.get("github_user_map"))
    github_user_map[email] = handle
    current_config["github_user_map"] = github_user_map

    _safe_write_config(target_path, current_config)
