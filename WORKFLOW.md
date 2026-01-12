# Beads Workflow - Complete Flow

## 1. See what work is available
```bash
bd ready
```
Shows all open issues ready to work on.

## 2. Pick an issue and view details
```bash
bd show GenerateByAI-1o2
```
See full description, status, priority.

## 3. Claim the work
```bash
bd update GenerateByAI-1o2 --status in_progress
```
Now only you are working on it (local tracking).

## 4. Make code changes
Edit files to fix the issue:
```bash
# Edit the files mentioned in the issue
# Test your changes
npm run lint   # Run linter
npm run build  # Build project
```

## 5. Verify changes work
```bash
npm run lint   # Should have fewer errors
npm run build  # Should succeed
```

## 6. Close the issue when done
```bash
bd close GenerateByAI-1o2
```

## 7. Move to next issue
```bash
bd ready  # See remaining work
bd show GenerateByAI-x6p
bd update GenerateByAI-x6p --status in_progress
# ... repeat steps 4-6
```

## 8. End of session: Landing the Plane
When you're done working:

```bash
# 1. See remaining work
bd list  # Shows all issues

# 2. Create issues for what's left (if not already created)
bd create --title "TODO: Next feature" --description "Details"

# 3. Run quality gates
npm run build
npm run lint

# 4. Sync issues with git
bd sync

# 5. Commit and push
git add .
git commit -m "Fix linting issues and code quality"
git push

# 6. Verify remote is updated
git status
# Should show: "Your branch is up to date with 'origin/main'"
```

## Issue Lifecycle

```
OPEN → IN_PROGRESS → CLOSED
  ↓         ↓           ↓
  View    Work      Done!
  Ready   Changes   Synced
```

## Command Quick Reference

| Task | Command |
|------|---------|
| See ready work | `bd ready` |
| View issue details | `bd show <id>` |
| Start working | `bd update <id> --status in_progress` |
| Finish work | `bd close <id>` |
| Create new issue | `bd create --title "..." --description "..."` |
| List all issues | `bd list` |
| Sync with git | `bd sync` |
| See issue history | `bd show <id> --verbose` |

## Pro Tips

1. **Work on one issue at a time** - keeps focus
2. **Update status before starting** - tells beads you're on it
3. **Close when complete** - removes from `bd ready` list
4. **Sync before push** - ensures issues are in `.beads/` directory
5. **Push after sync** - makes work part of git history

## Example Real Session

```bash
# Morning: See what's available
bd ready

# Pick an issue
bd show GenerateByAI-1o2

# Claim it
bd update GenerateByAI-1o2 --status in_progress

# Do the work
# ... edit files ...
npm run lint  # verify

# Done!
bd close GenerateByAI-1o2

# Next issue
bd show GenerateByAI-x6p
bd update GenerateByAI-x6p --status in_progress
# ... work ...
bd close GenerateByAI-x6p

# End of day: Land the plane
bd sync
git add .
git commit -m "Fix 2 issues: any types and unused imports"
git push
```

---

**All 6 issues created. Pick one and start!** 🚀
