# Ubuntu Local PostgreSQL Database Setup Guide

## Option 1: Using Docker Compose (Recommended)

### Step 1: Start PostgreSQL Container

```bash
# Start PostgreSQL using Docker Compose
npm run db:up

# Or directly with docker compose
docker compose up -d postgres

# Verify it's running
docker compose ps
```

### Step 2: Create a New Database

You can either:
- **A)** Use the existing `test_db` from docker-compose.yml
- **B)** Create a new database name

#### Option B: Create New Database Name

```bash
# Connect to PostgreSQL container
docker compose exec postgres psql -U test_user -d postgres

# Inside PostgreSQL, create new database (replace 'my_new_db' with your desired name)
CREATE DATABASE my_new_db;

# Exit PostgreSQL
\q
```

Or create it directly from command line:

```bash
# Create new database (replace 'my_new_db' with your desired name)
docker compose exec postgres psql -U test_user -d postgres -c "CREATE DATABASE my_new_db;"

# Verify database was created
docker compose exec postgres psql -U test_user -d postgres -c "\l"
```

### Step 3: Update .env File

```bash
# Update DATABASE_URL in .env file (replace 'my_new_db' with your database name)
sed -i 's|DATABASE_URL=".*"|DATABASE_URL="postgresql://test_user:change_me_strong_password@localhost:5432/my_new_db"|' .env

# Verify the change
cat .env | grep DATABASE_URL
```

Or manually edit `.env`:
```env
DATABASE_URL="postgresql://test_user:change_me_strong_password@localhost:5432/my_new_db"
```

### Step 4: Generate Prisma Client

```bash
npm run db:generate
```

### Step 5: Run Migrations

```bash
# Run migrations to create all tables
npm run db:migrate
```

### Step 6: Verify Connection

```bash
# Option 1: Open Prisma Studio (GUI)
npm run db:studio
# Opens at http://localhost:5555

# Option 2: Connect via psql
docker compose exec postgres psql -U test_user -d my_new_db

# Option 3: List all tables
docker compose exec postgres psql -U test_user -d my_new_db -c "\dt"
```

---

## Option 2: Using Local PostgreSQL Installation (Without Docker)

### Step 1: Install PostgreSQL (if not installed)

```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Check PostgreSQL version
psql --version

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Step 2: Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# Inside PostgreSQL shell, create database and user:
CREATE DATABASE my_new_db;
CREATE USER test_user WITH PASSWORD 'change_me_strong_password';
GRANT ALL PRIVILEGES ON DATABASE my_new_db TO test_user;

# For PostgreSQL 15+, also grant schema privileges
\c my_new_db
GRANT ALL ON SCHEMA public TO test_user;

# Exit
\q
```

### Step 3: Update .env File

```bash
# Update DATABASE_URL
sed -i 's|DATABASE_URL=".*"|DATABASE_URL="postgresql://test_user:change_me_strong_password@localhost:5432/my_new_db"|' .env

# Verify
cat .env | grep DATABASE_URL
```

### Step 4: Generate Prisma Client

```bash
npm run db:generate
```

### Step 5: Run Migrations

```bash
npm run db:migrate
```

### Step 6: Verify Connection

```bash
# Connect via psql
psql postgresql://test_user:change_me_strong_password@localhost:5432/my_new_db

# Or list tables
psql postgresql://test_user:change_me_strong_password@localhost:5432/my_new_db -c "\dt"
```

---

## Complete Setup Script (Docker Method)

Copy and paste this entire script:

