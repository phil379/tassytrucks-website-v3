-- The only WARN-level security lint on this project.
-- trip_requests_set_updated_at was created without a pinned search_path.
-- It touches nothing but NEW, so pinning it is a no-op at runtime and
-- closes the advisory. Body unchanged.

create or replace function public.trip_requests_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
