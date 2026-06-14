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
