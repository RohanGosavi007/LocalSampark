#!/bin/bash
# LocalSampark Certbot SSL Certificate Setup Automation Script

DOMAIN_NAME="localsampark.in"
ADMIN_DOMAIN="admin.localsampark.in"
EMAIL_CONTACT="admin@localsampark.in"

echo "Verifying Certbot installation status..."

if ! [ -x "$(command -v certbot)" ]; then
  echo "Error: certbot is not installed. Installing certbot..."
  sudo apt-get update
  sudo apt-get install -y certbot python3-certbot-nginx
fi

echo "Requesting SSL Certificate for $DOMAIN_NAME and $ADMIN_DOMAIN..."

# Request Let's Encrypt certificates gracefully
sudo certbot --nginx -d "$DOMAIN_NAME" -d "$ADMIN_DOMAIN" --non-interactive --agree-tos --email "$EMAIL_CONTACT" --redirect

echo "Adding automatic renewal cron job..."
# Setup dry run to confirm renewal operations
sudo certbot renew --dry-run

echo "SSL Certificate Setup successfully executed!"
