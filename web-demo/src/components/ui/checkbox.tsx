/**
 * Checkbox Component
 * Simple controlled checkbox with proper TypeScript types
 */

'use client';

import { forwardRef } from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ id, checked = false, onCheckedChange, disabled = false, className = '', ...props }, ref) => {
    return (
      <div className="relative inline-flex items-center">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <div
          className={`
            h-4 w-4 border border-input rounded-sm bg-background
            flex items-center justify-center
            ${checked ? 'bg-primary border-primary' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${className}
          `}
          onClick={() => !disabled && onCheckedChange?.(!checked)}
        >
          {checked && (
            <Check className="h-3 w-3 text-primary-foreground" />
          )}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
