import { Link } from 'react-router-dom';
import { Icon, type AdminIconName } from './icon';

type EmptyStateAction = Readonly<{
  label: string;
  href: string;
}>;

type AdminEmptyStateProps = Readonly<{
  icon?: AdminIconName;
  title: string;
  description: string;
  meaning?: string;
  actions?: EmptyStateAction[];
}>;

export function AdminEmptyState({
  icon = 'Inbox',
  title,
  description,
  meaning,
  actions = [],
}: AdminEmptyStateProps) {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-gray-400">
        <Icon name={icon} size="md" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">{description}</p>
      {meaning ? (
        <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-gray-400">
          <span className="font-semibold text-gray-500">ماذا يعني الفراغ:</span> {meaning}
        </p>
      ) : null}
      {actions.length > 0 ? (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {actions.map(action => (
            <Link
              key={`${action.href}:${action.label}`}
              to={action.href}
              className="inline-flex h-10 items-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
