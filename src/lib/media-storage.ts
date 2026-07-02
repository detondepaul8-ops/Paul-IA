import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

const MEDIA_DIR = path.join(process.cwd(), 'media');

// Ensure media directory exists
export async function ensureMediaDir(): Promise<void> {
  if (!existsSync(MEDIA_DIR)) {
    await mkdir(MEDIA_DIR, { recursive: true });
  }
}

export type MediaType = 'image' | 'video' | 'audio';

export interface StoredMedia {
  filename: string;
  url: string;
  filePath: string;
  mediaType: MediaType;
  size: number;
}

/**
 * Save base64 data to a file on disk.
 * Returns the relative URL path for serving.
 */
export async function saveMediaFromBase64(
  base64Data: string,
  mediaType: MediaType,
  extension?: string
): Promise<StoredMedia> {
  await ensureMediaDir();

  const ext = extension || getDefaultExtension(mediaType);
  const filename = `${crypto.randomUUID()}.${ext}`;
  const filePath = path.join(MEDIA_DIR, filename);

  // Strip data URL prefix if present
  const cleanBase64 = base64Data.includes(',')
    ? base64Data.split(',')[1]
    : base64Data;

  const buffer = Buffer.from(cleanBase64, 'base64');
  await writeFile(filePath, buffer);

  return {
    filename,
    url: `/api/media/${filename}`,
    filePath,
    mediaType,
    size: buffer.length,
  };
}

/**
 * Save raw buffer to a file on disk.
 */
export async function saveMediaFromBuffer(
  buffer: Buffer,
  mediaType: MediaType,
  extension?: string
): Promise<StoredMedia> {
  await ensureMediaDir();

  const ext = extension || getDefaultExtension(mediaType);
  const filename = `${crypto.randomUUID()}.${ext}`;
  const filePath = path.join(MEDIA_DIR, filename);

  await writeFile(filePath, buffer);

  return {
    filename,
    url: `/api/media/${filename}`,
    filePath,
    mediaType,
    size: buffer.length,
  };
}

/**
 * Read a media file from disk.
 */
export async function readMediaFile(filename: string): Promise<Buffer | null> {
  const filePath = path.join(MEDIA_DIR, filename);
  try {
    if (!existsSync(filePath)) return null;
    return await readFile(filePath);
  } catch {
    return null;
  }
}

/**
 * Delete a media file from disk.
 */
export async function deleteMediaFile(filename: string): Promise<boolean> {
  const filePath = path.join(MEDIA_DIR, filename);
  try {
    if (!existsSync(filePath)) return false;
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the MIME type for a media file.
 */
export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
  };
  return mimeMap[ext || ''] || 'application/octet-stream';
}

/**
 * Infer media type from filename.
 */
export function inferMediaType(filename: string): MediaType | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return null;
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'image';
  if (['mp4', 'webm'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg'].includes(ext)) return 'audio';
  return null;
}

function getDefaultExtension(mediaType: MediaType): string {
  switch (mediaType) {
    case 'image': return 'png';
    case 'video': return 'mp4';
    case 'audio': return 'wav';
  }
}