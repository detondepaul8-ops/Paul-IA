import crypto from 'crypto';
import { getSupabaseAdmin } from './supabase';
import { db } from './db';

export type MediaType = 'image' | 'video' | 'audio';

export interface StoredMedia {
  filename: string;
  url: string;
  filePath: string;
  mediaType: MediaType;
  size: number;
}

const BUCKET = 'paul-media';
const MAX_SIZE = 10485760; // 10 MB

/**
 * Storage backend selection:
 * - Supabase Storage when an API key is configured (service or anon).
 * - Database (paul_media_files) otherwise, served by /api/media/[filename].
 */
const STORAGE_ENABLED = Boolean(
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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

async function saveBuffer(
  buffer: Buffer,
  mediaType: MediaType,
  extension?: string
): Promise<StoredMedia> {
  if (buffer.length > MAX_SIZE) {
    throw new Error(`Media too large (${buffer.length} bytes, max ${MAX_SIZE})`);
  }

  const ext = extension || getDefaultExtension(mediaType);
  const filename = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${mediaType}s/${filename}`;

  if (STORAGE_ENABLED) {
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

  // Database backend: store bytes in paul_media_files, serve via /api/media/<id>
  const id = crypto.randomUUID();
  await db.paul_MediaFile.create({
    data: {
      id,
      mediaType,
      mimeType: getMimeType(filename),
      filename,
      size: buffer.length,
      data: buffer,
    },
  });

  return {
    filename,
    url: `/api/media/${id}`,
    filePath: id,
    mediaType,
    size: buffer.length,
  };
}

/**
 * Save base64 data. Returns the public URL.
 */
export async function saveMediaFromBase64(
  base64Data: string,
  mediaType: MediaType,
  extension?: string
): Promise<StoredMedia> {
  // Strip data URL prefix if present
  const cleanBase64 = base64Data.includes(',')
    ? base64Data.split(',')[1]
    : base64Data;

  const buffer = Buffer.from(cleanBase64, 'base64');
  return saveBuffer(buffer, mediaType, extension);
}

/**
 * Save raw buffer.
 */
export async function saveMediaFromBuffer(
  buffer: Buffer,
  mediaType: MediaType,
  extension?: string
): Promise<StoredMedia> {
  return saveBuffer(buffer, mediaType, extension);
}

function normalizeMediaToken(raw: string): string {
  // Accept full URLs ("/api/media/<id>", "https://.../storage/v1/object/public/...")
  // or bare filenames ("<uuid>.<ext>", "<type>s/<uuid>.<ext>")
  let token = raw.trim();
  if (token.includes('?')) token = token.split('?')[0];
  const parts = token.split('/').filter(Boolean);
  token = parts[parts.length - 1] || token;
  return token;
}

/**
 * Delete a media file. Tries the database backend, then Supabase Storage.
 */
export async function deleteMediaFile(raw: string): Promise<boolean> {
  const token = normalizeMediaToken(raw);
  let deleted = false;

  try {
    const result = await db.paul_MediaFile.deleteMany({
      where: { OR: [{ id: token }, { filename: token }] },
    });
    deleted = result.count > 0;
  } catch (error) {
    console.error('DB media delete error for:', token, error);
  }

  if (STORAGE_ENABLED) {
    const paths = [
      token,
      `images/${token}`,
      `videos/${token}`,
      `audios/${token}`,
    ];

    try {
      const admin = getSupabaseAdmin();
      for (const p of paths) {
        const { error } = await admin.storage.from(BUCKET).remove([p]);
        if (!error) {
          deleted = true;
          break;
        }
      }
    } catch (error) {
      console.error('Supabase delete error for:', token, error);
    }
  }

  if (!deleted) console.error('Media delete failed for:', token);
  return deleted;
}

/**
 * Get the MIME type for a media file.
 */
export { getMimeType };
