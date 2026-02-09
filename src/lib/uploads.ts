import { supabase } from "@/integrations/supabase/client";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface UploadValidationResult {
  valid: boolean;
  error?: string;
}

export interface UploadResult {
  path: string;
  publicUrl?: string;
}

/**
 * Validate a file before upload (type, size, extension).
 */
export function validateFile(file: File): UploadValidationResult {
  if (!ALLOWED_TYPES.includes(file.type as any)) {
    return { valid: false, error: "Only JPEG, PNG, and WebP images are allowed" };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "Maximum file size is 5MB" };
  }
  const ext = getFileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext as any)) {
    return { valid: false, error: "Invalid file extension" };
  }
  return { valid: true };
}

/**
 * Get lowercase file extension from a filename.
 */
export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "jpg";
}

/**
 * Upload a file to a private bucket (e.g. deposit-proofs).
 * Returns the storage path for later signed URL access.
 */
export async function uploadToPrivateBucket(
  bucket: string,
  file: File,
  pathPrefix: string
): Promise<UploadResult> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const ext = getFileExtension(file.name);
  const filePath = `${pathPrefix}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(filePath, file);
  if (error) throw error;

  return { path: filePath };
}

/**
 * Upload a file to a public bucket (e.g. qr-codes) with upsert.
 * Returns both the path and a cache-busted public URL.
 */
export async function uploadToPublicBucket(
  bucket: string,
  file: File,
  filename?: string
): Promise<UploadResult> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const ext = getFileExtension(file.name);
  const filePath = filename || `upload-${Date.now()}.${ext}`;

  // Remove old file if upserting
  await supabase.storage.from(bucket).remove([filePath]);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { upsert: true });
  if (error) throw error;

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  return { path: filePath, publicUrl };
}

/**
 * Get a short-lived signed URL for a private bucket file.
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 300
): Promise<string | null> {
  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  return data?.signedUrl ?? null;
}
