/**
 * Migration Script: MongoDB -> Supabase PostgreSQL
 *
 * This script migrates data from MongoDB to Supabase PostgreSQL.
 * Run with: npx ts-node --esm scripts/migrate-to-supabase.ts [--prod]
 *
 * Prerequisites:
 * 1. Set MONGODB_URI in .env.local
 * 2. Set DATABASE_URL and DIRECT_URL in .env.local or .env.production
 * 3. Run `yarn db:push` first to create tables
 *
 * Usage:
 *   Local:      npx ts-node --esm scripts/migrate-to-supabase.ts
 *   Production: npx ts-node --esm scripts/migrate-to-supabase.ts --prod
 */

import { MongoClient } from 'mongodb';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables based on argument
const isProd = process.argv[2] === '--prod';
const envFile = isProd ? '.env.production' : '.env.local';

// Load environment file
dotenv.config({ path: envFile });

const prisma = new PrismaClient();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/arendapro';

interface MigrationStats {
  users: { total: number; migrated: number; errors: number };
  items: { total: number; migrated: number; errors: number };
  bookings: { total: number; migrated: number; errors: number };
  reviews: { total: number; migrated: number; errors: number };
}

const stats: MigrationStats = {
  users: { total: 0, migrated: 0, errors: 0 },
  items: { total: 0, migrated: 0, errors: 0 },
  bookings: { total: 0, migrated: 0, errors: 0 },
  reviews: { total: 0, migrated: 0, errors: 0 },
};

// ID mapping for foreign keys
const idMap = {
  users: new Map<string, string>(),
  items: new Map<string, string>(),
  bookings: new Map<string, string>(),
};

async function migrateUsers(mongoDb: any) {
  console.log('\n📦 Migrating Users...');
  const users = await mongoDb.collection('users').find({}).toArray();
  stats.users.total = users.length;

  for (const user of users) {
    try {
      const newUser = await prisma.user.create({
        data: {
          name: user.name || 'Unknown',
          email: user.email || null,
          phone: user.phone,
          passwordHash: user.password_hash || null,
          role: mapUserRole(user.role),
          rating: user.rating || 5.0,
          isVerified: user.is_verified || false,
          verificationStatus: mapVerificationStatus(user.verification_status),
          isBlocked: user.is_blocked || false,
          blockReason: user.block_reason || null,
          photo: user.photo || null,
          documentPath: user.document_path || null,
          documentType: user.document_type || null,
          createdAt: user.createdAt || new Date(),
        },
      });

      idMap.users.set(user._id.toString(), newUser.id);
      stats.users.migrated++;
      process.stdout.write(`\r  Users: ${stats.users.migrated}/${stats.users.total}`);
    } catch (error) {
      stats.users.errors++;
      console.error(`\n  Error migrating user ${user._id}:`, error);
    }
  }
  console.log(`\n  ✅ Users migrated: ${stats.users.migrated}/${stats.users.total}`);
}

async function migrateItems(mongoDb: any) {
  console.log('\n📦 Migrating Items...');
  const items = await mongoDb.collection('items').find({}).toArray();
  stats.items.total = items.length;

  for (const item of items) {
    try {
      const ownerId = idMap.users.get(item.owner_id?.toString());
      if (!ownerId) {
        console.warn(`\n  ⚠️ Owner not found for item ${item._id}, skipping`);
        stats.items.errors++;
        continue;
      }

      const newItem = await prisma.item.create({
        data: {
          ownerId,
          category: mapCategory(item.category),
          subcategory: item.subcategory || null,
          title: item.title || 'Untitled',
          description: item.description || '',
          pricePerDay: item.price_per_day || 0,
          pricePerMonth: item.price_per_month || 0,
          deposit: item.deposit || 0,
          address: item.address || '',
          photos: item.photos || [],
          attributes: item.attributes || {},
          status: mapItemStatus(item.status),
          rating: item.rating || null,
          createdAt: item.createdAt || new Date(),
        },
      });

      idMap.items.set(item._id.toString(), newItem.id);
      stats.items.migrated++;
      process.stdout.write(`\r  Items: ${stats.items.migrated}/${stats.items.total}`);
    } catch (error) {
      stats.items.errors++;
      console.error(`\n  Error migrating item ${item._id}:`, error);
    }
  }
  console.log(`\n  ✅ Items migrated: ${stats.items.migrated}/${stats.items.total}`);
}

async function migrateBookings(mongoDb: any) {
  console.log('\n📦 Migrating Bookings...');
  const bookings = await mongoDb.collection('bookings').find({}).toArray();
  stats.bookings.total = bookings.length;

  for (const booking of bookings) {
    try {
      const itemId = idMap.items.get(booking.item_id?.toString());
      const renterId = idMap.users.get(booking.renter_id?.toString());

      if (!itemId || !renterId) {
        console.warn(`\n  ⚠️ Missing refs for booking ${booking._id}, skipping`);
        stats.bookings.errors++;
        continue;
      }

      const newBooking = await prisma.booking.create({
        data: {
          itemId,
          renterId,
          startDate: new Date(booking.start_date),
          endDate: new Date(booking.end_date),
          rentalType: booking.rental_type === 'month' ? 'month' : 'day',
          rentalPrice: booking.rental_price || 0,
          deposit: booking.deposit || 0,
          commission: booking.commission || 0,
          insurance: booking.insurance || 0,
          totalPrice: booking.total_price || 0,
          prepayment: booking.prepayment || 0,
          isInsured: booking.is_insured || false,
          status: mapBookingStatus(booking.status),
          depositStatus: booking.deposit_status || null,
          paymentId: booking.payment_id || null,
          handoverPhotos: booking.handover_photos || [],
          returnPhotos: booking.return_photos || [],
          createdAt: booking.createdAt || new Date(),
        },
      });

      idMap.bookings.set(booking._id.toString(), newBooking.id);
      stats.bookings.migrated++;
      process.stdout.write(`\r  Bookings: ${stats.bookings.migrated}/${stats.bookings.total}`);
    } catch (error) {
      stats.bookings.errors++;
      console.error(`\n  Error migrating booking ${booking._id}:`, error);
    }
  }
  console.log(`\n  ✅ Bookings migrated: ${stats.bookings.migrated}/${stats.bookings.total}`);
}

