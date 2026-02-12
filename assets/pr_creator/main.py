import sys
import argparse
import json
from typing import List, Optional, Dict, Any

from .utils import print_colored, normalize_jira_link, extract_jira_id, clear_screen
from .git import (
    is_git_repo, fetch_latest_branches, get_remote_branches, 
    get_current_branch, get_commits_between, get_current_user_email
)
from .github import check_existing_pr, create_pr, get_contributors, get_current_username
from .ui import select_from_list, get_multiline_input, prompt_reviewers
from .config import load_config, save_config
from .naming import parse_branch_name
from .strategy import (
    prompt_strategy, resolve_placeholder_targets, 
    STAGING_PATTERN, ALPHA_PATTERN, BETA_PATTERN
)
from .templates import PR_TEMPLATE

def print_header(
    source: Optional[str] = None, 
    targets: Optional[List[str]] = None, 
    strategy: Optional[str] = None, 
    tickets: Optional[List[str]] = None, 
    title: Optional[str] = None, 
    description: Optional[str] = None, 
    reviewers: Optional[List[str]] = None
) -> None:
    clear_screen()
    print_colored("QualityTrade Asia Pull Request Creator", "green")
    print_colored("="*40, "green")
    
    if source:
        print(f"Source   : {source}", file=sys.stderr)
    if targets:
        print(f"Targets  : {', '.join(targets)}", file=sys.stderr)
    if strategy:
        print(f"Strategy : {strategy}", file=sys.stderr)
    if tickets:
        print(f"Tickets  : {', '.join(tickets)}", file=sys.stderr)
    if title is not None:
        print(f"Title    : {title}", file=sys.stderr)
    if description:
        lines = description.strip().split("\n")
        desc_sum = lines[0][:50] + ("..." if len(lines) > 1 or len(lines[0]) > 50 else "")
        print(f"Desc     : {desc_sum}", file=sys.stderr)
    if reviewers:
        rev_str = ", ".join(reviewers)
        if len(rev_str) > 50:
             rev_str = f"{len(reviewers)} selected"
        print(f"Reviewers: {rev_str}", file=sys.stderr)
        
    if any([source, targets, strategy, tickets, title, description, reviewers]):
        print_colored("-" * 40, "green")

