export type PublishStatus = 'draft' | 'review' | 'published' | 'restricted' | 'suspended';

export const PUBLISH_STATUS_LABELS: Record<PublishStatus, string> = {
  draft: 'مسودة',
  review: 'قيد المراجعة',
  published: 'منشور',
  restricted: 'مقيّد',
  suspended: 'موقوف',
};