async function migrateReviews(mongoDb: any) {
  console.log('\n📦 Migrating Reviews...');
  const reviews = await mongoDb.collection('reviews').find({}).toArray();
  stats.reviews.total = reviews.length;

  for (const review of reviews) {
    try {
      const bookingId = idMap.bookings.get(review.booking_id?.toString());
      const itemId = idMap.items.get(review.item_id?.toString());
      const userId = idMap.users.get(review.user_id?.toString());

      if (!bookingId || !itemId || !userId) {
        console.warn(`\n  ⚠️ Missing refs for review ${review._id}, skipping`);
        stats.reviews.errors++;
        continue;
      }

      await prisma.review.create({
        data: {
          bookingId,
          itemId,
          userId,
          rating: review.rating || 5,
          text: review.text || '',
          photos: review.photos || [],
          createdAt: review.createdAt || new Date(),
        },
      });

      stats.reviews.migrated++;
      process.stdout.write(`\r  Reviews: ${stats.reviews.migrated}/${stats.reviews.total}`);
    } catch (error) {
      stats.reviews.errors++;
      console.error(`\n  Error migrating review ${review._id}:`, error);
    }
  }
  console.log(`\n  ✅ Reviews migrated: ${stats.reviews.migrated}/${stats.reviews.total}`);
}

// Mapping functions
function mapUserRole(role: string): 'renter' | 'owner' | 'moderator' | 'admin' {
  const roles: Record<string, 'renter' | 'owner' | 'moderator' | 'admin'> = {
    renter: 'renter',
    owner: 'owner',
    moderator: 'moderator',
    admin: 'admin',
  };
  return roles[role] || 'renter';
}

function mapVerificationStatus(status: string): 'not_verified' | 'pending' | 'verified' | 'rejected' {
  const statuses: Record<string, 'not_verified' | 'pending' | 'verified' | 'rejected'> = {
    not_verified: 'not_verified',
    pending: 'pending',
    verified: 'verified',
    rejected: 'rejected',
  };
  return statuses[status] || 'not_verified';
}

function mapCategory(category: string): 'electronics' | 'clothes' | 'stream' | 'tools' | 'sports' | 'other' {
  const categories: Record<string, 'electronics' | 'clothes' | 'stream' | 'tools' | 'sports' | 'other'> = {
    electronics: 'electronics',
    clothes: 'clothes',
    stream: 'stream',
    tools: 'tools',
    sports: 'sports',
    other: 'other',
  };
  return categories[category] || 'other';
}

function mapItemStatus(status: string): 'draft' | 'pending' | 'approved' | 'rejected' {
  const statuses: Record<string, 'draft' | 'pending' | 'approved' | 'rejected'> = {
    draft: 'draft',
    pending: 'pending',
    approved: 'approved',
    rejected: 'rejected',
  };
  return statuses[status] || 'pending';
}

function mapBookingStatus(status: string): 'pending_payment' | 'paid' | 'active' | 'completed' | 'cancelled' {
  const statuses: Record<string, 'pending_payment' | 'paid' | 'active' | 'completed' | 'cancelled'> = {
    pending_payment: 'pending_payment',
    pending: 'pending_payment',
    paid: 'paid',
    active: 'active',
    completed: 'completed',
    cancelled: 'cancelled',
  };
  return statuses[status] || 'pending_payment';
}

async function main() {
  console.log(`🚀 Starting MongoDB -> Supabase PostgreSQL Migration (${isProd ? 'PRODUCTION' : 'DEVELOPMENT'})\n`);
  console.log(`MongoDB URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  console.log(`PostgreSQL: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'configured'}`);
  console.log(`Environment: ${envFile}\n`);

  const mongoClient = new MongoClient(MONGODB_URI);

  try {
    // Connect to MongoDB
    await mongoClient.connect();
    console.log('✅ Connected to MongoDB');

    const mongoDb = mongoClient.db('arendapro');

    // Run migrations in order (respecting foreign keys)
    await migrateUsers(mongoDb);
    await migrateItems(mongoDb);
    await migrateBookings(mongoDb);
    await migrateReviews(mongoDb);

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Users:    ${stats.users.migrated}/${stats.users.total} (${stats.users.errors} errors)`);
    console.log(`Items:    ${stats.items.migrated}/${stats.items.total} (${stats.items.errors} errors)`);
    console.log(`Bookings: ${stats.bookings.migrated}/${stats.bookings.total} (${stats.bookings.errors} errors)`);
    console.log(`Reviews:  ${stats.reviews.migrated}/${stats.reviews.total} (${stats.reviews.errors} errors)`);
    console.log('='.repeat(50));

    const totalErrors =
      stats.users.errors + stats.items.errors + stats.bookings.errors + stats.reviews.errors;

    if (totalErrors === 0) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log(`\n⚠️ Migration completed with ${totalErrors} errors`);
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoClient.close();
    await prisma.$disconnect();
  }
}

main();
