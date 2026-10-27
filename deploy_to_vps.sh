#!/usr/bin/env bash
set -e

VPS_HOST="root@91.108.120.247"
REMOTE_DIR="/var/www/lumos"

echo "=========================================="
echo "🚀 Deploying LumosWalk to ${VPS_HOST}"
echo "=========================================="

# 1. Build Frontend Production Assets
echo "📦 Step 1: Building Frontend static bundle..."
cd "$(dirname "$0")"
PATH="/opt/homebrew/bin:$PATH" npm run build

# 2. Ensure remote directories exist
echo "📁 Step 2: Preparing remote directory structure on VPS..."
ssh "${VPS_HOST}" "mkdir -p ${REMOTE_DIR}/backend ${REMOTE_DIR}/frontend"

# 3. Rsync Backend code & datasets (excluding virtual environments and caches)
echo "🚚 Step 3: Syncing Backend to ${VPS_HOST}..."
rsync -avz --delete \
  --exclude '.venv' \
  --exclude '__pycache__' \
  --exclude '.git' \
  --exclude '.DS_Store' \
  /Users/nguyenanhkiet/Documents/Lodz/lumos-backend/ \
  "${VPS_HOST}:${REMOTE_DIR}/backend/"

# 4. Rsync Frontend production dist
echo "🚚 Step 4: Syncing Frontend build to ${VPS_HOST}..."
rsync -avz --delete \
  dist/ \
  "${VPS_HOST}:${REMOTE_DIR}/frontend/"

# 5. Remote server setup: ensure systemd service & dependencies are active
echo "⚡ Step 5: Updating remote backend environment & restarting services..."
ssh "${VPS_HOST}" bash << 'EOF'
set -e
cd /var/www/lumos/backend

# Ensure venv exists
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    apt-get update && apt-get install -y python3-venv python3-pip
    python3 -m venv .venv
fi

# Install / update requirements
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt

# Ensure systemd service exists
if [ ! -f "/etc/systemd/system/lumos.service" ]; then
    echo "Creating systemd lumos.service..."
    cat << 'SERVICE_EOF' > /etc/systemd/system/lumos.service
[Unit]
Description=LumosWalk FastAPI Solar Routing Engine
After=network.target

[Service]
User=root
WorkingDirectory=/var/www/lumos/backend
ExecStart=/var/www/lumos/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
SERVICE_EOF
    systemctl daemon-reload
    systemctl enable lumos
fi

# Restart backend service
systemctl restart lumos
systemctl is-active --quiet lumos && echo "✅ Backend service is active and running!"

# Ensure Nginx site configuration exists
if [ ! -f "/etc/nginx/sites-available/lumos" ]; then
    echo "Creating Nginx configuration..."
    cat << 'NGINX_EOF' > /etc/nginx/sites-available/lumos
server {
    listen 80;
    server_name _;

    root /var/www/lumos/frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_EOF
    ln -sf /etc/nginx/sites-available/lumos /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
fi

EOF

echo "=========================================="
echo "🎉 Deployment Complete!"
echo "Visit: http://91.108.120.247"
echo "=========================================="
