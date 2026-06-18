#!/usr/bin/env bash
# One-time setup for Oracle Cloud Ubuntu 22.04 — haastores.com
# Run as root: bash server-setup.sh
set -euo pipefail

echo "=== [1/7] System update ==="
apt-get update -y && apt-get upgrade -y

echo "=== [2/7] Install dependencies ==="
apt-get install -y curl git nginx certbot python3-certbot-nginx \
  build-essential postgresql postgresql-contrib ufw fail2ban

echo "=== [3/7] Node.js 22 via NodeSource ==="
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
npm install -g pnpm@latest pm2

echo "=== [4/7] PostgreSQL: create DB and user ==="
# Edit these before running
DB_NAME="haastores_production"
DB_USER="haastores"
DB_PASS="CHANGE_THIS_STRONG_PASSWORD"

sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

echo "=== [5/7] Firewall ==="
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "=== [6/7] Create app user ==="
useradd -m -s /bin/bash haa 2>/dev/null || true
mkdir -p /home/haa/app
chown haa:haa /home/haa/app

echo "=== [7/7] PM2 startup ==="
pm2 startup systemd -u haa --hp /home/haa

echo ""
echo "✅ Server ready. Next: run deploy-bundle.sh as user 'haa'"
