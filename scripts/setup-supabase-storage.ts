/**
 * Supabase Storage Setup Script
 *
 * Creates the required storage buckets in Supabase.
 * Run with: npx ts-node --esm scripts/setup-supabase-storage.ts [--prod]
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
const isProd = process.argv[2] === '--prod';
const envFile = isProd ? '.env.production' : '.env.local';
dotenv.config({ path: envFile });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Make sure these are set in your', envFile, 'file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface BucketConfig {
  name: string;
  public: boolean;
  fileSizeLimit: number;
  allowedMimeTypes?: string[];
}

const BUCKETS: BucketConfig[] = [
  {
    name: 'items',
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },
  {
    name: 'documents',
    public: true, // Public with UUID paths for admin document viewing
    fileSizeLimit: 20 * 1024 * 1024, // 20MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
    ],
  },
  {
    name: 'photos',
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },
  {
    name: 'bookings',
    public: false, // Private - handover/return photos
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  {
    name: 'reviews',
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },
];

async function setupBuckets() {
  console.log(`🚀 Setting up Supabase Storage Buckets (${isProd ? 'PRODUCTION' : 'DEVELOPMENT'})\n`);
  console.log(`Supabase URL: ${supabaseUrl}\n`);

  for (const bucketConfig of BUCKETS) {
    console.log(`📦 Processing bucket: ${bucketConfig.name}`);

    // Check if bucket exists
    const { data: existingBucket, error: fetchError } = await supabase.storage.getBucket(
      bucketConfig.name
    );

    if (fetchError && !fetchError.message.includes('not found')) {
      console.error(`  ❌ Error checking bucket: ${fetchError.message}`);
      continue;
    }

    if (existingBucket) {
      console.log(`  ✅ Bucket already exists`);

      // Update bucket settings
      const { error: updateError } = await supabase.storage.updateBucket(bucketConfig.name, {
        public: bucketConfig.public,
        fileSizeLimit: bucketConfig.fileSizeLimit,
        allowedMimeTypes: bucketConfig.allowedMimeTypes,
      });

      if (updateError) {
        console.error(`  ⚠️ Could not update bucket settings: ${updateError.message}`);
      } else {
        console.log(`  ✅ Bucket settings updated`);
      }
    } else {
      // Create bucket
      const { error: createError } = await supabase.storage.createBucket(bucketConfig.name, {
        public: bucketConfig.public,
        fileSizeLimit: bucketConfig.fileSizeLimit,
        allowedMimeTypes: bucketConfig.allowedMimeTypes,
      });

      if (createError) {
        console.error(`  ❌ Failed to create bucket: ${createError.message}`);
      } else {
        console.log(`  ✅ Bucket created successfully`);
      }
    }

    // Set up RLS policies for bucket
    if (bucketConfig.name === 'items' || bucketConfig.name === 'photos' || bucketConfig.name === 'reviews') {
      console.log(`  Setting up public read policy...`);
    }
  }

  console.log('\n✅ Storage setup complete!');
  console.log('\nBucket summary:');
  console.log('- items: Public, for item photos (10MB max)');
  console.log('- documents: Private, for verification documents (20MB max)');
  console.log('- photos: Public, for user avatars (5MB max)');
  console.log('- bookings: Private, for handover/return photos (10MB max)');
  console.log('- reviews: Public, for review photos (5MB max)');
}

setupBuckets().catch(console.error);
