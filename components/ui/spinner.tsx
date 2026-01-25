import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-3',
  xl: 'h-12 w-12 border-4',
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-primary border-t-transparent',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

export function Loader({ size = 'md', text, className, fullScreen }: LoaderProps) {
  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Spinner size={size} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}

interface PageLoaderProps {
  text?: string;
}

export function PageLoader({ text = 'Загрузка...' }: PageLoaderProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Loader size="lg" text={text} />
    </div>
  );
}

interface ButtonLoaderProps {
  className?: string;
}

export function ButtonLoader({ className }: ButtonLoaderProps) {
  return <Spinner size="sm" className={cn('mr-2', className)} />;
}

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <div className="animate-pulse space-y-3">
        <div className="h-40 rounded-md bg-muted" />
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-4 w-1/2 rounded bg-muted" />
        <div className="flex justify-between">
          <div className="h-4 w-1/4 rounded bg-muted" />
          <div className="h-4 w-1/4 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-lg border bg-card p-4">
          <div className="flex gap-4">
            <div className="h-20 w-20 rounded-md bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-4 w-1/2 rounded bg-muted" />
              <div className="h-4 w-1/4 rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <div className="animate-pulse rounded bg-muted h-10" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse rounded bg-muted/50 h-12" />
      ))}
    </div>
  );
}
