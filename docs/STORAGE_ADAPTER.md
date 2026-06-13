# P0B — S3/R2 Storage Adapter

## Overview

Adds product image upload/delete capabilities with pluggable storage backends.

## Architecture

```
User → Dashboard UI → API (multipart upload) → ProductsService → MediaAdapter → Storage
                                                              ↕
                                                        DB (product_images)
```

## Storage Drivers

| Driver | Env `STORAGE_DRIVER` | Usage |
|--------|---------------------|-------|
| Local  | `local` (default)   | Development — saves to `./storage/` |
| S3     | `s3`                | Staging/Production — Cloudflare R2, AWS S3, MinIO |

## Adapter Interface (`@haa/shared` — `media.ts`)

```typescript
interface MediaAdapter {
  upload(buffer: Buffer, mimetype: string, productId: number, storeId: number): Promise<UploadResult>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
  getDriverName(): string;
  validateFile(buffer: Buffer, mimetype: string): string | null;
}
```

## File Validation

- **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`
- **Max file size**: 5 MB (enforced in `validateFile()` — rejects oversized buffers)
- **Path traversal**: blocked via `sanitizeKey()` check (rejects `..`, leading `/`, backslashes)
- **Storage key**: generated internally via `randomUUID()`, original filename never used

## Storage Key Format

```
stores/{storeId}/products/{productId}/{uuid}.{ext}
```

Example: `stores/1/products/42/550e8400-e29b-41d4-a716-446655440000.jpg`

## API Endpoints

### `POST /merchant/:storeId/products/:productId/images`
- Multipart form upload with field `image`
- Requires `products:update` permission
- Returns created image record
- Logs `product_image_uploaded` audit action

### `DELETE /merchant/:storeId/products/:productId/images/:imageId`
- Deletes image from storage (if `key` is set) and DB
- Requires `products:update` permission
- Returns deleted image record
- Logs `product_image_deleted` audit action

## Schema Change

Added `key` column (varchar 500, nullable) to `product_images` table for S3 object key storage.

## Dashboard UI

Product edit dialog includes image gallery (thumbnail grid) with:
- Upload button (opens file picker, accepts jpeg/png/webp)
- Image thumbnails with hover delete button
- Loading state during upload
- Upload limit: 5 MB

## Storefront

Home page and Product Detail page display the first image from `product_images` array. Falls back to icon placeholder if no images exist.

## Env Variables

| Variable | Required for S3 | Description |
|----------|:---------------:|-------------|
| `STORAGE_DRIVER` | No | `local` or `s3` (default: `local`) |
| `S3_ENDPOINT` | Yes | S3-compatible endpoint URL |
| `S3_REGION` | Yes | Region (e.g. `auto` for R2) |
| `S3_BUCKET` | Yes | Bucket name |
| `S3_ACCESS_KEY_ID` | Yes | Access key |
| `S3_SECRET_ACCESS_KEY` | Yes | Secret key |
| `S3_PUBLIC_BASE_URL` | Yes | Public CDN/base URL for images |

## Env Validation

- When `STORAGE_DRIVER=s3`, all S3 vars are required at startup
- Env validation fails fast with clear error message
- `STORAGE_DRIVER=local` is **blocked** in staging/production environments

## S3 Delete Stub

`S3StorageAdapter.delete()` is currently a stub that logs a warning. Real S3 SDK integration is required for production file deletion. The local adapter fully supports delete.

## Audit Logs

- `product_image_uploaded`: records `{ productId, url }`
- `product_image_deleted`: records `{ productId, url }`

## Tests (28 tests in `tests/images.test.ts`)

- MediaAdapter: MIME validation, file size validation, key generation, unsafe filename rejection
- LocalStorageAdapter: upload, driver name, URL safety
- S3StorageAdapter: config, public URL, MIME validation, file size validation
- createMediaAdapter: default, unknown driver, S3 without env vars
- ProductsService.addImage: success, null product, invalid MIME, oversized file, cross-store rejection
- ProductsService.deleteImage: success, null product, null image, cross-store rejection
- Public DTO Safety: key not exposed, URL strings only
- Storage driver guard: staging/production rejects local

## Security

- Only authenticated users with `products:update` can upload/delete
- File type validation on server (not just client) — MIME type + buffer size
- Path traversal prevention in storage keys
- File size limit 5MB enforced in `validateFile()`
- Storage key generated from UUID — original filename never used
- Audit trail for every image mutation
- `STORAGE_DRIVER=local` blocked in staging/production
- S3 secrets never logged or exposed in responses
- Public API returns only image URLs (no `key`, no internal paths)
