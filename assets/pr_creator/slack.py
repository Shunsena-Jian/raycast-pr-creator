import json
import urllib.request
import urllib.error
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
    
    if slack_id:
        return slack_id.lstrip("@")
    return identity

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
        
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status >= 200 and response.status < 300:
                print(f"Slack notification sent successfully.", file=sys.stderr)
            else:
                body = response.read().decode("utf-8")
                print(f"Warning: Slack notification failed with status {response.status}. Response: {body}", file=sys.stderr)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"Warning: Failed to send Slack notification: {e}. Response body: {error_body}", file=sys.stderr)
    except Exception as e:
        print(f"Warning: Failed to send Slack notification (Unexpected): {e}", file=sys.stderr)

def send_slack_notification(
    pr_results: List[Dict[str, Any]],
    repo_name: str,
    author_identity: str,
    description: str,
    tickets: List[str],
    config: Dict[str, Any],
    wait_for_thread: bool = False
) -> None:
    """Send PR creation notification to Slack Workflow (Non-blocking)."""
    
    if repo_name not in ALLOWED_REPOS:
        return

    # Check environment variable first for security, then fall back to config
    env_webhook = os.environ.get("PR_CREATOR_SLACK_WEBHOOK")
    config_webhook = config.get("slack_webhook_url")
    webhook_url = env_webhook or config_webhook
    
    if not webhook_url:
        print(f"Warning: Slack notification skipped. PR_CREATOR_SLACK_WEBHOOK not set for repository '{repo_name}'.", file=sys.stderr)
        return

    slack_user_map = config.get("slack_user_map", {})
    channel_id = config.get("code_review_channel", "")

    # Resolve Author (Keep as raw ID for Slack "User" variable type)
    author_id = resolve_slack_id(author_identity, slack_user_map)

    # Resolve Reviewers (Deduplicated and formatted as mentions for Slack "Text" variable type)
    reviewers_raw = pr_results[0].get("reviewers", []) if pr_results else []
    resolved_ids = []
    seen = set()
    for r in reviewers_raw:
        s_id = resolve_slack_id(r, slack_user_map)
        if s_id and s_id not in seen:
            resolved_ids.append(s_id)
            seen.add(s_id)
    
    if resolved_ids:
        # Format as <@ID1> <@ID2>
        reviewers_slack = " ".join([f"<@{rid}>" for rid in resolved_ids])
    else:
        # Fallback to author mention if no reviewers
        reviewers_slack = f"<@{author_id}>" if author_id else ""

    # Format PR Links
    links = []
    for res in pr_results:
        if res.get("url"):
            links.append(res['url'])
    
    links_str = "\n".join(links) if links else "No PRs created"

    # Tickets/Release
    tickets_str = ", ".join(tickets) if tickets else "None"

    payload = {
        "author": author_id,
        "reviewers": reviewers_slack,
        "pull_request_links": links_str,
        "code_review_channel": channel_id,
        "description": description,
        "repository": repo_name,
        "tickets_release": tickets_str
    }

    # Send notification in a background thread to avoid blocking the CLI
    # daemon=False ensures the thread finishes even if the main program exits
    thread = threading.Thread(target=_send_request, args=(webhook_url, payload), daemon=False)
    thread.start()
    
    if wait_for_thread:
        thread.join()
