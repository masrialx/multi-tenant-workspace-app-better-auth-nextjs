#!/bin/bash

# Ubuntu Local PostgreSQL Setup (Without Docker)
# Usage: ./setup-local-postgres.sh [database_name]

DB_NAME="${1:-workspace_db}"
DB_USER="test_user"
DB_PASSWORD="change_me_strong_password"

echo "🚀 Setting up local PostgreSQL database: $DB_NAME"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "📦 Installing PostgreSQL..."
    sudo apt update
    sudo apt install postgresql postgresql-contrib -y
fi

# Start PostgreSQL service
echo "🔄 Starting PostgreSQL service..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Wait a moment for PostgreSQL to be ready
sleep 2

# Create database
echo "🗄️  Creating database: $DB_NAME"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "⚠️  Database might already exist (this is OK)"

# Create user
echo "👤 Creating user: $DB_USER"
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || echo "⚠️  User might already exist (this is OK)"

# Grant privileges
echo "🔐 Granting privileges..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;" 2>/dev/null
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;" 2>/dev/null
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;" 2>/dev/null

# Update .env file
echo "📝 Updating .env file..."
if [ -f .env ]; then
    sed -i "s|DATABASE_URL=\".*\"|DATABASE_URL=\"postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME\"|" .env
    echo "✅ Updated DATABASE_URL in .env"
else
    echo "⚠️  .env file not found, creating it..."
    echo "DATABASE_URL=\"postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME\"" > .env
    echo "BETTER_AUTH_URL=\"http://localhost:3000\"" >> .env
    BETTER_AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || echo "your-secret-key-min-32-chars-long-please")
    echo "BETTER_AUTH_SECRET=\"$BETTER_AUTH_SECRET\"" >> .env
    echo "✅ Created .env file"
fi

# Generate Prisma client
echo "⚙️  Generating Prisma client..."
npm run db:generate

# Run migrations
echo "🔄 Running migrations..."
npm run db:migrate

# Verify
echo ""
echo "✅ Verifying connection..."
psql postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME -c "\dt" 2>/dev/null | head -20

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup complete!"
echo ""
echo "📊 Database Name: $DB_NAME"
echo "👤 Database User: $DB_USER"
echo "🔗 Connection: postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
echo ""
echo "📝 Next steps:"
echo "   • Seed database:    npm run db:seed"
echo "   • Open Prisma GUI:  npm run db:studio"
echo "   • Start dev server: npm run dev"
echo ""
echo "💡 PostgreSQL Service Commands:"
echo "   • Check status:     sudo systemctl status postgresql"
echo "   • Start:            sudo systemctl start postgresql"
echo "   • Stop:             sudo systemctl stop postgresql"
echo "   • Restart:          sudo systemctl restart postgresql"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"