def run_interactive() -> None:
    print_header()

    if not is_git_repo():
        print_colored("Error: Not a git repository.", "red")
        sys.exit(1)

    config = load_config()
    default_target = config.get("default_target_branch", "main")
    jira_base_url = config.get("jira_base_url", "https://qualitytrade.atlassian.net/browse/")

    fetch_latest_branches()
    remote_branches = get_remote_branches()
    current_branch = get_current_branch()

    source_branch = current_branch
    strategy_name, source_branch, target_candidates = prompt_strategy(source_branch, remote_branches)
    
    targets = []
    if strategy_name == "Manual":
        target_candidates = []
    else:
        targets = resolve_placeholder_targets(target_candidates, remote_branches, default_target)
    
    if strategy_name == "Manual" or not targets:
        if strategy_name != "Manual":
            print_colored("No valid targets determined from strategy. Reverting to manual selection.", "yellow")
        
        if strategy_name == "Manual":
            if remote_branches:
                source_branch = select_from_list(f"Source Branch? (Current: {source_branch})", remote_branches)
            else:
                source_branch = input(f"Source Branch? (Default: {source_branch}) ").strip() or source_branch

        t_choice = select_from_list(f"Target Branch? (Default: {default_target})", remote_branches)
        targets = [t_choice]

    print_header(source_branch, targets, strategy_name)

    tickets_auto, title_auto = parse_branch_name(source_branch)
    
    print_colored("\n--- JIRA Details ---", "cyan")
    print("1. Enter JIRA Ticket IDs", file=sys.stderr)
    print("2. Enter JIRA Release info", file=sys.stderr)
    print("3. Skip / Manual", file=sys.stderr)
    j_choice = input("Select [1-3]: ").strip()
    
    jira_section = ""
    ticket_ids = tickets_auto[:]

    if j_choice == "1":
        ids_input = get_multiline_input("Enter JIRA Ticket IDs or URLs (e.g. PROJ-123):")
        new_ids = []
        links = []
        for t in ids_input:
            if not t.strip(): continue
            tid = extract_jira_id(t)
            if tid:
                new_ids.append(tid)
            links.append(normalize_jira_link(t, jira_base_url))
        
        jira_section = "\n".join(links)
        for tid in new_ids:
            if tid not in ticket_ids:
                ticket_ids.append(tid)
            
    elif j_choice == "2":
        r_title = input("Release Title: ").strip()
        r_url = input("Release URL: ").strip()
        jira_section = f"[{r_title}]({r_url})"
        if not title_auto:
            title_auto = r_title
    else:
        jira_section = "None"
        title_auto = ""

    print_header(source_branch, targets, strategy_name, tickets=ticket_ids)

    # Filter only valid ticket IDs for the prefix
    valid_ticket_ids = [extract_jira_id(tid) for tid in ticket_ids if extract_jira_id(tid)]
    ticket_prefix = "".join([f"[{tid}]" for tid in valid_ticket_ids])
    preview_target = targets[0] if targets else "target"
    
    print_colored("\n--- Title Configuration ---", "cyan")
    print_colored(f"Default Title Style: {ticket_prefix}[{source_branch}] -> [{preview_target}]", "green")
    
    print_colored(f"\nDescriptive Title / Extension (Default: {title_auto if not ticket_ids else 'None'})", "cyan")
    t_input = input("> ").strip()
    
    final_title_base = t_input if t_input else (title_auto if not ticket_ids else "")
    print_header(source_branch, targets, strategy_name, tickets=ticket_ids, title=final_title_base)
    
    commits = []
    if targets:
         commits = get_commits_between(targets[0], source_branch)
    
    desc_auto = "\n".join([f"- {c}" for c in commits]) if commits else ""
    
    print_colored("\nDescription (Enter to keep auto-generated)", "cyan")
    d_lines = get_multiline_input("New description?")
    final_description = "\n".join([f"- {line}" for line in d_lines]) if d_lines else desc_auto

    print_header(source_branch, targets, strategy_name, tickets=ticket_ids, title=final_title_base, description=final_description)

    authors = get_contributors()
    current_email = get_current_user_email()
    current_handle = get_current_username()
    ignored_authors = config.get("ignored_authors", [])
    
    filtered_authors = []
    for a in authors:
        if current_email and current_email in a: continue
        if current_handle and current_handle.lower() == a.lower(): continue
        if any(ignored in a for ignored in ignored_authors): continue
        filtered_authors.append(a)
    
    reviewers = prompt_reviewers(filtered_authors)

    all_prs = []
    for target in targets:
        title_part = f"[{final_title_base}]" if final_title_base else ""
        final_title = f"{ticket_prefix}{title_part}[{source_branch}] -> [{target}]"
        body = PR_TEMPLATE.format(tickets=jira_section, description=final_description)
        all_prs.append({"target": target, "title": final_title, "body": body, "reviewers": reviewers})

    print_header(source=source_branch, targets=targets, strategy=strategy_name, tickets=ticket_ids, title=final_title_base, description=final_description, reviewers=reviewers)

    print_colored(f"\nReady to create {len(all_prs)} Pull Request(s):", "cyan")
    for pr in all_prs:
        print(f"  -> {pr['target']}: {pr['title']}", file=sys.stderr)
    
    confirm = input("\nCreate these PRs? [Y/n] ").strip().lower()
    if confirm == 'n':
        print_colored("Aborted.", "red")
        sys.exit(0)

    for pr in all_prs:
        print_colored(f"\n--- Processing {pr['target']} ---", "cyan")
        if check_existing_pr(source_branch, pr['target']):
            continue
            
        res = create_pr(source_branch, pr['target'], pr['title'], pr['body'], pr['reviewers'], skip_confirm=True)
        if res.get("url"):
            print_colored(f"Created: {res['url']}", "green")

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

    # Calculate stages (matching TS logic but centralizing here)
    import re
    stages = []
    
    # Release Stages
    rb_list = [b for b in remote_branches if re.match(STAGING_PATTERN, b)]
    ab_list = [b for b in remote_branches if re.match(ALPHA_PATTERN, b)]
    bb_list = [b for b in remote_branches if re.match(BETA_PATTERN, b)]

    for rb in rb_list:
        stages.append({
            "title": f"Feature -> Develop & {rb}",
            "recommendation": {"name": "Release: Feature", "source": current_branch, "targets": ["develop", rb]}
        })
    
    if not rb_list:
        stages.append({
            "title": "Feature -> Develop (No release branch)",
            "recommendation": {"name": "Release: Feature", "source": current_branch, "targets": ["develop"]}
        })

    for rb in rb_list:
        stages.append({
            "title": f"{rb} -> {rb}-a (Alpha)",
            "recommendation": {"name": "Release: Staging->Alpha", "source": rb, "targets": [f"{rb}-a"]}
        })

    for ab in ab_list:
        stages.append({
            "title": f"{ab} -> {ab.replace('-a', '-b')} (Beta)",
            "recommendation": {"name": "Release: Alpha->Beta", "source": ab, "targets": [ab.replace("-a", "-b")]}
        })

    live_branch = "main" if "main" in remote_branches else ("master" if "master" in remote_branches else "main")
    for bb in bb_list:
        stages.append({
            "title": f"{bb} -> {live_branch} (Live)",
            "recommendation": {"name": "Release: Beta->Live", "source": bb, "targets": [live_branch]}
        })

    # Hotfix Stages
    hf_list = [b for b in remote_branches if b.startswith("hotfix/")]
    for ch in [b for b in hf_list if "-" in b.replace("hotfix/", "")]:
        parent = ch.split("-")[0]
        stages.append({
            "title": f"{ch} -> {parent}",
            "recommendation": {"name": "Hotfix: Child", "source": ch, "targets": [parent]}
        })
    
    # Pre-calculate latest branches once for all parent hotfixes
    try:
        from natsort import natsorted
        sorted_remote = natsorted(remote_branches, reverse=True)
    except ImportError:
        sorted_remote = sorted(remote_branches, reverse=True)
        
    latest_rb = next((b for b in sorted_remote if re.match(STAGING_PATTERN, b)), None)
    latest_ab = next((b for b in sorted_remote if re.match(ALPHA_PATTERN, b)), None)
    latest_bb = next((b for b in sorted_remote if re.match(BETA_PATTERN, b)), None)
    
    propagate_targets = ["develop"]
    if latest_rb: propagate_targets.append(latest_rb)
    if latest_ab: propagate_targets.append(latest_ab)
    if latest_bb: propagate_targets.append(latest_bb)
    propagate_targets.append(live_branch)
    propagate_targets = list(dict.fromkeys(propagate_targets))

    for ph in [b for b in hf_list if "-" not in b.replace("hotfix/", "")]:
        stages.append({
            "title": f"{ph} -> All Branches (Propagate)",
            "recommendation": {"name": "Hotfix: Parent->All", "source": ph, "targets": propagate_targets}
        })

    data = {
        "currentBranch": current_branch,
        "remoteBranches": remote_branches,
        "contributors": contributors,
        "suggestedTickets": tickets_auto,
        "suggestedTitle": title_auto,
        "personalizedReviewers": personalized_reviewers,
        "stages": stages
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
        run_interactive()

if __name__ == "__main__":
    main()
