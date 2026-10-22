#!/usr/bin/env bash
# Builds cv_ssh and the website, uploads both to the server and restarts them.
# Usage: ./deploy.sh   (override with DEPLOY_HOST, DEPLOY_PORT, GOARCH)
set -euo pipefail

host=${DEPLOY_HOST:-ubuntu@henriquelop.es}
port=${DEPLOY_PORT:-2222}
arch=${GOARCH:-amd64}

echo "==> building linux/$arch"
GOOS=linux GOARCH=$arch CGO_ENABLED=0 go build -o dist/cv_ssh .

echo "==> building website"
rm -rf dist/site
go run . site dist/site

echo "==> uploading to $host"
scp -P "$port" dist/cv_ssh deploy/Caddyfile "$host:/tmp/"
tar -C dist/site -czf - . | ssh -p "$port" "$host" 'rm -rf /tmp/site && mkdir /tmp/site && tar -C /tmp/site -xzf -'

echo "==> installing and restarting"
ssh -p "$port" "$host" '
  sudo install -m 755 /tmp/cv_ssh /opt/cv_ssh/cv_ssh &&
  sudo mkdir -p /var/www/henriquelop.es &&
  sudo rsync -a --delete /tmp/site/ /var/www/henriquelop.es/ &&
  sudo install -m 644 /tmp/Caddyfile /etc/caddy/Caddyfile &&
  rm -rf /tmp/cv_ssh /tmp/Caddyfile /tmp/site &&
  sudo systemctl restart cv_ssh &&
  sudo systemctl reload caddy &&
  systemctl is-active cv_ssh caddy
'

echo "==> done: ssh henriquelop.es and https://henriquelop.es"
