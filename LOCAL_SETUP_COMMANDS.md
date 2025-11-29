# Local PostgreSQL Setup Commands

## Quick Setup Guide

### 1. Create Environment File

First, create a `.env.local` file in the project root:

```bash
# Create .env.local file
cat > .env.local << 'EOF'
# Database - Using Docker Compose PostgreSQL
DATABASE_URL="postgresql://test_user:change_me_strong_password@localhost:5432/test_db"

# better-auth Configuration
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
EOF
```

Or manually create `.env.local` with:
```env
DATABASE_URL="postgresql://test_user:change_me_strong_password@localhost:5432/test_db"
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="your-secret-key-min-32-chars-long-please"
```

### 2. Start Local PostgreSQL (Docker Compose)

```bash
# Start PostgreSQL container
npm run db:up

# Or using docker compose directly
docker compose up -d postgres

# Check if PostgreSQL is running
docker compose ps

# View PostgreSQL logs
npm run db:logs
# Or: docker compose logs -f postgres
```

### 3. Generate Prisma Client

```bash
npm run db:generate
```

### 4. Run Database Migrations

```bash
# Run migrations (creates all tables)
npm run db:migrate

# Or using Prisma directly
npx prisma migrate dev
```

### 5. Seed Database (Optional)

```bash
# Seed with sample data (admin user, demo org, outlines)
npm run db:seed
```

### 6. Verify Database Connection

```bash
# Open Prisma Studio (database GUI)
npm run db:studio

# Or check connection via psql
psql postgresql://test_user:change_me_strong_password@localhost:5432/test_db
```

## Complete Setup Sequence

Run these commands in order:

```bash
# 1. Install dependencies (if not done)
npm install

# 2. Create .env.local (see above)

# 3. Start PostgreSQL
npm run db:up

# 4. Wait a few seconds for PostgreSQL to be ready, then generate Prisma client
npm run db:generate

# 5. Run migrations
npm run db:migrate

# 6. Seed database (optional)
npm run db:seed

# 7. Start development server
npm run dev
```

## Available Database Scripts (from package.json)

```bash
# Database Management
npm run db:up          # Start PostgreSQL container
npm run db:down        # Stop PostgreSQL container
npm run db:logs        # View PostgreSQL logs
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run database migrations
npm run db:seed        # Seed database with sample data
npm run db:studio      # Open Prisma Studio (database GUI)
```

## Docker Compose Details

The `docker-compose.yml` configures:
- **Image**: postgres:16-alpine
- **Container**: test-postgres
- **Database**: test_db
- **User**: test_user
- **Password**: change_me_strong_password
- **Port**: 5432
- **Volume**: postgres_data (persistent storage)

## Troubleshooting

### PostgreSQL not starting
```bash
# Check if port 5432 is already in use
lsof -i :5432

# Stop existing PostgreSQL if needed
docker compose down

# Remove volumes and restart (⚠️ deletes data)
docker compose down -v
docker compose up -d postgres
```

### Migration errors
```bash
# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Then run migrations again
npm run db:migrate
```

### Connection refused
```bash
# Check if PostgreSQL is running
docker compose ps

# Check PostgreSQL health
docker compose exec postgres pg_isready -U test_user -d test_db

# View logs for errors
npm run db:logs
```

### Check DATABASE_URL format
```bash
# Verify .env.local exists and has correct format
cat .env.local

# Should show:
# DATABASE_URL="postgresql://test_user:change_me_strong_password@localhost:5432/test_db"
```

## Using Local PostgreSQL (without Docker)

If you prefer to use a local PostgreSQL installation instead of Docker:

1. **Install PostgreSQL** (if not installed):
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   
   # macOS (Homebrew)
   brew install postgresql
   ```

2. **Create database and user**:
   ```bash
   # Connect to PostgreSQL
   sudo -u postgres psql
   
   # In PostgreSQL shell:
   CREATE DATABASE test_db;
   CREATE USER test_user WITH PASSWORD 'change_me_strong_password';
   GRANT ALL PRIVILEGES ON DATABASE test_db TO test_user;
   \q
   ```

3. **Update .env.local**:
   ```env
   DATABASE_URL="postgresql://test_user:change_me_strong_password@localhost:5432/test_db"
   ```

4. **Run migrations**:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

## Quick Reference

| Task | Command |
|------|---------|
| Start PostgreSQL | `npm run db:up` |
| Stop PostgreSQL | `npm run db:down` |
| View logs | `npm run db:logs` |
| Generate Prisma client | `npm run db:generate` |
| Run migrations | `npm run db:migrate` |
| Seed database | `npm run db:seed` |
| Open database GUI | `npm run db:studio` |
| Start dev server | `npm run dev` |

## Login Credentials (after seeding)

- **Email**: admin@example.com
- **Password**: admin123






