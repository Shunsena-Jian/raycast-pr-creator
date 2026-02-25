import sys
import argparse
import json
from typing import List, Optional, Dict, Any

from .utils import normalize_jira_link, extract_jira_id
from .git import (
    is_git_repo, fetch_latest_branches, get_remote_branches, 
    get_current_branch, get_commits_between, get_current_user_email
)
from .github import check_existing_pr, create_pr, get_contributors, get_current_username
from .config import load_config, save_config
from .naming import parse_branch_name
from .templates import PR_TEMPLATE

def output_git_data(fetch: bool = False) -> None:
    """Output git/github metadata in JSON for Raycast."""
    if not is_git_repo():
        sys.stdout.write(json.dumps({"error": "Not a git repository."}) + "\n")
        return

    if fetch:
        fetch_latest_branches()
    current_branch = get_current_branch()
    remote_branches = get_remote_branches()
    contributors = get_contributors()
    tickets_auto, title_auto = parse_branch_name(current_branch)
    
    config = load_config()
    personalized_reviewers = config.get("personalized_reviewers", [])

    data = {
        "currentBranch": current_branch,
        "remoteBranches": remote_branches,
        "contributors": contributors,
        "suggestedTickets": tickets_auto,
        "suggestedTitle": title_auto,
        "personalizedReviewers": personalized_reviewers,
    }
    sys.stdout.write(json.dumps(data) + "\n")

def output_description(source: str, target: str) -> None:
    """Output commit-based description in JSON for Raycast."""
    commits = get_commits_between(target, source)
    description = "\n".join([f"- {c}" for c in commits])
    sys.stdout.write(json.dumps({"description": description}) + "\n")

def run_headless(args: argparse.Namespace) -> None:
    """Execute PR creation without interaction."""
    fetch_latest_branches()
    source = args.source or get_current_branch()
    targets = args.target or []
    title_base = args.title or ""
    description = args.body or ""
    reviewers = args.reviewers or []
    tickets = args.tickets or []
    
    if not targets:
        sys.stdout.write(json.dumps({"error": "No target branches specified"}) + "\n")
        return

    config = load_config()
    jira_base_url = config.get("jira_base_url", "https://qualitytrade.atlassian.net/browse/")
    
    jira_links = [normalize_jira_link(t, jira_base_url) for t in tickets]
    jira_section = "\n".join(jira_links) if jira_links else "None"
    # Filter only valid ticket IDs for the prefix
    valid_ticket_ids = [extract_jira_id(tid) for tid in tickets if extract_jira_id(tid)]
    ticket_prefix = "".join([f"[{tid}]" for tid in valid_ticket_ids])
    
    results = []
    for target in targets:
        title_part = f"[{title_base}]" if title_base else ""
        final_title = f"{ticket_prefix}{title_part}[{source}] -> [{target}]"
        body = PR_TEMPLATE.format(tickets=jira_section, description=description)
        
        if check_existing_pr(source, target):
            results.append({"target": target, "skipped": True, "reason": "PR already exists"})
            continue
            
        res = create_pr(source, target, final_title, body, reviewers, skip_confirm=True)
        results.append({"target": target, "url": res.get("url"), "error": res.get("error")})
    
    sys.stdout.write(json.dumps({"success": True, "results": results}) + "\n")

def output_preview(args: argparse.Namespace) -> None:
    """Output PR preview based on inputs."""
    source = args.source or get_current_branch()
    target = args.target[0] if args.target else "main"
    title_base = args.title or ""
    description_base = args.body or ""
    tickets = args.tickets or []
    
    config = load_config()
    jira_base_url = config.get("jira_base_url", "https://qualitytrade.atlassian.net/browse/")
    
    jira_links = [normalize_jira_link(t, jira_base_url) for t in tickets]
    jira_section = "\n".join(jira_links) if jira_links else "None"
    
    # Filter only valid ticket IDs for the prefix
    valid_ticket_ids = [extract_jira_id(tid) for tid in tickets if extract_jira_id(tid)]
    ticket_prefix = "".join([f"[{tid}]" for tid in valid_ticket_ids])
    
    title_part = f"[{title_base}]" if title_base else ""
    final_title = f"{ticket_prefix}{title_part}[{source}] -> [{target}]"
    final_body = PR_TEMPLATE.format(tickets=jira_section, description=description_base)
    
    sys.stdout.write(json.dumps({"title": final_title, "body": final_body}) + "\n")

def main() -> None:
    parser = argparse.ArgumentParser(description="QualityTrade PR Creator")
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--get-data", action="store_true")
    parser.add_argument("--get-description", action="store_true")
    parser.add_argument("--get-preview", action="store_true")
    parser.add_argument("--save-reviewers", action="store_true")
    parser.add_argument("--fetch", action="store_true", help="Fetch latest branches from remote")
    
    parser.add_argument("--source")
    parser.add_argument("--target", action="append")
    parser.add_argument("--title")
    parser.add_argument("--body")
    parser.add_argument("--reviewers", action="append")
    parser.add_argument("--tickets", action="append")
    parser.add_argument("repo_path", nargs="?", help="Optional path to the git repository")

    args = parser.parse_args()

    if args.repo_path:
        import os
        try:
            os.chdir(args.repo_path)
        except Exception as e:
            sys.stdout.write(json.dumps({"error": f"Failed to change directory: {str(e)}"}) + "\n")
            sys.exit(1)

    if args.get_data:
        output_git_data(fetch=args.fetch)
    elif args.get_description:
        if not args.target or not args.source:
             sys.stdout.write(json.dumps({"error": "Source/Target required"}) + "\n")
        else:
             output_description(args.source, args.target[0])
    elif args.get_preview:
        output_preview(args)
    elif args.headless:
        run_headless(args)
    elif args.save_reviewers:
        save_config({"personalized_reviewers": args.reviewers or []})
        sys.stdout.write(json.dumps({"success": True}) + "\n")
    else:
        sys.stdout.write(json.dumps({"error": "Interactive mode is disabled in Raycast version."}) + "\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
