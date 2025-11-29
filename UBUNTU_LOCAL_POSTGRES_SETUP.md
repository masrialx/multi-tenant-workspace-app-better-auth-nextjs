# Ubuntu Local PostgreSQL Setup (Without Docker)

## Step 1: Install PostgreSQL

```bash
# Update package list
sudo apt update

# Install PostgreSQL and client tools
sudo apt install postgresql postgresql-contrib -y

# Check PostgreSQL version
psql --version

# Check if PostgreSQL is running
sudo systemctl status postgresql
```

If PostgreSQL is not running:
```bash
# Start PostgreSQL service
sudo systemctl start postgresql

# Enable PostgreSQL to start on boot
sudo systemctl enable postgresql
```

## Step 2: Create Database and User

```bash
# Switch to postgres user and open PostgreSQL shell
sudo -u postgres psql
```

Inside PostgreSQL shell, run these commands:

```sql
-- Create a new database (replace 'workspace_db' with your desired name)
CREATE DATABASE workspace_db;

-- Create a new user (or use existing postgres user)
CREATE USER test_user WITH PASSWORD 'change_me_strong_password';

-- Grant privileges on the database
GRANT ALL PRIVILEGES ON DATABASE workspace_db TO test_user;

-- Connect to the new database
\c workspace_db

-- Grant schema privileges (required for PostgreSQL 15+)
GRANT ALL ON SCHEMA public TO test_user;

-- Grant privileges on all tables in public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO test_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO test_user;

-- Exit PostgreSQL
\q
```

**Or run everything from command line:**

```bash
# Create database
sudo -u postgres psql -c "CREATE DATABASE workspace_db;"

# Create user
sudo -u postgres psql -c "CREATE USER test_user WITH PASSWORD 'change_me_strong_password';"

# Grant privileges
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE workspace_db TO test_user;"

# Grant schema privileges (PostgreSQL 15+)
sudo -u postgres psql -d workspace_db -c "GRANT ALL ON SCHEMA public TO test_user;"
sudo -u postgres psql -d workspace_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO test_user;"
sudo -u postgres psql -d workspace_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO test_user;"
```

## Step 3: Configure PostgreSQL for Local Connections

Edit PostgreSQL configuration to allow local connections:

```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Find the line that looks like:
```
local   all             all                                     peer
```

Change it to (or add if not present):
```
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

Save and exit (Ctrl+X, then Y, then Enter).

Reload PostgreSQL:
```bash
sudo systemctl reload postgresql
```

## Step 4: Update .env File

```bash
# Update DATABASE_URL in .env file (replace 'workspace_db' with your database name)
sed -i 's|DATABASE_URL=".*"|DATABASE_URL="postgresql://test_user:change_me_strong_password@localhost:5432/workspace_db"|' .env

# Verify the change
cat .env | grep DATABASE_URL
```

Or manually edit `.env`:
```env
DATABASE_URL="postgresql://test_user:change_me_strong_password@localhost:5432/workspace_db"
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="your-secret-key-min-32-chars-long-please"
```

## Step 5: Test Connection

```bash
# Test connection
psql postgresql://test_user:change_me_strong_password@localhost:5432/workspace_db -c "SELECT version();"

# Or connect interactively
psql postgresql://test_user:change_me_strong_password@localhost:5432/workspace_db
```

## Step 6: Generate Prisma Client

```bash
npm run db:generate
```

## Step 7: Run Migrations

```bash
npm run db:migrate
```

## Step 8: Verify Tables Created

```bash
# List all tables
psql postgresql://test_user:change_me_strong_password@localhost:5432/workspace_db -c "\dt"

# Or connect and explore
psql postgresql://test_user:change_me_strong_password@localhost:5432/workspace_db
```

Inside psql:
```sql
\dt          -- List tables
\d user      -- Describe user table
\q           -- Quit
```

## Step 9: Seed Database (Optional)

```bash
npm run db:seed
```

## Complete Setup Script

Save this as `setup-local-postgres.sh`:

