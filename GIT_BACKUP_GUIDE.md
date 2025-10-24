# Git Backup & Recovery Guide

## Current Backup Status ✅

**Date**: 2025-01-23
**Working Version**: v1.0 - Global cursor + Local dot panel

### Branches

```
main                         - Current working branch (continue here)
backup/v1.0-working-baseline - Safe backup (identical to main)
```

Both branches point to commit: `332ef96`

### Git Tags

```
v1.0-working-baseline - Stable working version
```

---

## 📋 Quick Reference

### Current Setup
- ✅ `main` branch has your working code
- ✅ `backup/v1.0-working-baseline` is your safety copy
- ✅ Both are identical right now
- ✅ Continue working on `main`

---

## 🔄 Recovery Options

### Option 1: Restore from backup branch
If you mess up `main` and want to go back:

```bash
# Check what's different
git diff main backup/v1.0-working-baseline

# Reset main to backup
git checkout main
git reset --hard backup/v1.0-working-baseline
```

### Option 2: Restore from tag
```bash
# View available tags
git tag -l

# Reset to tagged version
git checkout main
git reset --hard v1.0-working-baseline
```

### Option 3: Create new branch from backup
```bash
# Start fresh from backup
git checkout -b feature/new-work backup/v1.0-working-baseline
```

### Option 4: Compare changes
```bash
# See what changed since backup
git diff backup/v1.0-working-baseline main

# See files changed
git diff --name-only backup/v1.0-working-baseline main
```

---

## 💾 Creating More Backups

### After making changes you want to save:

```bash
# Commit your changes
git add .
git commit -m "Description of changes"

# Create new backup branch
git checkout -b backup/v1.1-description
git checkout main

# Or create new tag
git tag -a v1.1-description -m "Description"
```

---

## 📂 Current File Structure

```
✅ Working:
- Global cursor system (src/cursor/)
- Hero section (HeroPills + ThreeHello)
- Dot panel LOCAL MODE (src/utils/dotPanel.js)
- Portrait parallax
- Name bubbles

⚠️ Disabled:
- LiquidHero (src/components/LiquidHero.tsx - not imported)
- PreloaderProvider (src/buffer/ - not used)
```

---

## 🚨 Emergency Recovery

If everything breaks:

```bash
# Option 1: Reset to last working backup
git reset --hard backup/v1.0-working-baseline

# Option 2: Reset to tag
git reset --hard v1.0-working-baseline

# Option 3: View history and pick a commit
git log --oneline
git reset --hard <commit-hash>
```

**⚠️ WARNING**: `git reset --hard` will DELETE all uncommitted changes!

### Safer recovery (keeps changes):
```bash
# Create safety branch first
git checkout -b temp/before-reset

# Then switch back and reset
git checkout main
git reset --hard backup/v1.0-working-baseline
```

---

## 📝 Best Practices

### Before making major changes:

```bash
# 1. Commit current work
git add .
git commit -m "Before trying: [description]"

# 2. Create experimental branch
git checkout -b experiment/[name]

# 3. Make changes...

# 4. If it works, merge back:
git checkout main
git merge experiment/[name]

# 5. If it breaks, abandon:
git checkout main
git branch -D experiment/[name]
```

---

## 🔍 Useful Commands

```bash
# See all branches
git branch -a

# See all tags
git tag -l

# See commit history
git log --oneline --graph --all

# See what branch you're on
git branch

# See status
git status

# See difference between branches
git diff main backup/v1.0-working-baseline
```

---

## 📊 Current State

```bash
$ git branch -v
  backup/v1.0-working-baseline 332ef96 v1.0 - Working baseline
* main                         332ef96 v1.0 - Working baseline
```

Both point to same commit: `332ef96`

---

## ✅ Checklist

- [x] Backup branch created: `backup/v1.0-working-baseline`
- [x] Tag created: `v1.0-working-baseline`
- [x] VERSION_HISTORY.md documented
- [x] On main branch ready to continue
- [ ] Test site works: `http://localhost:5175/QingyuanWan_personal_website/`
- [ ] Verify dot panel halo effect works

---

**Last Updated**: 2025-01-23
**Safe to continue working on**: `main` branch
**Backup stored at**: `backup/v1.0-working-baseline` branch + `v1.0-working-baseline` tag
