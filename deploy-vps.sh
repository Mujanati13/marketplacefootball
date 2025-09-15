#!/bin/bash

# ==============================================================================
# VPS DEPLOYMENT SCRIPT FOR FOOTBALL MARKETPLACE
# ==============================================================================
# This script helps set up the production environment on your VPS
# Domain: https://footbalmarketplace.albech.me
# ==============================================================================

echo "🚀 Starting Football Marketplace VPS Deployment Setup"
echo "======================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ This script should not be run as root${NC}"
   exit 1
fi

echo -e "${YELLOW}📋 Pre-deployment Checklist:${NC}"
echo "1. ✅ VPS server with Ubuntu 20.04+ or CentOS 8+"
echo "2. ✅ Domain pointed to VPS IP: footbalmarketplace.albech.me"
echo "3. ✅ SSL certificate (Let's Encrypt recommended)"
echo "4. ✅ MySQL/MariaDB installed and running"
echo "5. ✅ Node.js 18+ installed"
echo "6. ✅ Nginx or Apache web server installed"
echo "7. ✅ PM2 process manager installed globally"
echo ""

read -p "Have you completed all the above requirements? (y/N): " confirm
if [[ $confirm != [yY] ]]; then
    echo -e "${RED}❌ Please complete the requirements first${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Starting deployment process...${NC}"

# Create application directory
APP_DIR="/var/www/footbalmarketplace"
UPLOAD_DIR="/var/www/footbalmarketplace/uploads"
LOG_DIR="/var/log/football-marketplace"
BACKUP_DIR="/var/backups/football-marketplace"

echo -e "${YELLOW}📁 Creating application directories...${NC}"
sudo mkdir -p $APP_DIR
sudo mkdir -p $UPLOAD_DIR
sudo mkdir -p $LOG_DIR
sudo mkdir -p $BACKUP_DIR

# Set ownership (replace 'your-user' with actual user)
sudo chown -R $USER:$USER $APP_DIR
sudo chown -R $USER:$USER $UPLOAD_DIR
sudo chmod -R 755 $UPLOAD_DIR

echo -e "${YELLOW}🗄️ Database Setup${NC}"
echo "Please create the production database:"
echo "1. Login to MySQL: mysql -u root -p"
echo "2. Create database: CREATE DATABASE football_marketplace_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "3. Create user: CREATE USER 'football_user'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD_HERE';"
echo "4. Grant privileges: GRANT ALL PRIVILEGES ON football_marketplace_prod.* TO 'football_user'@'localhost';"
echo "5. Flush privileges: FLUSH PRIVILEGES;"
echo ""
read -p "Have you created the database and user? (y/N): " db_confirm
if [[ $db_confirm != [yY] ]]; then
    echo -e "${RED}❌ Please create the database first${NC}"
    exit 1
fi

echo -e "${YELLOW}🔧 Environment Configuration${NC}"
echo "The .env.production file has been created with all necessary variables."
echo "Please update the following in .env.production:"
echo "1. 🔐 Change ALL secret keys (JWT_SECRET, JWT_REFRESH_SECRET, etc.)"
echo "2. 🗄️ Update database credentials (DB_PASSWORD, DB_USER)"
echo "3. 📧 Configure email settings if needed"
echo "4. 🔒 Set proper file permissions: chmod 600 .env.production"
echo ""

echo -e "${YELLOW}📦 Deployment Commands${NC}"
echo "Run these commands on your VPS:"
echo ""
echo "# 1. Copy files to VPS"
echo "scp -r /path/to/your/project/* your-user@your-vps-ip:$APP_DIR/"
echo ""
echo "# 2. Install dependencies"
echo "cd $APP_DIR"
echo "npm ci --production"
echo ""
echo "# 3. Copy and configure environment"
echo "cp .env.production .env"
echo "chmod 600 .env"
echo "nano .env  # Edit the secrets and database credentials"
echo ""
echo "# 4. Run database migrations"
echo "npm run migrate"
echo ""
echo "# 5. Seed initial data (optional)"
echo "npm run seed"
echo ""
echo "# 6. Test the application"
echo "npm start"
echo ""
echo "# 7. Set up PM2 for production"
echo "pm2 start ecosystem.config.js"
echo "pm2 save"
echo "pm2 startup"
echo ""

