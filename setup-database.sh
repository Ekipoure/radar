#!/bin/bash

# Database setup script for Radar Monitoring
echo "Setting up PostgreSQL database for Radar Monitoring..."

# Create database
sudo -u postgres createdb radar_monitoring

# Create user and set password
sudo -u postgres psql -c "CREATE USER radar_user WITH PASSWORD 'radar_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE radar_monitoring TO radar_user;"
sudo -u postgres psql -c "ALTER USER radar_user CREATEDB;"

echo "Database setup complete!"
echo "Database: radar_monitoring"
echo "User: radar_user"
echo "Password: radar_password"
echo ""
echo "You can now create a .env file with:"
echo "DATABASE_URL=postgresql://radar_user:radar_password@localhost:5432/radar_monitoring"
