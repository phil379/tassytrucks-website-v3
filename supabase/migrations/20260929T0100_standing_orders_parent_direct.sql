-- ============================================================================
-- standing_orders: a second recurring-booking channel (parent-direct)
-- Project: knllznbdpejoaiexmdea (tassy-ops)
-- Additive + one NOT NULL relaxed. Safe to re-run. 0 rows at time of writing.
--
-- WHY.
--
-- standing_orders was built for facilities: facility_id NOT NULL, created_by
-- referencing facility_users, payer defaulting to 'facility'. Tassy Scholar is
-- parent-direct — a family books their own child, and there is no facility
-- anywhere in the transaction. The table already has exactly the right shape
-- otherwise (days_of_week, pickup_time, return_time, starts_on, ends_on,
-- active, last_materialised_on), so the honest move is to admit there are now
-- TWO channels rather than invent a placeholder facility for every family.
--
-- The CHECK is the point: a standing order belongs to a facility OR to a
-- student, never both and never neither. Without it, dropping the NOT NULL
-- would allow an orphan row that no owner can be resolved for, which is worse
-- than the restriction it replaces.
--
-- Two columns need no DDL but do need discipline at the call site:
--   payer      — no CHECK constraint (verified live), so 'passenger' is already
--                legal; the 'facility' default is wrong for a parent and the
--                insert must say 'passenger' explicitly.
--   created_by — FKs to facility_users, which a parent-direct booking has none
--                of. It stays NULL, and it is nullable already.
--
-- Why this is safe now and would not be later: standing_orders has 0 rows, so
-- dropping the NOT NULL is instant and reversible. The schedule is the product
-- — Full Year is ~180 school days x 2 runs — so parking it as jsonb on a single
-- trip row would leave nothing able to produce tomorrow's ride, and would leave
-- the table built for exactly this job empty forever. Same work today, a
-- guaranteed migration later.
-- ============================================================================

alter table public.standing_orders
  alter column facility_id drop not null;

alter table public.standing_orders
  add column if not exists student_id uuid references public.students(id) on delete cascade;

-- Postgres has no ADD CONSTRAINT IF NOT EXISTS, so guard it explicitly.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'standing_orders_owner_ck'
  ) then
    alter table public.standing_orders
      add constraint standing_orders_owner_ck
      check (num_nonnulls(facility_id, student_id) = 1);
  end if;
end $$;

comment on column public.standing_orders.student_id is
  'Parent-direct owner (Tassy Scholar). Exactly one of facility_id / student_id '
  'is set, enforced by standing_orders_owner_ck. A parent booking also sets '
  'payer = ''passenger''; the column default ''facility'' suits the other channel.';

-- Two conventions this table never stated, pinned now that it has its first
-- writer. days_of_week is smallint[] with no comment, no rows and no consumer,
-- and 0=Sun vs 1=Mon is exactly the ambiguity that yields an off-by-one day in
-- a materialiser nobody notices until a child is missed.
comment on column public.standing_orders.days_of_week is
  'ISO 8601 day numbers: 1=Mon ... 7=Sun, matching EXTRACT(ISODOW FROM date). '
  'Set explicitly 2026-09-29 when the first writer (Tassy Scholar) landed.';

comment on column public.standing_orders.payer is
  'Who pays. Defaults to ''facility'' for the facility channel; parent-direct '
  '(student_id set) must write ''passenger'' explicitly. No CHECK constraint — '
  'the default is the trap, not the values.';

-- The materialiser sweeps by owner, so index the new one like the old one.
create index if not exists standing_orders_student_idx
  on public.standing_orders (student_id, active);

notify pgrst, 'reload schema';
