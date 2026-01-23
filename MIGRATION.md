# Migration Guide: MongoDB -> Supabase PostgreSQL

## Overview

This guide covers migrating the ArendaPro application from MongoDB to Supabase PostgreSQL with Prisma ORM.

## Prerequisites

### 1. Create Two Supabase Projects

Create separate projects for Development and Production:

1. Go to [supabase.com](https://supabase.com) and create two projects
2. Note down for each project:
   - Project URL
   - Anon Key (public)
   - Service Role Key (private)
   - Database password

### 2. Configure Environment Files

Copy `.env.example` to create environment files:

```bash
# Development
cp .env.example .env.development

# Production
cp .env.example .env.production
```

Fill in the credentials for each environment.

## Installation

```bash
# Install dependencies
yarn install

# Generate Prisma client
yarn db:generate
```

## Database Setup

### Development Environment

```bash
# Push schema to development database
yarn db:push:dev

# Open Prisma Studio to view data
yarn db:studio:dev
```

### Production Environment

```bash
# Push schema to production database
yarn db:push:prod

# Or use migrations for production
yarn db:migrate:prod
```

## Storage Setup

Set up Supabase Storage buckets:

```bash
# Development
yarn setup:storage

# Production
yarn setup:storage:prod
```

This creates the following buckets:
- `items` - Item photos (public, 10MB)
- `documents` - User verification documents (private, 20MB)
- `photos` - User avatars (public, 5MB)
- `bookings` - Handover/return photos (private, 10MB)
- `reviews` - Review photos (public, 5MB)

## Data Migration

### From MongoDB to Development

```bash
# Ensure MONGODB_URI is set in .env.local
# Ensure DATABASE_URL is set in .env.development

yarn migrate:mongodb
```

### From MongoDB to Production

```bash
# Ensure MONGODB_URI is set in .env.local
# Ensure DATABASE_URL is set in .env.production

yarn migrate:mongodb:prod
```

### Migrate Storage Files

After data migration, migrate files to Supabase Storage:

```bash
# Development
yarn migrate:storage

# Production
yarn migrate:storage:prod
```

## API Migration

The project now has v2 API routes that use Prisma:

| Old Route | New Route | Description |
|-----------|-----------|-------------|
| `/api/auth` | `/api/v2/auth/login` | Email/password login |
| `/api/auth` (POST) | `/api/v2/auth/sms` | SMS code sending |
| `/api/auth` (PUT) | `/api/v2/auth/sms` | SMS verification |
| `/api/auth/register` | `/api/v2/auth/register` | Registration |
| `/api/items` | `/api/v2/items` | Items CRUD |
| `/api/items/[id]` | `/api/v2/items/[id]` | Single item |
| `/api/bookings` | `/api/v2/bookings` | Bookings CRUD |
| `/api/reviews` | `/api/v2/reviews` | Reviews CRUD |
| `/api/users/me` | `/api/v2/users/me` | Current user profile |
| `/api/admin/*` | `/api/v2/admin/*` | Admin routes |

### Gradual Migration Strategy

1. **Phase 1**: Run both MongoDB and Prisma routes in parallel
2. **Phase 2**: Update frontend to use v2 routes
3. **Phase 3**: Remove old MongoDB routes
4. **Phase 4**: Remove MongoDB dependencies

## File Structure

```
├── prisma/
│   └── schema.prisma        # Database schema
├── lib/
│   ├── prisma.ts           # Prisma client singleton
│   └── supabase/
│       ├── client.ts       # Browser Supabase client
│       ├── server.ts       # Server Supabase client
│       ├── storage.ts      # Storage helpers
│       └── index.ts        # Exports
├── app/api/v2/             # New Prisma-based API routes
│   ├── auth/
│   ├── items/
│   ├── bookings/
│   ├── reviews/
│   ├── users/
│   ├── admin/
│   └── upload/
└── scripts/
    ├── migrate-to-supabase.ts    # Data migration
    ├── migrate-storage.ts        # File migration
    └── setup-supabase-storage.ts # Bucket setup
```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Private service key | Yes (server) |
| `DATABASE_URL` | Pooled connection string | Yes |
| `DIRECT_URL` | Direct connection string | Yes (migrations) |
| `JWT_SECRET` | JWT signing secret | Yes |
| `ENCRYPTION_KEY` | Data encryption key | Yes |
| `MONGODB_URI` | MongoDB connection | Only for migration |

## Troubleshooting

### Prisma Generate Errors

```bash
# Clear Prisma cache and regenerate
rm -rf node_modules/.prisma
yarn db:generate
```

### Connection Pool Errors

Ensure you're using the pooled connection URL (port 6543) for `DATABASE_URL` and direct URL (port 5432) for `DIRECT_URL`.

### Migration Errors

Check that:
1. MongoDB is accessible
2. Supabase database is accessible
3. Schema has been pushed (`yarn db:push:dev`)

## Rollback

If migration fails:
1. Stop using v2 routes
2. Restore frontend to use old routes
3. MongoDB data remains unchanged

## Post-Migration Cleanup

After successful migration and testing:

1. Remove MongoDB dependency from package.json
2. Delete old API routes in `/app/api/` (non-v2)
3. Remove MONGODB_URI from environment
4. Update frontend imports to use v2 routes only
