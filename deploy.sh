#!/usr/bin/env bash
# Builds cv_ssh for Linux, uploads it to the server and restarts the service.
# Usage: ./deploy.sh   (override with DEPLOY_HOST, DEPLOY_PORT, GOARCH)
set -euo pipefail

host=${DEPLOY_HOST:-ubuntu@henriquelop.es}
port=${DEPLOY_PORT:-2222}
arch=${GOARCH:-amd64}

echo "==> building linux/$arch"
GOOS=linux GOARCH=$arch CGO_ENABLED=0 go build -o dist/cv_ssh .

echo "==> uploading to $host"
scp -P "$port" dist/cv_ssh "$host:/tmp/cv_ssh.new"

echo "==> restarting service"
ssh -p "$port" "$host" '
  sudo install -m 755 /tmp/cv_ssh.new /opt/cv_ssh/cv_ssh &&
  rm /tmp/cv_ssh.new &&
  sudo systemctl restart cv_ssh &&
  systemctl is-active cv_ssh
'

echo "==> done: ssh henriquelop.es"
