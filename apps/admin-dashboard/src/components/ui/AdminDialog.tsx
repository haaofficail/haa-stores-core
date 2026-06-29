import { useEffect, useId, useRef, type ReactNode } from 'react';

type AdminDialogProps = {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  maxWidthClassName?: string;
};

export function AdminDialog({
  title,
  description,
  children,
  onClose,
  maxWidthClassName = 'max-w-md',
}: AdminDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className={`w-full ${maxWidthClassName} rounded-2xl bg-white p-6 shadow-xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id={titleId} className="text-lg font-bold text-gray-900">
          {title}
        </h3>
        {description && (
          <div id={descriptionId} className="mt-3 text-sm leading-6 text-gray-600">
            {description}
          </div>
        )}
        <div className="mt-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}
