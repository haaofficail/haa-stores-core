export type StoreSelectorItem = {
  id: number;
  name: string;
};

type StoreSelectorPanelProps = {
  stores: StoreSelectorItem[];
  selectedId: number | null;
  onSelect: (storeId: number) => void;
  emptyText?: string;
  title?: string;
};

export function StoreSelectorPanel({
  stores,
  selectedId,
  onSelect,
  emptyText = 'لا توجد متاجر.',
  title = 'المتاجر',
}: StoreSelectorPanelProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
      <p className="text-sm font-medium text-gray-700 px-2 py-1.5">{title}</p>
      <div className="space-y-1 max-h-[70vh] overflow-y-auto">
        {stores.map(store => (
          <button
            key={store.id}
            type="button"
            onClick={() => onSelect(store.id)}
            className={`w-full text-start px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedId === store.id
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="text-xs text-gray-400 font-mono ms-1">#{store.id}</span>
            {store.name}
          </button>
        ))}
        {stores.length === 0 && <p className="text-xs text-gray-400 px-2 py-3">{emptyText}</p>}
      </div>
    </div>
  );
}
