import { useRef } from 'react';
import { ImagePlus, Trash2, X, Loader2 } from 'lucide-react';

export interface QueuedImage {
  file: File;
  preview: string;
  id: string;
}

interface Props {
  images: { id: number; url: string }[];
  queuedImages: QueuedImage[];
  uploadingImage: boolean;
  imageError: string | null;
  editId: number | null;
  onUpload: (files: FileList) => void;
  onDelete: (imageId: number) => void;
  onRemoveQueued: (id: string) => void;
  t: (key: string) => string;
}

export function ProductImagesSection({ images, queuedImages, uploadingImage, imageError, editId, onUpload, onDelete, onRemoveQueued, t }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <h3 className="font-medium">{t('products.images')}</h3>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => e.target.files && onUpload(e.target.files)}
      />
      <button
        type="button"
        className="flex flex-wrap items-center gap-3 rounded-lg border-2 border-dashed p-4 cursor-pointer hover:bg-muted/50"
        onClick={() => fileRef.current?.click()}
        aria-label={t('products.uploadImages')}
      >
        <ImagePlus className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{t('products.uploadImages')}</span>
      </button>
      {uploadingImage && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />جاري رفع الصورة...</p>}
      {imageError && <p className="text-xs text-destructive">{imageError}</p>}
      {queuedImages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {queuedImages.map(q => (
            <div key={q.id} className="relative h-20 w-20 overflow-hidden rounded border">
              <img src={q.preview} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                className="absolute top-0 left-0 rounded-br bg-background/80 p-0.5"
                onClick={() => onRemoveQueued(q.id)}
                aria-label="إزالة الصورة قبل الحفظ"
                title="إزالة الصورة قبل الحفظ"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {editId && images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map(img => (
            <div key={img.id} className="relative h-20 w-20 overflow-hidden rounded border">
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                className="absolute top-0 right-0 rounded-bl bg-background/80 p-0.5"
                onClick={() => onDelete(img.id)}
                aria-label="حذف صورة المنتج"
                title="حذف صورة المنتج"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
