import { Hono } from 'hono';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';
import { createMediaAdapter, signLocalStoragePath } from '@haa/shared/media';

const uploadsRouter = new Hono();

uploadsRouter.use('*', requireAuth(), requireStoreAccess());

uploadsRouter.post('/', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));

  const body = await c.req.parseBody();
  const file = body['file'] as File | undefined;
  if (!file) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'File is required' } }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimetype = file.type || 'image/png';

  // Hard reject SVG with a clear error code. The downstream adapter
  // also rejects SVG via its ALLOWED_MIME_TYPES whitelist (defense in
  // depth) — duplicating the check here gives the merchant a specific
  // message ("SVG is not allowed for security reasons") instead of a
  // generic "Unsupported file type" wrapped by adapter validation.
  //
  // Why: SVG files can carry inline <script> elements that execute
  // when the file is rendered as an image in the storefront. Even
  // declared as image/png, a malicious SVG sniffed by the browser
  // would XSS the merchant's customers. The whitelist + magic-byte
  // check together close both attack vectors.
  if (mimetype === 'image/svg+xml' || mimetype.includes('svg')) {
    return c.json(
      {
        success: false,
        error: {
          code: 'SVG_NOT_ALLOWED',
          message: 'SVG uploads are not allowed. Please use JPEG, PNG, or WebP.',
        },
      },
      400,
    );
  }

  try {
    const adapter = createMediaAdapter();
    const validationError = adapter.validateFile(buffer, mimetype);
    if (validationError) {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: validationError } }, 400);
    }

    const result = await adapter.upload(buffer, mimetype, 0, storeId);

    return c.json({
      success: true,
      data: {
        url: signLocalStoragePath(result.url),
        key: result.key,
        thumbUrl: result.thumbUrl ? signLocalStoragePath(result.thumbUrl) : undefined,
        sizeBytes: result.sizeBytes,
      },
    }, 201);
  } catch (err) {
    return c.json({ success: false, error: { code: 'UPLOAD_FAILED', message: err instanceof Error ? err.message : 'Upload failed' } }, 500);
  }
});

export { uploadsRouter };
