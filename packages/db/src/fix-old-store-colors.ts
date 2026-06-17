import 'dotenv/config';
import { createDbClient } from './index.js';
import * as s from './schema/index.js';
import { eq } from 'drizzle-orm';

const NEW_DEFAULT = '#56a1e3';
const OLD_DEFAULT = '#2563eb';

async function main() {
  const db = createDbClient();

  const stores = await db
    .select({ id: s.stores.id, slug: s.stores.slug, primaryColor: s.stores.primaryColor })
    .from(s.stores)
    .where(eq(s.stores.primaryColor, OLD_DEFAULT));

  if (stores.length === 0) {
    const nullStores = await db
      .select({ id: s.stores.id, slug: s.stores.slug, primaryColor: s.stores.primaryColor })
      .from(s.stores);
    console.log(`No stores with ${OLD_DEFAULT} found. All stores:`);
    for (const store of nullStores) {
      console.log(`  ${store.slug}: primaryColor=${store.primaryColor}`);
    }
    console.log('\nNothing to update.');
    return;
  }

  console.log(`Found ${stores.length} store(s) with old primaryColor (${OLD_DEFAULT}):`);
  for (const store of stores) {
    console.log(`  ${store.slug} (id=${store.id}): ${store.primaryColor} → ${NEW_DEFAULT}`);

    await db
      .update(s.stores)
      .set({ primaryColor: NEW_DEFAULT, updatedAt: new Date() })
      .where(eq(s.stores.id, store.id));

    const [settings] = await db
      .select()
      .from(s.storeSettings)
      .where(eq(s.storeSettings.storeId, store.id))
      .limit(1);

    if (settings?.themeConfig) {
      const themeConfig = settings.themeConfig as any;
      themeConfig.colors = { ...(themeConfig.colors ?? {}), primary: NEW_DEFAULT };
      await db
        .update(s.storeSettings)
        .set({ themeConfig })
        .where(eq(s.storeSettings.storeId, store.id));
      console.log(`    ✓ stores.primaryColor updated`);
      console.log(`    ✓ themeConfig.colors.primary synced to mirror`);
    } else {
      console.log(`    ✓ stores.primaryColor updated (no themeConfig found)`);
    }
  }

  console.log('\nDone. All old store colors migrated to new default.');
}

main().catch(console.error);
