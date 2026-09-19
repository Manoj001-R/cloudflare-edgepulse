"""
Rich Terminal Interface for EdgePulse Python.
Provides an interactive SRE incident response experience directly in the terminal.
"""

from __future__ import annotations
import argparse
import sys
from typing import Any, Dict, Optional

# Fix Windows console UTF-8 encoding safely
if sys.platform == "win32":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.markdown import Markdown
from rich.live import Live
from rich.prompt import Prompt

from .agent import IncidentAgent
from .storage import Storage
from .llm import LlmClient

console = Console(legacy_windows=False)


def print_banner() -> None:
    banner_text = Text()
    banner_text.append("[EdgePulse] ", style="bold cyan")
    banner_text.append("AI Internet Incident Investigator\n", style="bold white")
    banner_text.append("Autonomous Triage • Diagnostic Orchestration • Evidence-Based Root Cause Analysis", style="dim")
    console.print(Panel(banner_text, border_style="cyan", padding=(1, 2)))


def format_severity(severity: str) -> Text:
    sev = severity.lower()
    if sev == "critical":
        return Text("CRITICAL", style="bold white on red")
    elif sev == "high":
        return Text("HIGH", style="bold red")
    elif sev == "medium":
        return Text("MEDIUM", style="bold yellow")
    else:
        return Text("LOW", style="bold green")


def format_status(status: str) -> Text:
    st = status.lower()
    if st == "healthy" or st == "completed":
        return Text(f"[OK] {status}", style="bold green")
    elif st == "warning":
        return Text(f"[!] {status}", style="bold yellow")
    elif st == "critical" or st == "failed":
        return Text(f"[X] {status}", style="bold red")
    else:
        return Text(status, style="dim")


def display_report(result: Dict[str, Any]) -> None:
    inc = result.get("incident", {})
    analysis = result.get("analysis", {})
    tool_results = result.get("tool_results", [])

    console.print("\n")

    # Header Card
    header_table = Table(show_header=False, box=None, padding=(0, 2))
    header_table.add_row("[bold cyan]Incident ID:[/]", f"[bold]{inc.get('id')}[/]")
    header_table.add_row("[bold cyan]Target URL:[/]", f"[underline]{inc.get('target_url')}[/]")
    header_table.add_row("[bold cyan]Incident Type:[/]", f"[bold magenta]{analysis.get('incidentType', 'N/A').upper()}[/]")
    header_table.add_row("[bold cyan]Severity:[/]", format_severity(analysis.get("severity", "medium")))
    confidence_pct = int(float(analysis.get("confidence", 0.0)) * 100)
    conf_color = "green" if confidence_pct >= 80 else ("yellow" if confidence_pct >= 60 else "red")
    header_table.add_row("[bold cyan]Confidence Score:[/]", f"[{conf_color}]{confidence_pct}%[/] (Analytical Estimate)")

    console.print(Panel(header_table, title="[bold]INCIDENT OVERVIEW[/]", border_style="blue"))

    # Summary & Root Cause
    summary_md = f"**Executive Summary:**\n{analysis.get('summary')}\n\n**Likely Root Cause:**\n{analysis.get('likelyRootCause')}"
    console.print(Panel(Markdown(summary_md), title="[bold]DIAGNOSTIC FINDINGS[/]", border_style="cyan"))

    # Evidence Table
    evidence_table = Table(title="Observed Diagnostic Evidence", border_style="dim")
    evidence_table.add_column("Signal", style="bold white")
    evidence_table.add_column("Measured Value", style="cyan")
    evidence_table.add_column("Interpretation", style="white")

    for f in analysis.get("findings", []):
        evidence_table.add_row(str(f.get("signal")), str(f.get("value")), str(f.get("interpretation")))
    console.print(evidence_table)

    # Remediation Plan Table
    rec_table = Table(title="Actionable Remediation Plan", border_style="green")
    rec_table.add_column("#", style="dim", width=3)
    rec_table.add_column("Problem", style="bold red")
    rec_table.add_column("Recommended Action", style="bold white")
    rec_table.add_column("Risk", style="yellow", width=8)
    rec_table.add_column("Validation Step", style="dim white")

    for i, a in enumerate(analysis.get("recommendedActions", [])):
        rec_table.add_row(
            str(i + 1),
            a.get("problem", ""),
            a.get("action", ""),
            a.get("risk", "Low"),
            a.get("validation", ""),
        )
    console.print(rec_table)

    # Limitations
    limitations = analysis.get("limitations", [])
    if limitations:
        lim_text = "\n".join(f"• {lim}" for lim in limitations)
        console.print(Panel(lim_text, title="[dim]Investigation Limitations[/]", border_style="dim"))


def display_history(storage: Storage) -> None:
    incidents = storage.list_incidents(limit=25)
    if not incidents:
        console.print("[yellow]No incident history found in database.[/]")
        return

    table = Table(title="Incident History", border_style="cyan")
    table.add_column("ID", style="bold cyan")
    table.add_column("Date", style="dim")
    table.add_column("Target URL", style="white")
    table.add_column("Type", style="magenta")
    table.add_column("Severity", justify="center")
    table.add_column("Status", justify="center")
    table.add_column("Confidence", justify="right")

    for inc in incidents:
        conf_str = f"{int((inc.get('confidence') or 0)*100)}%" if inc.get("confidence") else "—"
        table.add_row(
            inc["id"],
            inc["created_at"][:16].replace("T", " "),
            inc["target_url"],
            (inc.get("incident_type") or "unknown").upper(),
            format_severity(inc.get("severity") or "medium"),
            format_status(inc.get("status") or "created"),
            conf_str,
        )
    console.print(table)


