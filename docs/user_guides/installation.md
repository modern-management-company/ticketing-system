# Installation Guide

This guide provides detailed step-by-step instructions for installing and configuring the Modern Management Ticketing System.

## Prerequisites

Before beginning the installation, ensure you have:

### System Requirements

- **Operating System**:
  - Linux: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
  - Windows Server 2019+
  - MacOS (development only)

- **Hardware Requirements**:
  - Minimum: 4GB RAM, 2 CPU cores, 100GB storage
  - Recommended: 8GB RAM, 4 CPU cores, 200GB+ SSD storage
  - Production: 16GB RAM, 8 CPU cores, 500GB+ SSD storage with redundancy

- **Software Requirements**:
  - Web Server: Nginx 1.18+ or Apache 2.4+
  - Database: PostgreSQL 12+ or MySQL 8.0+
  - Runtime: Node.js 16+ and PHP 8.0+
  - Docker & Docker Compose (optional for containerized deployment)

- **Network Requirements**:
  - Outbound email (SMTP) access
  - Outbound SMS gateway access (if using SMS features)
  - HTTPS certificate (Let's Encrypt or commercial)
  - Static IP address recommended

### Required Access

- Root/administrator access to the server
- Database administration credentials
- Domain name configured to point to your server
- SMTP server credentials

## Installation Methods

Choose one of the following installation methods:

### Method 1: Standard Installation

Follow these instructions for a traditional installation directly on a server.

#### Step 1: Prepare the Server

1. Update your system packages:

   **For Ubuntu/Debian:**
   ```bash
   sudo apt update
   sudo apt upgrade -y
   ```

   **For CentOS/RHEL:**
   ```bash
   sudo dnf update -y
   ```

2. Install required dependencies:

   **For Ubuntu/Debian:**
   ```bash
   sudo apt install -y nginx postgresql php8.0-fpm php8.0-pgsql php8.0-mbstring \
   php8.0-xml php8.0-curl php8.0-zip php8.0-gd php8.0-bcmath \
   nodejs npm curl unzip git
   ```

   **For CentOS/RHEL:**
   ```bash
   sudo dnf install -y nginx postgresql-server php php-pgsql php-mbstring \
   php-xml php-curl php-zip php-gd php-bcmath nodejs npm curl unzip git
   ```

3. Configure PostgreSQL:

   ```bash
   sudo systemctl enable postgresql
   sudo systemctl start postgresql
   sudo -u postgres createuser -P ticketing_user
   # Enter a secure password when prompted
   sudo -u postgres createdb -O ticketing_user ticketing_db
   ```

#### Step 2: Download and Prepare Application Files

1. Download the application:

   ```bash
   cd /var/www
   sudo mkdir ticketing
   sudo chown $(whoami):$(whoami) ticketing
   cd ticketing
   curl -LO https://example.com/downloads/ticketing-system-latest.zip
   unzip ticketing-system-latest.zip
   rm ticketing-system-latest.zip
   ```

2. Install application dependencies:

   ```bash
   # Backend dependencies
   cd backend
   composer install --no-dev --optimize-autoloader
   
   # Frontend dependencies
   cd ../frontend
   npm install
   npm run build
   ```

#### Step 3: Configure the Application

1. Create environment configuration:

   ```bash
   cd /var/www/ticketing/backend
   cp .env.example .env
   ```

2. Edit the `.env` file with your specific settings:

   ```bash
   nano .env
   ```

   Update the following values:
   ```
   APP_NAME="Modern Management Ticketing System"
   APP_URL=https://your-domain.com
   
   DB_CONNECTION=pgsql
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_DATABASE=ticketing_db
   DB_USERNAME=ticketing_user
   DB_PASSWORD=your_secure_password
   
   MAIL_HOST=your_smtp_server
   MAIL_PORT=587
   MAIL_USERNAME=your_smtp_username
   MAIL_PASSWORD=your_smtp_password
   MAIL_ENCRYPTION=tls
   MAIL_FROM_ADDRESS=no-reply@your-domain.com
   
   # Set application encryption key
   ```

3. Generate application keys:

   ```bash
   php artisan key:generate
   ```

4. Run database migrations:

   ```bash
   php artisan migrate --seed
   ```

5. Set proper permissions:

   ```bash
   sudo chown -R www-data:www-data /var/www/ticketing
   sudo chmod -R 755 /var/www/ticketing/storage
   sudo chmod -R 755 /var/www/ticketing/bootstrap/cache
   ```

#### Step 4: Configure Web Server

1. Create Nginx configuration:

   ```bash
   sudo nano /etc/nginx/sites-available/ticketing
   ```

   Add the following configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       root /var/www/ticketing/public;
   
       add_header X-Frame-Options "SAMEORIGIN";
       add_header X-Content-Type-Options "nosniff";
   
       index index.php;
   
       charset utf-8;
   
       location / {
           try_files $uri $uri/ /index.php?$query_string;
       }
   
       location = /favicon.ico { access_log off; log_not_found off; }
       location = /robots.txt  { access_log off; log_not_found off; }
   
       error_page 404 /index.php;
   
       location ~ \.php$ {
           fastcgi_pass unix:/var/run/php/php8.0-fpm.sock;
           fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
           include fastcgi_params;
       }
   
       location ~ /\.(?!well-known).* {
           deny all;
       }
   }
   ```

2. Enable the site:

   ```bash
   sudo ln -s /etc/nginx/sites-available/ticketing /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

