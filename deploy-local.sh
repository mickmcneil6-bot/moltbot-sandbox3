#!/usr/bin/env bash
# deploy-local.sh — Deploy Moltbot from a local folder to Cloudflare Workers
#
# Usage:
#   ./deploy-local.sh              # Full deploy (build + deploy)
#   ./deploy-local.sh --dry-run    # Build only, skip deploy
#
# Prerequisites:
#   1. Node.js 18+ and npm installed
#   2. Cloudflare Workers Paid plan ($5/month)
#   3. Wrangler authenticated: npx wrangler login
#   4. Secrets configured (see below)
#
# Required secrets (set once via wrangler):
#   npx wrangler secret put ANTHROPIC_API_KEY
#   npx wrangler secret put MOLTBOT_GATEWAY_TOKEN
#
# Optional secrets:
#   npx wrangler secret put CF_ACCESS_TEAM_DOMAIN
#   npx wrangler secret put CF_ACCESS_AUD

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log()   { echo -e "${BLUE}[deploy]${NC} $*"; }
ok()    { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
err()   { echo -e "${RED}[✗]${NC} $*" >&2; }

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  warn "Dry run mode — will build but not deploy"
fi

# Step 1: Check prerequisites
log "Checking prerequisites..."

if ! command -v node &>/dev/null; then
  err "Node.js is not installed. Install it from https://nodejs.org/"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if (( NODE_VERSION < 18 )); then
  err "Node.js 18+ required (found v$(node -v))"
  exit 1
fi
ok "Node.js $(node -v)"

if ! command -v npm &>/dev/null; then
  err "npm is not installed"
  exit 1
fi
ok "npm $(npm -v)"

# Step 2: Install dependencies
log "Installing dependencies..."
npm install --prefer-offline 2>&1 | tail -3
ok "Dependencies installed"

# Step 3: Run type check
log "Running type check..."
if npm run typecheck 2>&1; then
  ok "Type check passed"
else
  warn "Type check had warnings (continuing anyway)"
fi

# Step 4: Run tests
log "Running tests..."
if npm test 2>&1; then
  ok "Tests passed"
else
  warn "Some tests failed (continuing anyway — review test output above)"
fi

# Step 5: Build
log "Building project..."
npm run build 2>&1 | tail -10
ok "Build completed"

# Step 6: Deploy
if $DRY_RUN; then
  ok "Dry run complete — skipping deploy"
  log "To deploy for real, run: ./deploy-local.sh"
  exit 0
fi

log "Deploying to Cloudflare Workers..."
echo ""

# Check if wrangler is authenticated
if ! npx wrangler whoami 2>&1 | grep -q "Account"; then
  warn "Wrangler not authenticated. Running login..."
  npx wrangler login
fi

npx wrangler deploy 2>&1

echo ""
ok "Deployment complete!"
echo ""
log "Next steps:"
echo "  1. If first deploy, set required secrets:"
echo "     npx wrangler secret put ANTHROPIC_API_KEY"
echo "     npx wrangler secret put MOLTBOT_GATEWAY_TOKEN"
echo ""
echo "  2. Open the Control UI:"
echo "     https://moltbot-sandbox3.<your-subdomain>.workers.dev/?token=YOUR_TOKEN"
echo ""
echo "  3. Set up Cloudflare Access for the admin UI (recommended):"
echo "     See README.md for details"