def display_replay(agent: IncidentAgent, incident_id: str) -> None:
    console.print(f"[bold cyan]Replaying diagnostic investigation for incident:[/] [bold]{incident_id}[/]")
    try:
        replay_data = agent.replay(incident_id)
    except Exception as exc:
        console.print(f"[bold red]Replay Error:[/] {exc}")
        return

    table = Table(title=f"Incident Replay Comparison ({incident_id})", border_style="magenta")
    table.add_column("Tool", style="bold white")
    table.add_column("Previous Status", justify="center")
    table.add_column("Current Status", justify="center")
    table.add_column("Latency Delta", justify="right")
    table.add_column("Change Detected", justify="center")

    for comp in replay_data.get("comparisons", []):
        old_st = format_status(comp.get("old_status", "unknown"))
        new_st = format_status(comp.get("new_status", "unknown"))

        delta_str = "—"
        if "latency_delta" in comp:
            delta = comp["latency_delta"]
            delta_color = "green" if delta < 0 else ("red" if delta > 100 else "yellow")
            sign = "+" if delta > 0 else ""
            delta_str = f"[{delta_color}]{sign}{delta}ms[/]"

        changed = "[bold red]CHANGED[/]" if comp.get("changed") else "[green]STABLE[/]"
        table.add_row(comp["tool"], old_st, new_st, delta_str, changed)

    console.print(table)


def run_interactive_chat(agent: IncidentAgent, incident_id: str) -> None:
    console.print("\n[bold cyan]💬 Follow-up Incident Chat[/] [dim](Ask questions about this investigation. Type '/exit' or press Enter on empty line to exit)[/]")
    while True:
        try:
            user_input = Prompt.ask("\n[bold green]You[/]").strip()
            if not user_input or user_input.lower() in ("/exit", "exit", "quit"):
                break
            with console.status("[cyan]EdgePulse AI reasoning...[/]"):
                resp = agent.chat(incident_id, user_input)
            console.print(f"\n[bold cyan]EdgePulse AI:[/] {resp.answer}")
            if resp.additionalContext:
                console.print(f"[dim italic]Note: {resp.additionalContext}[/]")
        except (KeyboardInterrupt, EOFError):
            break
    console.print("\n[dim]Investigation session closed.[/]")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="EdgePulse — AI Internet Incident Investigator CLI"
    )
    parser.add_argument("--url", "-u", help="Target URL to investigate (e.g. https://example.com)")
    parser.add_argument("--problem", "-p", help="Natural language description of the problem")
    parser.add_argument("--demo", "-d", action="store_true", help="Run with deterministic offline demo diagnostics")
    parser.add_argument("--history", action="store_true", help="View past incident investigation history")
    parser.add_argument("--replay", "-r", metavar="INCIDENT_ID", help="Replay an existing incident and compare metrics")
    parser.add_argument("--interactive", "-i", action="store_true", help="Start interactive investigation prompt")
    parser.add_argument("--chat", metavar="INCIDENT_ID", help="Open follow-up chat session for an incident")
    parser.add_argument("--db", default="edgepulse_incidents.db", help="Path to SQLite database")

    args = parser.parse_args()

    print_banner()

    storage = Storage(db_path=args.db)
    agent = IncidentAgent(storage=storage, demo_mode=args.demo)

    if args.history:
        display_history(storage)
        return

    if args.replay:
        display_replay(agent, args.replay)
        return

    if args.chat:
        run_interactive_chat(agent, args.chat)
        return

    url = args.url
    problem = args.problem

    if not url or not problem or args.interactive:
        # Prompt user interactively
        console.print("[bold yellow]Example Incidents:[/]")
        console.print("  1. https://example.com - Site latency elevated and slow")
        console.print("  2. https://example.com - Intermittent 503 HTTP server errors")
        console.print("  3. https://example.com - Potential DNS resolution failure\n")

        if not url:
            url = Prompt.ask("[bold cyan]Enter target URL[/]", default="https://example.com")
        if not problem:
            problem = Prompt.ask(
                "[bold cyan]Describe the incident problem[/]",
                default="Users report high latency and intermittent connection delays",
            )

    console.print(f"\n[bold green][>] Launching AI Investigation...[/]")
    console.print(f"Target:  [underline]{url}[/]")
    console.print(f"Problem: \"{problem}\"\n")

    steps_log = []
    def progress_callback(step_name: str, status: str) -> None:
        if status == "running":
            console.print(f"  [cyan][*][/] Running [bold]{step_name}[/]...")
        elif status == "completed":
            console.print(f"  [green][OK][/] [bold]{step_name}[/] completed")
        else:
            console.print(f"  [red][FAIL][/] [bold]{step_name}[/]: {status}")

    try:
        result = agent.investigate(url, problem, progress_callback=progress_callback)
        display_report(result)
        inc_id = result["incident"]["id"]

        # Offer interactive follow-up chat
        if sys.stdin.isatty():
            ask_chat = Prompt.ask("\n[bold cyan]Would you like to ask follow-up questions?[/] (y/N)", default="n")
            if ask_chat.lower().startswith("y"):
                run_interactive_chat(agent, inc_id)

    except Exception as exc:
        console.print(f"\n[bold red]Investigation Aborted:[/] {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
