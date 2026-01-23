import { createAdminClient } from './server';

// Storage bucket names from environment
export const BUCKETS = {
  ITEMS: process.env.STORAGE_BUCKET_ITEMS || 'items',
  DOCUMENTS: process.env.STORAGE_BUCKET_DOCUMENTS || 'documents',
  AVATARS: process.env.STORAGE_BUCKET_AVATARS || 'photos',
  REVIEWS: process.env.STORAGE_BUCKET_REVIEWS || 'reviews',
} as const;

export type BucketName = typeof BUCKETS[keyof typeof BUCKETS];

interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  bucket: BucketName,
  path: string,
  file: Buffer | Blob | File,
  contentType?: string
): Promise<UploadResult> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload base64 encoded file
 */
export async function uploadBase64File(
  bucket: BucketName,
  path: string,
  base64Data: string,
  contentType: string = 'image/jpeg'
): Promise<UploadResult> {
  try {
    // Remove data URL prefix if present
    const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    return uploadFile(bucket, path, buffer, contentType);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid base64 data',
    };
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(
  bucket: BucketName,
  path: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Storage delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

/**
 * Delete multiple files
 */
export async function deleteFiles(
  bucket: BucketName,
  paths: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.storage
      .from(bucket)
      .remove(paths);

    if (error) {
      console.error('Storage delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(bucket: BucketName, path: string): string {
  const supabase = createAdminClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Generate a unique file path
 */
export function generateFilePath(
  folder: string,
  userId: string,
  extension: string = 'jpg'
): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${folder}/${userId}/${timestamp}_${random}.${extension}`;
}
