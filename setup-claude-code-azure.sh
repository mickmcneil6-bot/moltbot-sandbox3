#!/usr/bin/env bash
# Setup script for Claude Code with Azure
# This script installs Claude Code and Azure CLI, then guides you through configuration.

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BOLD}=== Claude Code + Azure Setup ===${NC}\n"

# ─── 1. Install Claude Code ───────────────────────────────────────────────────
echo -e "${CYAN}Step 1: Installing Claude Code...${NC}"
if command -v claude &>/dev/null; then
  echo -e "${GREEN}Claude Code is already installed:${NC} $(claude --version 2>/dev/null || echo 'installed')"
else
  echo "Installing @anthropic-ai/claude-code globally via npm..."
  npm install -g @anthropic-ai/claude-code
  echo -e "${GREEN}Claude Code installed successfully.${NC}"
fi

# ─── 2. Install Azure CLI ─────────────────────────────────────────────────────
echo -e "\n${CYAN}Step 2: Installing Azure CLI...${NC}"
if command -v az &>/dev/null; then
  echo -e "${GREEN}Azure CLI is already installed:${NC} $(az version --output tsv 2>/dev/null | head -1)"
else
  # Detect OS and install accordingly
  if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v brew &>/dev/null; then
      echo "Installing Azure CLI via Homebrew..."
      brew install azure-cli
    else
      echo -e "${YELLOW}Homebrew not found. Install Azure CLI manually:${NC}"
      echo "  https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-macos"
      exit 1
    fi
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Installing Azure CLI on Linux..."
    curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
  else
    echo -e "${YELLOW}Unsupported OS. Install Azure CLI manually:${NC}"
    echo "  https://learn.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
  fi
  echo -e "${GREEN}Azure CLI installed successfully.${NC}"
fi

# ─── 3. Azure Login ───────────────────────────────────────────────────────────
echo -e "\n${CYAN}Step 3: Azure authentication...${NC}"
if az account show &>/dev/null 2>&1; then
  ACCOUNT=$(az account show --query user.name -o tsv 2>/dev/null)
  echo -e "${GREEN}Already logged in as:${NC} $ACCOUNT"
else
  echo "Logging in to Azure..."
  az login
fi

# ─── 4. Configure Claude Code for Azure ───────────────────────────────────────
echo -e "\n${CYAN}Step 4: Configuring Claude Code for Azure...${NC}"
echo -e "To use Claude Code with an Azure-hosted Anthropic endpoint, set these"
echo -e "environment variables before running ${BOLD}claude${NC}:"
echo ""
echo -e "  ${BOLD}export ANTHROPIC_API_KEY=\$(az keyvault secret show \\${NC}"
echo -e "  ${BOLD}  --vault-name <your-vault> --name anthropic-api-key \\${NC}"
echo -e "  ${BOLD}  --query value -o tsv)${NC}"
echo ""
echo -e "Or add your Anthropic API key directly:"
echo -e "  ${BOLD}export ANTHROPIC_API_KEY=sk-ant-...${NC}"
echo ""
echo -e "If using Azure OpenAI as a proxy, also set:"
echo -e "  ${BOLD}export ANTHROPIC_BASE_URL=https://<resource>.openai.azure.com${NC}"

# ─── 5. Project dependencies ──────────────────────────────────────────────────
echo -e "\n${CYAN}Step 5: Installing project dependencies...${NC}"
if [ -f "package-lock.json" ]; then
  npm ci
else
  npm install
fi
echo -e "${GREEN}Dependencies installed.${NC}"

# ─── 6. Ready ─────────────────────────────────────────────────────────────────
echo -e "\n${GREEN}${BOLD}Setup complete!${NC}"
echo -e "\nTo start Claude Code, run:"
echo -e "  ${BOLD}claude${NC}"
echo ""
echo -e "Useful commands:"
echo -e "  ${BOLD}npm test${NC}          # Run tests"
echo -e "  ${BOLD}npm run build${NC}     # Build worker + client"
echo -e "  ${BOLD}npm run start${NC}     # Local dev with wrangler"
echo -e "  ${BOLD}npm run deploy${NC}    # Deploy to Cloudflare"
