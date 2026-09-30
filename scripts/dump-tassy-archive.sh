#!/usr/bin/env bash
#
# Copy the Tassy tables OUT of the T-Gigs database, so they can be moved into the
# Tassy database and the two businesses stop sharing one Postgres.
#
# READ-ONLY. Nothing in either database is changed. This only writes two .sql files
# into the tassytrucksops repo.
#
# WHY IT USES A THROWAWAY FOLDER
# Linking the Supabase CLI inside ~/code/tassytrucksops would be dangerous: that repo
# holds 106 migration files that do NOT describe the live database, and one
# `supabase db push` from a linked repo would try to apply all 106 to production --
# the database shared with T-Gigs. supabase/config.toml deliberately points at
# nothing for exactly that reason. A scratch folder has the project ref and NO
# migrations, so there is nothing for a stray push to push.
#
# You will be asked for the database password once. Type it at the prompt -- do not
# put it on the command line, where it would land in ~/.zsh_history.

set -euo pipefail

SCRATCH_TRAP="$HOME/.tassy-dump-scratch"
# A folder still linked to a production database is a footgun, so remove it on ANY
# exit -- success, failure, or Ctrl-C. The first run died at the login step and left
# one behind.
trap 'cd "$HOME" 2>/dev/null || true; rm -rf "$SCRATCH_TRAP"' EXIT

REF="wbspkoudvkkuknehwuid"                      # the T-Gigs database
OUT="$HOME/code/tassytrucksops/docs/migrations_pending"
SCRATCH="$HOME/.tassy-dump-scratch"

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found. Install it with:  brew install supabase/tap/supabase"
  exit 1
fi

# The CLI needs an account token before it can link. Phil hit this on the first run:
# "Access token not provided." Do NOT reach for SUPABASE_ACCESS_TOKEN out of
# .env.local -- that is the sbp_ personal token that has been flagged for revocation
# since 2026-09-25. `supabase login` opens a browser and stores its own.
if ! supabase projects list >/dev/null 2>&1; then
  echo "=== 0/3 signing the Supabase CLI in (a browser window will open) ==="
  supabase login
  echo
fi
if [ ! -d "$OUT" ]; then
  echo "Can't find $OUT -- is the tassytrucksops repo at ~/code/tassytrucksops ?"
  exit 1
fi

echo "=== 1/3 preparing a throwaway folder (no migrations in it) ==="
rm -rf "$SCRATCH"
mkdir -p "$SCRATCH"
cd "$SCRATCH"
supabase init --yes >/dev/null

echo
echo "=== 2/3 linking to the T-Gigs database ==="
echo "    You'll be asked for the database password. If you don't have it, reset it at:"
echo "    https://supabase.com/dashboard/project/$REF/settings/database"
echo
supabase link --project-ref "$REF"

echo
echo "=== 3/3 dumping the tassy_archive schema ==="
# No --use-copy: plain INSERT statements are what let the 16 rows that are tied to
# T-Gigs drivers and reservations be stripped out before anything is applied.
supabase db dump --linked --schema tassy_archive -f "$OUT/SPLIT_01_schema.sql"
supabase db dump --linked --schema tassy_archive --data-only -f "$OUT/SPLIT_02_data.sql"

cd "$HOME"   # the trap removes $SCRATCH on exit

echo
echo "Done. Two files written:"
ls -lh "$OUT/SPLIT_01_schema.sql" "$OUT/SPLIT_02_data.sql"
echo
echo "Scratch folder deleted. Nothing was changed in either database."
echo "Tell Claude 'the dump is done' and it takes it from here."
