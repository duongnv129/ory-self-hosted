/**
 * Loading Components - Next.js Pro Pattern
 * Comprehensive loading states with skeleton UI and error states
 *
 * Follows Next.js Pro principles:
 * - Consistent loading experience
 * - Skeleton components for smooth transitions
 * - Proper loading state management
 * - Accessibility support
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

/**
 * Table Loading Skeleton
 * Mimics the actual table structure while loading
 */
export function TableLoadingSkeleton() {
  return (
    <div className="rounded-md border">
      {/* Table Header */}
      <div className="border-b bg-muted/50 p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      {/* Table Rows */}
      <div className="divide-y">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Card Loading Skeleton
 * For dashboard-style card layouts
 */
export function CardLoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Form Loading Skeleton
 * For dialog and form loading states
 */
export function FormLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  );
}

/**
 * Inline Loading Spinner
 * For buttons and small loading states
 */
interface InlineLoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function InlineLoading({
  size = 'md',
  text = 'Loading...',
  className = ''
}: InlineLoadingProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-6 w-6'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Loader2 className={`animate-spin ${sizeClasses[size]}`} />
      <span className={`text-muted-foreground ${textSizeClasses[size]}`}>
        {text}
      </span>
    </div>
  );
}

/**
 * Full Page Loading
 * For page-level loading states
 */
export function FullPageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Loading...</h3>
          <p className="text-sm text-muted-foreground">
            Please wait while we load your data
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Section Loading
 * For specific sections within a page
 */
interface SectionLoadingProps {
  title?: string;
  description?: string;
  className?: string;
}

export function SectionLoading({
  title = 'Loading',
  description = 'Please wait...',
  className = ''
}: SectionLoadingProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <Loader2 className="h-6 w-6 animate-spin text-primary mb-4" />
      <div className="text-center space-y-1">
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

/**
 * Data Loading with Retry
 * For API data loading with error handling
 */
interface DataLoadingProps {
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  onRetry?: () => void;
  loadingText?: string;
  errorTitle?: string;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
}

export function DataLoading({
  isLoading,
  isError,
  error,
  onRetry,
  loadingText = 'Loading data...',
  errorTitle = 'Failed to load data',
  children,
  skeleton
}: DataLoadingProps) {
  if (isLoading) {
    return skeleton || <SectionLoading title={loadingText} />;
  }

  if (isError) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-destructive">
          <h4 className="font-medium">{errorTitle}</h4>
          {error && (
            <p className="text-sm mt-1">{error.message}</p>
          )}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm text-primary hover:underline"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