echo -e "${YELLOW}🌐 Nginx Configuration${NC}"
echo "Create /etc/nginx/sites-available/footbalmarketplace.albech.me:"

cat << 'EOF'
server {
    listen 80;
    server_name footbalmarketplace.albech.me www.footbalmarketplace.albech.me;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name footbalmarketplace.albech.me www.footbalmarketplace.albech.me;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/footbalmarketplace.albech.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/footbalmarketplace.albech.me/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Socket.IO proxy
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files and uploads
    location /uploads/ {
        alias /var/www/footbalmarketplace/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Admin panel
    location /admin/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security
    location ~ /\. {
        deny all;
    }

    # Logging
    access_log /var/log/nginx/footbalmarketplace_access.log;
    error_log /var/log/nginx/footbalmarketplace_error.log;
}
EOF

echo ""
echo "Enable the site:"
echo "sudo ln -s /etc/nginx/sites-available/footbalmarketplace.albech.me /etc/nginx/sites-enabled/"
echo "sudo nginx -t && sudo systemctl reload nginx"
echo ""

echo -e "${YELLOW}🔒 SSL Certificate with Let's Encrypt${NC}"
echo "If you haven't set up SSL yet:"
echo "sudo apt install certbot python3-certbot-nginx"
echo "sudo certbot --nginx -d footbalmarketplace.albech.me -d www.footbalmarketplace.albech.me"
echo ""

echo -e "${YELLOW}🔧 System Service (Alternative to PM2)${NC}"
echo "Create /etc/systemd/system/football-marketplace.service:"

cat << 'EOF'
[Unit]
Description=Football Marketplace Node.js Application
After=network.target mysql.service

[Service]
Type=simple
User=your-user
Group=your-user
WorkingDirectory=/var/www/footbalmarketplace
Environment=NODE_ENV=production
ExecStart=/usr/bin/node bin/www
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=football-marketplace

[Install]
WantedBy=multi-user.target
EOF

echo ""
echo "Enable and start the service:"
echo "sudo systemctl daemon-reload"
echo "sudo systemctl enable football-marketplace"
echo "sudo systemctl start football-marketplace"
echo ""

echo -e "${YELLOW}📊 Monitoring & Logs${NC}"
echo "View logs:"
echo "sudo journalctl -u football-marketplace -f"
echo "tail -f /var/log/football-marketplace/app.log"
echo ""

echo -e "${YELLOW}🔄 Backup Script${NC}"
echo "Create automated backup script at /usr/local/bin/backup-football-marketplace.sh:"

cat << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/football-marketplace"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="football_marketplace_prod"
DB_USER="football_user"
DB_PASSWORD="your_db_password_here"

# Create backup directory
mkdir -p $BACKUP_DIR/$DATE

# Backup database
mysqldump -u$DB_USER -p$DB_PASSWORD $DB_NAME > $BACKUP_DIR/$DATE/database.sql

# Backup uploads
tar -czf $BACKUP_DIR/$DATE/uploads.tar.gz /var/www/footbalmarketplace/uploads/

# Remove backups older than 30 days
find $BACKUP_DIR -type d -mtime +30 -exec rm -rf {} +

echo "Backup completed: $DATE"
EOF

echo ""
echo "Make executable and add to cron:"
echo "sudo chmod +x /usr/local/bin/backup-football-marketplace.sh"
echo "Add to crontab: 0 2 * * * /usr/local/bin/backup-football-marketplace.sh"
echo ""

echo -e "${GREEN}✅ Deployment setup completed!${NC}"
echo ""
echo -e "${YELLOW}🚀 Final Steps:${NC}"
echo "1. Update all secrets in .env file"
echo "2. Test the application locally: npm start"
echo "3. Configure Nginx and SSL"
echo "4. Start the application with PM2 or systemd"
echo "5. Test the API endpoints"
echo "6. Set up monitoring and backups"
echo ""
echo -e "${GREEN}🎉 Your Football Marketplace should be live at: https://footbalmarketplace.albech.me${NC}"
