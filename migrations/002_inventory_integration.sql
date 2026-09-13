-- Durable cross-system inventory state for Adelaide Wholesale Tyres orders.
alter table orders
  alter column checkout_session_id drop not null,
  add column if not exists inventory_reservation_id uuid,
  add column if not exists inventory_status text not null default 'pending'
    check (inventory_status in ('pending', 'reserved', 'committed', 'released', 'failed')),
  add column if not exists inventory_commit_request_id uuid,
  add column if not exists inventory_release_request_id uuid,
  add column if not exists inventory_committed_at timestamptz,
  add column if not exists inventory_released_at timestamptz;

create unique index if not exists orders_inventory_reservation_id_key
  on orders (inventory_reservation_id) where inventory_reservation_id is not null;
