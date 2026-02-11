import json
import urllib.request
import sys
import os
import threading
from typing import List, Dict, Any

def resolve_slack_id(identity: str, slack_user_map: Dict[str, str]) -> str:
    """
    Resolve a git email or github handle to a Slack ID.
    Returns the Slack ID in <@ID> format if found, otherwise returns the identity.
    """
    if not identity:
        return ""
    
    # Check if identity is already a Slack ID format
    if identity.startswith("U") and len(identity) >= 9:
        return identity # User mentioned they want the ID directly in the payload

    # Clean identity (strip < > from email)
    clean_id = identity
    if "<" in identity and ">" in identity:
        clean_id = identity.split("<")[-1].split(">")[0]
    
    # Lookup in map
    slack_id = slack_user_map.get(clean_id) or slack_user_map.get(identity)
    
    return slack_id if slack_id else identity

ALLOWED_REPOS = {
    "iaf_prerender",
    "iaf-admin-dw-backend",
    "iaf-admin-mdb-backend",
    "iaf-bulk-matching-backend",
    "iaf-dc-backend",
    "iaf-main-backend",
    "iaf-workers-backend",
    "raycast-pr-creator"
}

def _send_request(webhook_url: str, payload: Dict[str, Any]) -> None:
    """Internal helper to send the actual HTTP request."""
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            webhook_url, 
            data=data, 
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as response:
            if response.status >= 200 and response.status < 300:
                print(f"Slack notification sent successfully.", file=sys.stderr)
            else:
                print(f"Warning: Slack notification failed with status {response.status}", file=sys.stderr)
    except Exception as e:
        print(f"Warning: Failed to send Slack notification: {e}", file=sys.stderr)

def send_slack_notification(
    pr_results: List[Dict[str, Any]],
    repo_name: str,
    author_identity: str,
    description: str,
    tickets: List[str],
    config: Dict[str, Any]
) -> None:
    """Send PR creation notification to Slack Workflow (Non-blocking)."""
    if repo_name not in ALLOWED_REPOS:
        return

    # Check environment variable first for security, then fall back to config
    webhook_url = os.environ.get("PR_CREATOR_SLACK_WEBHOOK") or config.get("slack_webhook_url")
    if not webhook_url:
        return

    slack_user_map = config.get("slack_user_map", {})
    channel_id = config.get("code_review_channel", "")

    # Resolve Author
    author_slack = resolve_slack_id(author_identity, slack_user_map)

    # Resolve Reviewers (from the first PR's reviewer list, assuming they are the same)
    reviewers_raw = pr_results[0].get("reviewers", []) if pr_results else []
    resolved_reviewers = [resolve_slack_id(r, slack_user_map) for r in reviewers_raw]
    reviewers_slack = ", ".join(resolved_reviewers) if resolved_reviewers else "None"

    # Format PR Links
    links = []
    for res in pr_results:
        if res.get("url"):
            target = res.get("target", "main")
            links.append(f"<{res['url']}|PR to {target}>")
    
    links_str = "\n".join(links) if links else "No PRs created"

    # Tickets/Release
    tickets_str = ", ".join(tickets) if tickets else "None"

    payload = {
        "author": author_slack,
        "reviewers": reviewers_slack,
        "pull_request_links": links_str,
        "code_review_channel": channel_id,
        "description": description,
        "repository": repo_name,
        "tickets_release": tickets_str
    }

    # Send notification in a background thread to avoid blocking the CLI
    thread = threading.Thread(target=_send_request, args=(webhook_url, payload), daemon=True)
    thread.start()
