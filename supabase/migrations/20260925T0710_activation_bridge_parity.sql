-- Parity columns so the existing activation bridge can write here instead of
-- into the other business's tables. Names match what that code already
-- produces, so the repoint is a client swap rather than a rewrite.
alter table public.drivers
  add column if not exists driver_code   text,
  add column if not exists is_test_data  boolean not null default false,
  add column if not exists invited_by    uuid;

-- The bridge's idempotency key. It recovers from a half-finished activation by
-- looking the driver up by this code before inserting, so it must be unique.
create unique index if not exists drivers_driver_code_unique_when_set
  on public.drivers (driver_code) where driver_code is not null;

alter table public.vehicles
  add column if not exists vehicle_number text,
  add column if not exists is_test_data   boolean not null default false;

create unique index if not exists vehicles_vin_unique_when_set
  on public.vehicles (vin) where vin is not null;

-- Widen credentials.kind to cover the two document types the applicant wizard
-- already collects that the original enum missed: PASS (Passenger Assistance,
-- Safety & Sensitivity — the NEMT certification) and first aid. A widening,
-- not a change: every existing value stays legal.
alter table public.credentials drop constraint if exists credentials_kind_check;
alter table public.credentials add constraint credentials_kind_check check (kind in (
  'drivers_license', 'auto_insurance', 'vehicle_registration', 'vehicle_inspection',
  'cna_certification', 'cpr', 'first_aid', 'pass_certificate', 'tb_test', 'background_check'
));

-- Where a credential came from, so re-running activation updates rather than
-- duplicates. Cross-project reference to tassy_archive.applicant_documents.
alter table public.credentials
  add column if not exists source_document_id uuid;

create unique index if not exists credentials_source_document_unique
  on public.credentials (source_document_id) where source_document_id is not null;