```bash
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

# Create database
echo "🗄️  Creating database: $DB_NAME"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "⚠️  Database might already exist"

# Create user
echo "👤 Creating user: $DB_USER"
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || echo "⚠️  User might already exist"

# Grant privileges
echo "🔐 Granting privileges..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;"

# Update .env file
echo "📝 Updating .env file..."
if [ -f .env ]; then
    sed -i "s|DATABASE_URL=\".*\"|DATABASE_URL=\"postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME\"|" .env
else
    echo "DATABASE_URL=\"postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME\"" > .env
    echo "BETTER_AUTH_URL=\"http://localhost:3000\"" >> .env
    echo "BETTER_AUTH_SECRET=\"$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || echo 'your-secret-key-min-32-chars-long-please')\"" >> .env
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
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

Make it executable and run:
```bash
chmod +x setup-local-postgres.sh
./setup-local-postgres.sh
```

## Quick Commands Reference

### PostgreSQL Service Management

```bash
# Check status
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Stop PostgreSQL
sudo systemctl stop postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Enable auto-start on boot
sudo systemctl enable postgresql

# Disable auto-start
sudo systemctl disable postgresql
```

### Database Management

```bash
# Connect as postgres user
sudo -u postgres psql

# Create database
sudo -u postgres psql -c "CREATE DATABASE my_db;"

# List all databases
sudo -u postgres psql -c "\l"

# Drop database (⚠️ WARNING: Deletes all data)
sudo -u postgres psql -c "DROP DATABASE my_db;"

# Connect to specific database
psql postgresql://test_user:change_me_strong_password@localhost:5432/workspace_db

# List tables
psql postgresql://test_user:change_me_strong_password@localhost:5432/workspace_db -c "\dt"
```

### User Management

```bash
# Create user
sudo -u postgres psql -c "CREATE USER my_user WITH PASSWORD 'my_password';"

# List users
sudo -u postgres psql -c "\du"

# Grant superuser (if needed)
sudo -u postgres psql -c "ALTER USER test_user WITH SUPERUSER;"

# Change password
sudo -u postgres psql -c "ALTER USER test_user WITH PASSWORD 'new_password';"

# Delete user
sudo -u postgres psql -c "DROP USER test_user;"
```

### Prisma Commands

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Open Prisma Studio
npm run db:studio

# Format Prisma schema
npm run format
```

## Troubleshooting

### Connection refused error

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check if port 5432 is listening
sudo netstat -tulpn | grep 5432

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

### Authentication failed

```bash
# Edit pg_hba.conf to allow md5 authentication
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Change 'peer' to 'md5' for local connections
# Then reload:
sudo systemctl reload postgresql
```

### Permission denied errors

```bash
# Grant superuser privileges (temporary, for setup)
sudo -u postgres psql -c "ALTER USER test_user WITH SUPERUSER;"

# Or grant specific privileges
sudo -u postgres psql -d workspace_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO test_user;"
sudo -u postgres psql -d workspace_db -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO test_user;"
```

### Cannot find psql command

```bash
# Install PostgreSQL client
sudo apt install postgresql-client -y

# Or add to PATH (if installed but not in PATH)
export PATH=$PATH:/usr/lib/postgresql/*/bin
```

### Check PostgreSQL version

```bash
# Check version
psql --version

# Or
sudo -u postgres psql -c "SELECT version();"
```

## Example: Complete Setup for "my_app_db"

```bash
# 1. Install PostgreSQL (if not installed)
sudo apt update && sudo apt install postgresql postgresql-contrib -y

# 2. Start PostgreSQL
sudo systemctl start postgresql

# 3. Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE my_app_db;
CREATE USER test_user WITH PASSWORD 'change_me_strong_password';
GRANT ALL PRIVILEGES ON DATABASE my_app_db TO test_user;
\c my_app_db
GRANT ALL ON SCHEMA public TO test_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO test_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO test_user;
\q
EOF

# 4. Update .env
sed -i 's|DATABASE_URL=".*"|DATABASE_URL="postgresql://test_user:change_me_strong_password@localhost:5432/my_app_db"|' .env

# 5. Generate and migrate
npm run db:generate
npm run db:migrate

# 6. Verify
psql postgresql://test_user:change_me_strong_password@localhost:5432/my_app_db -c "\dt"
```

## Next Steps

After setup:
1. ✅ PostgreSQL installed and running
2. ✅ Database created
3. ✅ User created with privileges
4. ✅ Migrations run
5. ✅ Connection verified

You can now:
- Run `npm run db:seed` to add sample data
- Run `npm run dev` to start development server
- Run `npm run db:studio` to browse database visually