3. Configure HTTPS with Let's Encrypt:

   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

#### Step 5: Configure Background Jobs

1. Set up cron job for scheduled tasks:

   ```bash
   sudo crontab -e
   ```

   Add the following line:
   ```
   * * * * * cd /var/www/ticketing && php artisan schedule:run >> /dev/null 2>&1
   ```

2. Set up queue worker as a service:

   ```bash
   sudo nano /etc/systemd/system/ticketing-queue.service
   ```

   Add the following:
   ```
   [Unit]
   Description=Ticketing System Queue Worker
   After=network.target

   [Service]
   User=www-data
   Group=www-data
   WorkingDirectory=/var/www/ticketing
   ExecStart=/usr/bin/php artisan queue:work --sleep=3 --tries=3
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

   Enable and start the service:
   ```bash
   sudo systemctl enable ticketing-queue
   sudo systemctl start ticketing-queue
   ```

### Method 2: Docker Installation

For containerized deployment using Docker:

1. Ensure Docker and Docker Compose are installed:

   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.12.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. Download the Docker Compose configuration:

   ```bash
   mkdir ticketing-system && cd ticketing-system
   curl -O https://example.com/downloads/docker-compose.yml
   curl -O https://example.com/downloads/.env.example
   mv .env.example .env
   ```

3. Edit the `.env` file with your configuration:

   ```bash
   nano .env
   ```

4. Run the application:

   ```bash
   docker-compose up -d
   ```

5. Initialize the database:

   ```bash
   docker-compose exec app php artisan migrate --seed
   ```

## Post-Installation Steps

After completing the installation, follow these steps to finish setting up the system:

### Initial Configuration

1. Access the system at https://your-domain.com

2. Log in with the default administrator account:
   - Email: admin@example.com
   - Password: ChangeMe123!

3. Change the default password immediately.

4. Complete the following initial setup:
   - Update organization profile
   - Configure email templates
   - Set up user roles and permissions
   - Create property records
   - Configure workflow settings

### Security Recommendations

1. Update the server's firewall:

   ```bash
   sudo ufw allow 'Nginx Full'
   sudo ufw allow 22/tcp
   sudo ufw enable
   ```

2. Set up regular backups:

   ```bash
   # Create backup script
   sudo nano /usr/local/bin/backup-ticketing.sh
   ```

   Add the following:
   ```bash
   #!/bin/bash
   TIMESTAMP=$(date +"%Y%m%d%H%M%S")
   BACKUP_DIR="/var/backups/ticketing"
   
   # Create backup directory if it doesn't exist
   mkdir -p $BACKUP_DIR
   
   # Backup database
   pg_dump ticketing_db -U ticketing_user -h localhost > $BACKUP_DIR/db_$TIMESTAMP.sql
   
   # Backup application files
   tar -czf $BACKUP_DIR/files_$TIMESTAMP.tar.gz -C /var/www ticketing
   
   # Remove backups older than 7 days
   find $BACKUP_DIR -type f -name "*.sql" -mtime +7 -delete
   find $BACKUP_DIR -type f -name "*.tar.gz" -mtime +7 -delete
   ```

   Set permissions and create cron job:
   ```bash
   sudo chmod +x /usr/local/bin/backup-ticketing.sh
   sudo crontab -e
   ```

   Add:
   ```
   0 2 * * * /usr/local/bin/backup-ticketing.sh
   ```

3. Set up monitoring (optional but recommended):

   ```bash
   # Install monitoring agent (example for Netdata)
   bash <(curl -Ss https://my-netdata.io/kickstart.sh)
   ```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify database credentials in `.env` file
   - Check PostgreSQL is running: `sudo systemctl status postgresql`
   - Ensure the database and user are created properly

2. **Web Server Issues**
   - Check Nginx configuration: `sudo nginx -t`
   - Review Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
   - Verify permissions: `sudo chown -R www-data:www-data /var/www/ticketing`

3. **Application Errors**
   - Check application logs: `tail -f /var/www/ticketing/storage/logs/laravel.log`
   - Verify PHP version: `php -v`
   - Ensure all PHP extensions are installed

### Getting Help

If you encounter issues during installation, you can:

- Check the detailed troubleshooting guide in our knowledge base
- Contact technical support at support@example.com
- Visit our community forums at https://community.example.com

## Upgrading

For instructions on upgrading to newer versions, please refer to the [Upgrade Guide](./upgrade_guide.md).

## Next Steps

After installation, refer to the following resources:

- [Administrator Guide](./admin_guide.md) - Complete administration guide
- [User Guide](./user_guide.md) - End-user instructions
- [API Reference](./api_reference.md) - For developers integrating with the system 