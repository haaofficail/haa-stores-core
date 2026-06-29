import { useEffect, useId, useRef, type ReactNode } from 'react';

type AdminDialogProps = Readonly<{
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  maxWidthClassName?: string;
}>;

export function AdminDialog({
  title,
  description,
  children,
  onClose,
  maxWidthClassName = 'max-w-md',
}: AdminDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

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
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-black/50 p-4 text-start"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      tabIndex={-1}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      open
    >
      <div
        className={`w-full ${maxWidthClassName} rounded-2xl bg-white p-6 shadow-xl`}
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
    </dialog>
  );
}
