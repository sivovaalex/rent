/**
 * Storage Migration Script: Local/MongoDB -> Supabase Storage
 *
 * This script migrates files from local storage or MongoDB GridFS to Supabase Storage.
 * Run with: npx ts-node --esm scripts/migrate-storage.ts
 *
 * Prerequisites:
 * 1. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
 * 2. Create buckets in Supabase Storage (items, documents, photos)
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
const isProd = process.argv[2] === '--prod';
const envFile = isProd ? '.env.production' : '.env.local';
dotenv.config({ path: envFile });

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const BUCKETS = {
  items: 'items',
  documents: 'documents',
  photos: 'photos',
} as const;

interface MigrationStats {
  items: { total: number; migrated: number; errors: number };
  documents: { total: number; migrated: number; errors: number };
  photos: { total: number; migrated: number; errors: number };
}

const stats: MigrationStats = {
  items: { total: 0, migrated: 0, errors: 0 },
  documents: { total: 0, migrated: 0, errors: 0 },
  photos: { total: 0, migrated: 0, errors: 0 },
};

// Create buckets if they don't exist
async function ensureBuckets() {
  console.log('📦 Checking storage buckets...');

  for (const bucket of Object.values(BUCKETS)) {
    const { data, error } = await supabase.storage.getBucket(bucket);

    if (error && error.message.includes('not found')) {
      console.log(`  Creating bucket: ${bucket}`);
      const { error: createError } = await supabase.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
      });

      if (createError) {
        console.error(`  ❌ Failed to create bucket ${bucket}:`, createError.message);
      } else {
        console.log(`  ✅ Created bucket: ${bucket}`);
      }
    } else if (data) {
      console.log(`  ✅ Bucket exists: ${bucket}`);
    }
  }
}

// Upload file to Supabase Storage
async function uploadToSupabase(
  bucket: string,
  filePath: string,
  destinationPath: string
): Promise<string | null> {
  try {
    // Check if file is a URL
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      // If already a Supabase URL, skip
      if (filePath.includes(supabaseUrl)) {
        return filePath;
      }

      // Download from URL
      const response = await fetch(filePath);
      if (!response.ok) {
        console.warn(`    ⚠️ Failed to fetch: ${filePath}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(destinationPath, buffer, {
          contentType: response.headers.get('content-type') || 'application/octet-stream',
          upsert: true,
        });

      if (error) {
        console.error(`    ❌ Upload error: ${error.message}`);
        return null;
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      return urlData.publicUrl;
    }

    // Local file
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`    ⚠️ File not found: ${fullPath}`);
      return null;
    }

    const fileBuffer = fs.readFileSync(fullPath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = getContentType(ext);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(destinationPath, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error(`    ❌ Upload error: ${error.message}`);
      return null;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch (error) {
    console.error(`    ❌ Error uploading file:`, error);
    return null;
  }
}

function getContentType(ext: string): string {
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return types[ext] || 'application/octet-stream';
}

// Migrate item photos
async function migrateItemPhotos() {
  console.log('\n📸 Migrating Item Photos...');

  const items = await prisma.item.findMany({
    where: {
      photos: { isEmpty: false },
    },
    select: { id: true, photos: true },
  });

  stats.items.total = items.reduce((sum, item) => sum + item.photos.length, 0);

  for (const item of items) {
    const newPhotos: string[] = [];

    for (let i = 0; i < item.photos.length; i++) {
      const photo = item.photos[i];

      // Skip if already a Supabase URL
      if (photo.includes(supabaseUrl)) {
        newPhotos.push(photo);
        stats.items.migrated++;
        continue;
      }

      const ext = path.extname(photo) || '.jpg';
      const destinationPath = `${item.id}/${Date.now()}-${i}${ext}`;

      const newUrl = await uploadToSupabase(BUCKETS.items, photo, destinationPath);

      if (newUrl) {
        newPhotos.push(newUrl);
        stats.items.migrated++;
      } else {
        newPhotos.push(photo); // Keep original if migration fails
        stats.items.errors++;
      }

      process.stdout.write(`\r  Photos: ${stats.items.migrated}/${stats.items.total}`);
    }

    // Update item with new URLs
    await prisma.item.update({
      where: { id: item.id },
      data: { photos: newPhotos },
    });
  }

  console.log(`\n  ✅ Item photos migrated: ${stats.items.migrated}/${stats.items.total}`);
}

// Migrate user documents
async function migrateUserDocuments() {
  console.log('\n📄 Migrating User Documents...');

  const users = await prisma.user.findMany({
    where: {
      documentPath: { not: null },
    },
    select: { id: true, documentPath: true },
  });

  stats.documents.total = users.length;

  for (const user of users) {
    if (!user.documentPath) continue;

    // Skip if already a Supabase URL
    if (user.documentPath.includes(supabaseUrl)) {
      stats.documents.migrated++;
      continue;
    }

    const ext = path.extname(user.documentPath) || '.pdf';
    const destinationPath = `${user.id}/document${ext}`;

    const newUrl = await uploadToSupabase(BUCKETS.documents, user.documentPath, destinationPath);

    if (newUrl) {
      await prisma.user.update({
        where: { id: user.id },
        data: { documentPath: newUrl },
      });
      stats.documents.migrated++;
    } else {
      stats.documents.errors++;
    }

    process.stdout.write(`\r  Documents: ${stats.documents.migrated}/${stats.documents.total}`);
  }

  console.log(`\n  ✅ Documents migrated: ${stats.documents.migrated}/${stats.documents.total}`);
}

// Migrate user photos
async function migrateUserPhotos() {
  console.log('\n👤 Migrating User Photos...');

  const users = await prisma.user.findMany({
    where: {
      photo: { not: null },
    },
    select: { id: true, photo: true },
  });

  stats.photos.total = users.length;

  for (const user of users) {
    if (!user.photo) continue;

    // Skip if already a Supabase URL
    if (user.photo.includes(supabaseUrl)) {
      stats.photos.migrated++;
      continue;
    }

    const ext = path.extname(user.photo) || '.jpg';
    const destinationPath = `${user.id}/avatar${ext}`;

    const newUrl = await uploadToSupabase(BUCKETS.photos, user.photo, destinationPath);

    if (newUrl) {
      await prisma.user.update({
        where: { id: user.id },
        data: { photo: newUrl },
      });
      stats.photos.migrated++;
    } else {
      stats.photos.errors++;
    }

    process.stdout.write(`\r  User photos: ${stats.photos.migrated}/${stats.photos.total}`);
  }

  console.log(`\n  ✅ User photos migrated: ${stats.photos.migrated}/${stats.photos.total}`);
}

async function main() {
  const isProd = process.argv[2] === '--prod';
  console.log(`🚀 Starting Storage Migration to Supabase (${isProd ? 'PRODUCTION' : 'DEVELOPMENT'})\n`);
  console.log(`Supabase URL: ${supabaseUrl}\n`);

  try {
    await ensureBuckets();
    await migrateItemPhotos();
    await migrateUserDocuments();
    await migrateUserPhotos();

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 STORAGE MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Item Photos: ${stats.items.migrated}/${stats.items.total} (${stats.items.errors} errors)`);
    console.log(`Documents:   ${stats.documents.migrated}/${stats.documents.total} (${stats.documents.errors} errors)`);
    console.log(`User Photos: ${stats.photos.migrated}/${stats.photos.total} (${stats.photos.errors} errors)`);
    console.log('='.repeat(50));

    const totalErrors = stats.items.errors + stats.documents.errors + stats.photos.errors;

    if (totalErrors === 0) {
      console.log('\n✅ Storage migration completed successfully!');
    } else {
      console.log(`\n⚠️ Storage migration completed with ${totalErrors} errors`);
    }
  } catch (error) {
    console.error('\n❌ Storage migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
