import crypto from 'crypto';
import { getSupabaseAdmin } from './supabase';

export type MediaType = 'image' | 'video' | 'audio';

export interface StoredMedia {
  filename: string;
  url: string;
  filePath: string;
  mediaType: MediaType;
  size: number;
}

const BUCKET = 'paul-media';

function getDefaultExtension(mediaType: MediaType): string {
  switch (mediaType) {
    case 'image': return 'png';
    case 'video': return 'mp4';
    case 'audio': return 'wav';
  }
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    webp: 'image/webp', gif: 'image/gif', mp4: 'video/mp4',
    webm: 'video/webm', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
  };
  return mimeMap[ext || ''] || 'application/octet-stream';
}

export function inferMediaType(filename: string): MediaType | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return null;
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'image';
  if (['mp4', 'webm'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg'].includes(ext)) return 'audio';
  return null;
}

/**
 * Save base64 data to Supabase Storage.
 * Returns the public URL.
 */
export async function saveMediaFromBase64(
  base64Data: string,
  mediaType: MediaType,
  extension?: string
): Promise<StoredMedia> {
  const ext = extension || getDefaultExtension(mediaType);
  const filename = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${mediaType}s/${filename}`;

  // Strip data URL prefix if present
  const cleanBase64 = base64Data.includes(',')
    ? base64Data.split(',')[1]
    : base64Data;

  const buffer = Buffer.from(cleanBase64, 'base64');

  const admin = getSupabaseAdmin();

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: getMimeType(filename),
      upsert: false,
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error(`Failed to upload media: ${error.message}`);
  }

  const { data: urlData } = admin.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  return {
    filename,
    url: urlData.publicUrl,
    filePath: storagePath,
    mediaType,
    size: buffer.length,
  };
}

/**
 * Save raw buffer to Supabase Storage.
 */
export async function saveMediaFromBuffer(
  buffer: Buffer,
  mediaType: MediaType,
  extension?: string
): Promise<StoredMedia> {
  const ext = extension || getDefaultExtension(mediaType);
  const filename = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${mediaType}s/${filename}`;

  const admin = getSupabaseAdmin();

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: getMimeType(filename),
      upsert: false,
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error(`Failed to upload media: ${error.message}`);
  }

  const { data: urlData } = admin.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  return {
    filename,
    url: urlData.publicUrl,
    filePath: storagePath,
    mediaType,
    size: buffer.length,
  };
}

/**
 * Delete a media file from Supabase Storage.
 */
export async function deleteMediaFile(filename: string): Promise<boolean> {
  // Try both flat and prefixed paths
  const paths = [
    filename,
    `images/${filename}`,
    `videos/${filename}`,
    `audios/${filename}`,
  ];

  const admin = getSupabaseAdmin();

  for (const p of paths) {
    const { error } = await admin.storage
      .from(BUCKET)
      .remove([p]);
    if (!error) return true;
  }

  console.error('Supabase delete error for:', filename);
  return false;
}

/**
 * Get the MIME type for a media file.
 */
export { getMimeType };