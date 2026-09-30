#!/usr/bin/env bash
# Push both Tassy repos and say plainly what went out.
#
# Why this exists: Claude can write and commit in these repos, but its shell is
# sandboxed away from the GitHub credentials, so it cannot push. This is the
# one step that has to run as you. It is read-only about your work -- it
# pushes what is already committed and never rewrites, forces or deletes.
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

for repo in tassytrucks-website-v3 tassytrucksops; do
  dir="$ROOT/$repo"
  [ -d "$dir/.git" ] || { printf '\n%s: not found, skipping\n' "$repo"; continue; }
  cd "$dir" || continue

  printf '\n=== %s ===\n' "$repo"
  git fetch -q origin 2>/dev/null

  pending="$(git log --oneline origin/main..main 2>/dev/null)"
  if [ -z "$pending" ]; then
    echo "nothing to push"
    continue
  fi

  echo "$pending"
  if git push origin main 2>&1 | tail -2; then
    echo "pushed."
  else
    echo "PUSH FAILED -- nothing was lost, your commits are still here."
  fi
done

printf '\nDone.\n'
