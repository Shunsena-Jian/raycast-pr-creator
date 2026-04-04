# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

QualityTrade PR Creator is a Raycast extension that streamlines Pull Request creation with JIRA integration and multi-target support. It consists of a TypeScript/React frontend and a Python backend.

## Commands

```bash
# Development
npm run dev      # Run extension in development mode (installs into Raycast)
npm run build    # Build for production

# Linting (uses @raycast/eslint-config)
npm run lint        # Check for lint errors
npm run fix-lint    # Auto-fix lint issues

# Publishing
npm run publish   # Publish to Raycast store
```

## Architecture

### Frontend (TypeScript/React) - `src/`
- **Views**: `src/components/views/` contains the main UI components
  - `PRFormView.tsx` - Main PR creation form with strategy selection
  - `StrategyList.tsx` - Release stage selection
  - `HotfixStageView.tsx` - Hotfix stage selection
- **Hooks**: `src/hooks/` contains state management
  - `useGitData.ts` - Fetches git/GitHub data via Python bridge
  - `usePRForm.ts` - Form state and submission logic
  - `usePRPreview.ts` - Real-time PR title/body preview
  - `useRepos.ts` - Repository discovery
- **Utils**: `src/utils/strategies.ts` - Branch naming pattern detection for release/hotfix workflows
- **Integration**: `src/utils/shell.ts` - Executes Python scripts via `runPythonScript()`

### Backend (Python) - `assets/pr_creator/`
- **main.py**: Entry point; parses CLI args and routes to handlers (`--get-data`, `--get-preview`, `--headless`)
- **git.py**: Git operations (branches, commits, diffs)
- **github.py**: GitHub API integration (PR creation, contributors)
- **config.py**: Loads/saves `~/.pr_creator_config.json`
- **naming.py**: Branch name parsing (extracts JIRA tickets)
- **codeowners.py**: Suggests reviewers based on CODEOWNERS file
- **templates.py**: PR description template

### Integration Bridge - `assets/pr_engine.py`
Acts as CLI wrapper that invokes `pr_creator.main.main()`. The TypeScript frontend communicates with Python via JSON through this bridge.

## Key Patterns

**Python-TS Communication**: All data flows through JSON. TypeScript calls `runPythonScript(args, cwd)` which:
1. Executes `assets/venv/bin/python3` with `pr_engine.py` and args
2. Returns parsed JSON (e.g., `GitData`, PR preview)
3. Python prints JSON to stdout

**Strategy Detection** (`src/utils/strategies.ts`):
- Release branches: `release/x.y.z` (Staging), `release/x.y.z-a` (Alpha), `release/x.y.z-b` (Beta)
- Hotfix branches: `hotfix/x.y.z` (parent), `hotfix/x.y.z-*` (child)
- Strategies are computed in TypeScript, not Python

**Config File**: User config at `~/.pr_creator_config.json` stores `jira_base_url`, `default_target_branch`, `ignored_authors`, and `personalized_reviewers`

## Running Python Standalone

For debugging the Python engine directly:
```bash
cd assets
source venv/bin/activate
python3 pr_engine.py --get-data /path/to/repo
```

## Coding Standards

### TypeScript/React (Frontend)

**tsconfig.json Settings**
- Enable `"strict": true` — this enables all strict type checking options
- Enable `"noUncheckedIndexedAccess": true` for safer array/object access
- Enable `"noImplicitReturns": true` to ensure all code paths return a value
- Enable `"isolatedModules": true` for build tool compatibility (esbuild/SWC/Vite)
- Enable `"exactOptionalPropertyTypes": true` for precise optional property typing

**TypeScript Strictness**
- **Never use `any`** — use `unknown` with type guards when shape is uncertain
- Use `import type { T }` for type-only imports (erased at compile time)
- Avoid `as` type assertions — they can hide real bugs; use type guards instead
- Use `const` assertions (`as const`) for immutable object literals
- Use discriminated unions for state management and polymorphic types

**Naming Conventions**
- Components: PascalCase (e.g., `PRFormView.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useGitData.ts`)
- Utilities: camelCase (e.g., `strategies.ts`)
- Types/Interfaces: PascalCase with descriptive suffixes (e.g., `GitData`, `PRFormState`)
- Use `interface` for public API shapes (extendable); use `type` for unions, intersections, and aliases

**Code Style**
- Use **named exports** for components and utilities; avoid default exports
- Prefer **function components** with hooks over class components
- Use **explicit return types** on public functions and hooks
- Place **component-specific types** in the same file as the component
- Use **early returns** to reduce nesting (guard clauses)
- Prefer **async/await** over raw Promises; avoid `.then().catch()` chains
- Use `satisfies` operator when you want to validate without widening types
- Use utility types: `Partial`, `Pick`, `Omit`, `Record`, `ReturnType`, `Extract`, `Exclude`

**React Best Practices**
- Extract reusable logic into custom hooks (prefixed with `use`)
- Colocate styles, types, and tests near the component they belong to
- Avoid prop drilling — use Context or lift state appropriately
- Keep components **focused** — one primary responsibility per component
- Use Zod or Valibot for runtime validation of external data (API responses, form inputs)

### Python (Backend)

**PEP 8 Compliance**
- Follow [PEP 8](https://pep8.org/) — 4-space indentation, 79-char line limit for code
- Use `black` or `ruff` for formatting (enforces PEP 8 compatible style, defaults to 88-char line)
- Use `ruff` for linting (handles both pycodestyle rules and formatting)
- Use `isort` for import sorting

**Naming Conventions**
- Functions/methods: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Private members: prefix with `_` (e.g., `_load_config()`)
- Modules: short lowercase names; use underscores for readability if needed

**Code Style**
- Use **type hints** on all function signatures (e.g., `def create_pr(title: str, body: str) -> dict:`)
- Prefer **explicit returns** — avoid returning `None` when a value is expected
- Use **f-strings** for string formatting; avoid `.format()` and old `%` style
- Avoid wildcard imports (`from module import *`)
- Group imports: standard library → third party → local (with blank lines between)

**Best Practices**
- Keep functions **small and focused** — single responsibility per function
- Use **dataclasses** or **Pydantic models** for structured data (API responses, config)
- Prefer **early returns** to reduce nesting
- Use `logging` instead of `print()` for debugging/output
- Handle exceptions at the appropriate layer — don't swallow errors silently
- Use docstrings (Google or NumPy style) for modules, functions, classes, and methods
- Configure `ruff` with recommended defaults for optimal linting
