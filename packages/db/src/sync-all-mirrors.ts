import 'dotenv/config';
import { createDbClient } from './index.js';
import * as s from './schema/index.js';
import { eq } from 'drizzle-orm';

async function main() {
  const db = createDbClient();

  const allStores = await db
    .select({ id: s.stores.id, slug: s.stores.slug, primaryColor: s.stores.primaryColor })
    .from(s.stores);

  console.log('Checking all stores for themeConfig mirror sync...');
  let synced = 0;

  for (const store of allStores) {
    const [settings] = await db
      .select()
      .from(s.storeSettings)
      .where(eq(s.storeSettings.storeId, store.id))
      .limit(1);

    if (!settings?.themeConfig) {
      console.log(`  ${store.slug}: no themeConfig, skipping`);
      continue;
    }

    const themeConfig = settings.themeConfig as any;
    const themePrimary = themeConfig.colors?.primary;

    if (themePrimary === store.primaryColor) {
      console.log(`  ${store.slug}: ✓ already in sync`);
    } else {
      themeConfig.colors = { ...(themeConfig.colors ?? {}), primary: store.primaryColor };
      await db
        .update(s.storeSettings)
        .set({ themeConfig })
        .where(eq(s.storeSettings.storeId, store.id));
      console.log(`  ${store.slug}: ✗ synced themeConfig(${themePrimary}) → stores(${store.primaryColor})`);
      synced++;
    }
  }

  console.log(`\nDone. ${synced} store(s) synced.`);
}

main().catch(console.error);
