-- Payment confirmation and inventory delivery are separate systems.  This
-- durable outbox is written in the same transaction that marks an order paid.
create table if not exists order_refund_receipts (
  payment_intent_id text primary key,
  stripe_event_id text not null unique,
  received_at timestamptz not null default now()
);
alter table order_refund_receipts enable row level security;
revoke all on order_refund_receipts from public,anon,authenticated,service_role;
alter table orders drop constraint if exists orders_inventory_status_check;
alter table orders add constraint orders_inventory_status_check check (
  inventory_status in ('pending','reserved','failed','commit_pending','committed','release_pending','released','manual_review')
);
alter table orders add column if not exists fulfilment_ready_at timestamptz;
alter table orders add column if not exists notification_owner text;
alter table orders add column if not exists notification_next_attempt_at timestamptz not null default now();
alter table orders add column if not exists notification_attempts integer not null default 0;

create table if not exists inventory_outbox (
  operation_id uuid primary key,
  order_reference text not null references orders(reference),
  operation text not null check (operation in ('commit','release')),
  state text not null default 'pending' check (state in ('pending','processing','completed','manual_review')),
  reservation_id uuid not null,
  request_id uuid not null unique,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  lease_owner text,
  lease_expires_at timestamptz,
  last_attempt_at timestamptz,
  last_error_code text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_reference, operation)
);

create index if not exists inventory_outbox_due_idx
  on inventory_outbox (next_attempt_at, created_at, operation_id)
  where state in ('pending','processing');

create table if not exists order_inventory_audit (
  id bigint generated always as identity primary key,
  order_reference text not null references orders(reference),
  event_type text not null,
  stripe_event_id text,
  operation_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists order_inventory_audit_order_idx
  on order_inventory_audit (order_reference, created_at, id);

alter table orders enable row level security;
alter table stripe_events enable row level security;
alter table inventory_outbox enable row level security;
alter table order_inventory_audit enable row level security;
revoke all on orders,stripe_events,inventory_outbox,order_inventory_audit from public;
do $$ declare role_name text; begin
  foreach role_name in array array['anon','authenticated','service_role'] loop
    if exists(select 1 from pg_roles where rolname=role_name) then
      execute format('revoke all on orders,stripe_events,inventory_outbox,order_inventory_audit from %I',role_name);
    end if;
  end loop;
end $$;

-- Preserve historical status while making confirmed paid work recoverable.
insert into inventory_outbox(operation_id,order_reference,operation,reservation_id,request_id)
select inventory_commit_request_id,reference,'commit',inventory_reservation_id,inventory_commit_request_id
from orders where status='paid' and inventory_status<>'committed'
  and inventory_reservation_id is not null and inventory_commit_request_id is not null
on conflict do nothing;
update orders set inventory_status=case when inventory_reservation_id is null or inventory_commit_request_id is null
  then 'manual_review' else 'commit_pending' end
where status='paid' and inventory_status not in ('committed','manual_review');
