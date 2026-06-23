/**
 * OrderConfirmDialog — confirm dialog for destructive actions, extracted
 * from Orders.tsx (P2-031). Pure JSX extraction; no logic changes.
 */
import type { TFunction } from 'i18next';
import { Ban, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface OrderConfirmDialogProps {
  t: TFunction;
  confirmAction: { orderId: number; status: string; label: string } | null;
  setConfirmAction: (a: { orderId: number; status: string; label: string } | null) => void;
  changingStatus: boolean;
  changeStatus: (orderId: number, status: string) => void | Promise<void>;
}

export function OrderConfirmDialog(props: OrderConfirmDialogProps) {
  const { t, confirmAction, setConfirmAction, changingStatus, changeStatus } = props;

  return (
    <Dialog open={!!confirmAction} onOpenChange={(o) => { if (!o) setConfirmAction(null); }}>
      <DialogContent className="max-w-sm bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-neutral-900">{t('orders.confirm_title', 'تأكيد الإجراء')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-neutral-600">
          {t('orders.confirm_text', 'هل أنت متأكد من {{label}} هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.', { label: confirmAction?.label })}
        </p>
         <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
           <Button variant="outline" className="h-10 px-4 text-sm rounded-xl" onClick={() => setConfirmAction(null)}>{t('orders.cancel', 'إلغاء')}</Button>
           <Button className="h-10 px-4 text-sm rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border border-red-600"
             disabled={changingStatus}
             onClick={() => {
               if (confirmAction) {
                 changeStatus(confirmAction.orderId, confirmAction.status);
                 setConfirmAction(null);
               }
             }}>
             {changingStatus ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Ban className="h-4 w-4 me-1" />}
             {confirmAction?.label}
           </Button>
         </div>
      </DialogContent>
    </Dialog>
  );
}
