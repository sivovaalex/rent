// Supabase client exports
export { createClient, getSupabaseClient } from './client';
export { createServerSupabaseClient, createAdminClient } from './server';
export {
  BUCKETS,
  uploadFile,
  uploadBase64File,
  deleteFile,
  deleteFiles,
  getPublicUrl,
  generateFilePath,
  type BucketName,
} from './storage';
