import { createUseTableControls } from '@haa/ui';
import type { SortDir, SortState, TableControls, UseTableControlsOptions } from '@haa/ui';

export type { SortDir, SortState, TableControls, UseTableControlsOptions };

export const useTableControls = createUseTableControls('haa-admin-table:');
