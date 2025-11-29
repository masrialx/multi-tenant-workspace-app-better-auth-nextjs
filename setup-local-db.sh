#!/bin/bash

# Ubuntu Local PostgreSQL Database Setup Script
# Usage: ./setup-local-db.sh [database_name]

# Set database name (default: workspace_db)
DB_NAME="${1:-workspace_db}"

echo "🚀 Starting PostgreSQL setup for database: $DB_NAME"
echo ""

# 1. Start PostgreSQL
echo "📦 Starting PostgreSQL container..."
npm run db:up
sleep 5

# 2. Create new database
echo "🗄️  Creating database: $DB_NAME"
docker compose exec -T postgres psql -U test_user -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "⚠️  Database might already exist (this is OK)"

# 3. Update .env file
echo "📝 Updating .env file..."
if [ -f .env ]; then
    sed -i "s|DATABASE_URL=\".*\"|DATABASE_URL=\"postgresql://test_user:change_me_strong_password@localhost:5432/$DB_NAME\"|" .env
    echo "✅ Updated DATABASE_URL in .env"
else
    echo "⚠️  .env file not found, creating it..."
    echo "DATABASE_URL=\"postgresql://test_user:change_me_strong_password@localhost:5432/$DB_NAME\"" > .env
    echo "BETTER_AUTH_URL=\"http://localhost:3000\"" >> .env
    echo "BETTER_AUTH_SECRET=\"$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || echo 'your-secret-key-min-32-chars-long-please')\"" >> .env
fi

# 4. Generate Prisma client
echo "⚙️  Generating Prisma client..."
npm run db:generate

# 5. Run migrations
echo "🔄 Running migrations..."
npm run db:migrate

# 6. Verify
echo ""
echo "✅ Verifying connection..."
echo "📊 Tables in database:"
docker compose exec -T postgres psql -U test_user -d $DB_NAME -c "\dt" 2>/dev/null | head -20

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup complete!"
echo ""
echo "📊 Database Name: $DB_NAME"
echo "🔗 Connection String: postgresql://test_user:change_me_strong_password@localhost:5432/$DB_NAME"
echo ""
echo "📝 Next steps:"
echo "   • Seed database:    npm run db:seed"
echo "   • Open Prisma GUI:  npm run db:studio"
echo "   • Start dev server: npm run dev"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"






