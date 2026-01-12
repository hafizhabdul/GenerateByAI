# How to Use Beads (bd) - Issue Tracking

Beads is a Git-integrated issue tracking system created by Steve Yegge. This project is already configured with it.

## What is Beads?

Beads is a lightweight issue tracker that stores issues directly in your Git repo (`.beads/` directory). It's designed to be:
- **Local-first** - Works offline, syncs with git
- **Git-integrated** - Issues are part of your repo history
- **Fast** - CLI-based, minimal overhead
- **Developer-friendly** - Integrates naturally into your workflow

## Getting Started

### Installation (Already Done)
```bash
bd --version  # Check if installed (0.42.0+)
```

### Onboard (First Time Only)
```bash
bd onboard
```
This initializes beads for your repo if not already done.

## Common Commands

### 📋 View Issues
```bash
bd ready              # Show open issues ready to work on
bd show <id>          # View detailed issue info
bd list               # List all issues
```

### 🚀 Workflow

**1. Start work on an issue:**
```bash
bd update <id> --status in_progress
```

**2. Close when done:**
```bash
bd close <id>
```

**3. Create a new issue:**
```bash
bd create --title "Your issue title" --description "Details..."
```

### 🔄 Sync with Git
```bash
bd sync               # Sync issues with git
```

## Full Command Reference

| Command | Purpose |
|---------|---------|
| `bd ready` | Find issues ready to work on |
| `bd show <id>` | View issue details |
| `bd list` | List all issues |
| `bd update <id> --status <status>` | Change issue status |
| `bd close <id>` | Mark issue complete |
| `bd create` | Create new issue |
| `bd sync` | Sync with git |
| `bd doctor` | Diagnose issues |

## Issue Status Flow

```
open → in_progress → closed
```

## Integration with Landing the Plane

When ending a work session, use beads to manage issues:

1. **File issues for remaining work:**
   ```bash
   bd create --title "Remaining task" --description "What needs to be done"
   ```

2. **Update completed work:**
   ```bash
   bd close <id>
   ```

3. **Update in-progress items:**
   ```bash
   bd update <id> --status in_progress
   ```

4. **Sync before git push:**
   ```bash
   bd sync
   git push
   ```

## Example Workflow

```bash
# See what to work on
bd ready

# Show a specific issue
bd show ABC-123

# Start working on it
bd update ABC-123 --status in_progress

# Finish your changes
# ... make code changes ...

# Close the issue
bd close ABC-123

# Sync and push
bd sync
git push
```

## Tips

- **Issue IDs**: Look like `ABC-123`, generated automatically
- **Daemon warnings**: Normal on first run, use `bd doctor` if persistent
- **Git integration**: Issues are stored in `.beads/` - commit this directory
- **Offline work**: Create/modify issues offline, sync when you push

## Troubleshooting

### Daemon taking too long?
```bash
bd doctor
```

### Sync issues?
```bash
bd sync
git status  # Check if .beads/ changes are staged
```

### Can't see issues?
```bash
bd list  # List all issues in any status
```

## Learn More

- Beads is designed to fit naturally into git workflows
- Issues are collaborative - share via git commits
- Use descriptive titles and descriptions for team clarity
