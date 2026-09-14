#!/usr/bin/env bash
# Local cross-system proof, fully offline:
#
#   website next start (:3100) -> fault-injecting proxy (:3102) -> 247 next start (:3101) -> local Supabase
#   Stripe + Resend stand-in (:3103)
#
# Prerequisites: `npm run build` in BOTH repos, the local 247 Supabase running
# (`npx supabase start` in the 247 repo), and Docker (for the REG location lookup).
# Every secret-bearing variable is overridden with a local/fake value so nothing
# from either repo's .env.local can reach a hosted service.
#
#   bash scripts/run-cross-system-local.sh            # from adelaide-wholesale-tyres
#   INVENTORY_APP_DIR=... to point at a different 247 checkout
set -u
AWT="$(cd "$(dirname "$0")/.." && pwd)"
INV="${INVENTORY_APP_DIR:-$AWT/../247truck/inventory-app}"
OUT="$AWT/test-results"
mkdir -p "$OUT"

# Local Supabase credentials come from the 247 repo's .env.local (loopback project only).
set -a; . "$INV/.env.local"; set +a
case "${SUPABASE_TEST_URL:-}" in http://127.0.0.1:55331|http://localhost:55331) ;; *) echo "SUPABASE_TEST_URL must be the local project"; exit 1;; esac
export SUPABASE_TEST_ALLOW_DESTRUCTIVE=true
REG_LOCATION=$(docker exec supabase_db_247truck-inventory psql -U postgres -At -c "select id from public.locations where code='REG'")
CLIENT_ID=awt-cross-system
SECRET=cross-system-shared-secret-0123456789abcdef
CRON=cross-system-cron-secret-0123456789abcdef
WEBHOOK=whsec_cross_system_test_secret

# Fresh disposable order database (supabase db reset drops it, so always recreate).
DB=$(cd "$AWT" && node scripts/prepare-local-order-db.mjs --fresh 2>/dev/null | tail -1)
[ -n "$DB" ] || { echo "could not prepare the local order database"; exit 1; }

( cd "$INV" && AWT_INVENTORY_CLIENT_ID=$CLIENT_ID AWT_INVENTORY_CLIENT_SECRET=$SECRET AWT_INVENTORY_LOCATION_ID=$REG_LOCATION CRON_SECRET=$CRON \
    npx next start -p 3101 > "$OUT/247-server.log" 2>&1 ) &
P247=$!
( cd "$AWT" && DATABASE_URL=$DB POSTGRES_URL=$DB \
    INVENTORY_API_URL=http://127.0.0.1:3102 INVENTORY_ALLOW_INSECURE_LOOPBACK=true \
    INVENTORY_CLIENT_ID=$CLIENT_ID INVENTORY_CLIENT_SECRET=$SECRET INVENTORY_LOCATION_ID=$REG_LOCATION \
    STRIPE_SECRET_KEY=sk_test_signing_only STRIPE_API_BASE=http://127.0.0.1:3103 STRIPE_WEBHOOK_SECRET=$WEBHOOK \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_local \
    RESEND_API_KEY=re_local_standin NOTIFY_API_BASE=http://127.0.0.1:3103 ENQUIRY_TO_EMAIL=orders@example.test ENQUIRY_FROM_EMAIL=site@example.test \
    CRON_SECRET=$CRON NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100 \
    npx next start -p 3100 > "$OUT/awt-server.log" 2>&1 ) &
PAWT=$!

cleanup() {
  kill $P247 $PAWT 2>/dev/null
  # `npx next start` re-spawns node; on Windows the child outlives the shell job.
  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { \$_.Name -eq 'node.exe' -and \$_.CommandLine -match 'next.? start -p 310[01]|next-server' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force }" >/dev/null 2>&1
  fi
}
trap cleanup EXIT

for _ in $(seq 1 60); do
  curl -fsS --max-time 2 http://127.0.0.1:3100/api/checkout/status >/dev/null 2>&1 && \
  [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 http://127.0.0.1:3101/api/integrations/adelaide/health)" = "401" ] && break
  sleep 2
done

cd "$AWT"
export AWT_BASE_URL=http://127.0.0.1:3100 INVENTORY_UPSTREAM_URL=http://127.0.0.1:3101 INVENTORY_PROXY_PORT=3102 STRIPE_STANDIN_PORT=3103
export STRIPE_WEBHOOK_SECRET=$WEBHOOK ADELAIDE_DATABASE_URL=$DB DATABASE_URL=$DB CRON_SECRET=$CRON
export INVENTORY_CLIENT_ID=$CLIENT_ID INVENTORY_DATABASE_URL="postgres://postgres:postgres@127.0.0.1:55332/postgres"
# The HTTP proof first (it owns the notification stand-in), then the store-level suites on the same database.
node --conditions=react-server --test tests/cross-system/inventory-e2e.test.mjs > "$OUT/cross-system.log" 2>&1; E2E=$?
node --conditions=react-server --test tests/cross-system/outbox-postgres.test.mjs tests/cross-system/order-store-upgrade.test.mjs > "$OUT/cross-system-store.log" 2>&1; STORE=$?
for log in cross-system cross-system-store; do echo "== $log"; grep -E "^not ok|^# (tests|pass|fail|skipped)" "$OUT/$log.log"; done
[ "$E2E" -eq 0 ] && [ "$STORE" -eq 0 ]