```bash
#!/bin/bash

# Set your database name here
DB_NAME="my_new_db"

echo "🚀 Starting PostgreSQL setup..."

# 1. Start PostgreSQL
echo "📦 Starting PostgreSQL container..."
npm run db:up
sleep 5

# 2. Create new database
echo "🗄️  Creating database: $DB_NAME"
docker compose exec -T postgres psql -U test_user -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database might already exist"

# 3. Update .env file
echo "📝 Updating .env file..."
sed -i "s|DATABASE_URL=\".*\"|DATABASE_URL=\"postgresql://test_user:change_me_strong_password@localhost:5432/$DB_NAME\"|" .env

# 4. Generate Prisma client
echo "⚙️  Generating Prisma client..."
npm run db:generate

# 5. Run migrations
echo "🔄 Running migrations..."
npm run db:migrate

# 6. Verify
echo "✅ Verifying connection..."
docker compose exec -T postgres psql -U test_user -d $DB_NAME -c "\dt" | head -20

echo ""
echo "✅ Setup complete!"
echo "📊 Database: $DB_NAME"
echo "🔗 Connection: postgresql://test_user:change_me_strong_password@localhost:5432/$DB_NAME"
echo ""
echo "To open Prisma Studio: npm run db:studio"
```

Save as `setup-local-db.sh`, make executable, and run:
```bash
chmod +x setup-local-db.sh
./setup-local-db.sh
```

---

## Quick Commands Reference

### Database Management

```bash
# Start PostgreSQL (Docker)
npm run db:up

# Stop PostgreSQL (Docker)
npm run db:down

# View PostgreSQL logs
npm run db:logs

# Create new database (Docker)
docker compose exec postgres psql -U test_user -d postgres -c "CREATE DATABASE your_db_name;"

# List all databases (Docker)
docker compose exec postgres psql -U test_user -d postgres -c "\l"

# Drop database (Docker) - ⚠️ WARNING: Deletes all data
docker compose exec postgres psql -U test_user -d postgres -c "DROP DATABASE your_db_name;"
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

### Connection Testing

```bash
# Test connection (Docker)
docker compose exec postgres psql -U test_user -d your_db_name -c "SELECT version();"

# List tables (Docker)
docker compose exec postgres psql -U test_user -d your_db_name -c "\dt"

# Connect interactively (Docker)
docker compose exec postgres psql -U test_user -d your_db_name

# Test connection (Local PostgreSQL)
psql postgresql://test_user:change_me_strong_password@localhost:5432/your_db_name -c "SELECT version();"
```

---

## Troubleshooting (Ubuntu)

### Port 5432 already in use

```bash
# Check what's using port 5432
sudo lsof -i :5432

# Or
sudo netstat -tulpn | grep 5432

# Stop local PostgreSQL if running
sudo systemctl stop postgresql

# Or change Docker port in docker-compose.yml
```

### Permission denied errors

```bash
# If using local PostgreSQL, ensure user has permissions
sudo -u postgres psql -c "ALTER USER test_user WITH SUPERUSER;"
```

### Docker not found

```bash
# Install Docker on Ubuntu
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
# Log out and back in for group changes to take effect
```

### Cannot connect to database

```bash
# Check PostgreSQL is running
docker compose ps
# Or
sudo systemctl status postgresql

# Check connection string format
echo $DATABASE_URL

# Test connection
docker compose exec postgres pg_isready -U test_user -d your_db_name
```

---

## Example: Create Database Named "workspace_db"

```bash
# 1. Start PostgreSQL
npm run db:up

# 2. Create database
docker compose exec postgres psql -U test_user -d postgres -c "CREATE DATABASE workspace_db;"

# 3. Update .env
sed -i 's|DATABASE_URL=".*"|DATABASE_URL="postgresql://test_user:change_me_strong_password@localhost:5432/workspace_db"|' .env

# 4. Generate & Migrate
npm run db:generate
npm run db:migrate

# 5. Verify
docker compose exec postgres psql -U test_user -d workspace_db -c "\dt"
```

---

## Next Steps

After setup:
1. ✅ Database created
2. ✅ Migrations run
3. ✅ Connection verified

You can now:
- Run `npm run db:seed` to add sample data
- Run `npm run dev` to start development server
- Run `npm run db:studio` to browse database visually






