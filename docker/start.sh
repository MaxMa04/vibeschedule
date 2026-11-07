#!/bin/bash
set -e

pnpm run prisma-db-push

(cd apps/backend && node --experimental-require-module ./dist/apps/backend/src/main.js) &
(cd apps/frontend && next start -p 4200) &
nginx -g 'daemon off;' &

# exit as soon as one process dies, Coolify restarts the container
wait -n
exit 1
