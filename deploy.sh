#!/usr/bin/env bash
# Manuell deploy av Jockes Taxi till Oderland via rsync över SSH.
# Kör:  ./deploy.sh
set -euo pipefail

SSH_USER="jockesta"
SSH_HOST="premium23.oderland.com"
SSH_PORT="22"
SSH_KEY="$HOME/.ssh/id_rsa_oderland"

# Webbrot på servern (cPanel-konto, primärdomän serveras från ~/public_html).
REMOTE_PATH="public_html"

cd "$(dirname "$0")"

echo "Laddar upp till $SSH_USER@$SSH_HOST:$REMOTE_PATH ..."
rsync -avz \
  --exclude='.git' \
  --exclude='.github' \
  --exclude='node_modules' \
  --exclude='test' \
  --exclude='package.json' \
  --exclude='package-lock.json' \
  --exclude='.htmlvalidate.json' \
  --exclude='.linkinator.config.json' \
  --exclude='.gitignore' \
  --exclude='*.md' \
  --exclude='deploy.sh' \
  --exclude='.claude' \
  --exclude='docs' \
  --exclude='Untitled' \
  -e "ssh -p $SSH_PORT -i $SSH_KEY" \
  ./ "$SSH_USER@$SSH_HOST:$REMOTE_PATH/"

echo "Klart. Kontrollera: https://www.jockestaxi.se/"
