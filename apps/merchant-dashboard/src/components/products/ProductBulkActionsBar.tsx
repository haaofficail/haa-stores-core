import { Button } from '@/components/ui/button';

interface Props {
  selectedCount: number;
  onClear: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onExportCsv: () => void;
  busy: boolean;
}

export function ProductBulkActionsBar({ selectedCount, onClear, onActivate, onDeactivate, onExportCsv, busy }: Props) {
  if (selectedCount === 0) return null;
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
      <span className="text-sm text-muted-foreground">
        تم تحديد {selectedCount} منتج{selectedCount > 1 && 'ات'}
      </span>
      <Button variant="outline" size="sm" onClick={onClear} disabled={busy}>إلغاء التحديد</Button>
      <div className="mr-auto flex gap-2">
        <Button variant="outline" size="sm" onClick={onActivate} disabled={busy}>تفعيل</Button>
        <Button variant="outline" size="sm" onClick={onDeactivate} disabled={busy}>إلغاء التفعيل</Button>
        <Button variant="outline" size="sm" onClick={onExportCsv} disabled={busy}>تصدير CSV</Button>
      </div>
    </div>
  );
}
