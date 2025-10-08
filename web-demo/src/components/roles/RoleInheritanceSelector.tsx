/**
 * Role Inheritance Selector Component
 *
 * Provides a multi-select interface for choosing parent roles for inheritance.
 * Includes validation to prevent circular dependencies and self-inheritance.
 *
 * @example
 * ```tsx
 * <RoleInheritanceSelector
 *   availableRoles={allRoles}
 *   selectedInheritance={['customer']}
 *   onInheritanceChange={(roles) => setInheritance(roles)}
 *   currentRoleName="manager"
 *   disabled={false}
 * />
 * ```
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Alert,
  AlertDescription,
  Checkbox,
  Label,
} from '@/components/ui';
import {
  Users,
  AlertCircle,
  X,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Role } from '@/lib/types/models';

/**
 * Props for the RoleInheritanceSelector component
 */
interface RoleInheritanceSelectorProps {
  /** Available roles that can be selected as parents */
  availableRoles: Role[];
  /** Currently selected parent roles */
  selectedInheritance: string[];
  /** Callback when inheritance selection changes */
  onInheritanceChange: (inheritance: string[]) => void;
  /** Name of the current role being edited (to prevent self-inheritance) */
  currentRoleName: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Interface for inheritance validation result
 */
interface InheritanceValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function RoleInheritanceSelector({
  availableRoles,
  selectedInheritance,
  onInheritanceChange,
  currentRoleName,
  disabled = false,
  className = '',
}: RoleInheritanceSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  /**
   * Filter available roles to exclude the current role and already inherited roles
   */
  const selectableRoles = useMemo(() => {
    return availableRoles.filter(role =>
      role.name !== currentRoleName &&
      !selectedInheritance.includes(role.name)
    );
  }, [availableRoles, currentRoleName, selectedInheritance]);

  /**
   * Detect potential circular dependencies
   */
  const detectCircularDependency = (newParent: string): boolean => {
    const visited = new Set<string>();

    const hasCircularRef = (roleName: string): boolean => {
      if (visited.has(roleName)) return true;
      if (roleName === currentRoleName) return true;

      visited.add(roleName);

      const role = availableRoles.find(r => r.name === roleName);
      if (!role?.inheritsFrom) return false;

      return role.inheritsFrom.some(parent => hasCircularRef(parent));
    };

    return hasCircularRef(newParent);
  };

  /**
   * Validate the inheritance configuration
   */
  const validateInheritance = (inheritance: string[]): InheritanceValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for self-inheritance
    if (inheritance.includes(currentRoleName)) {
      errors.push('A role cannot inherit from itself');
    }

    // Check for circular dependencies
    for (const parentName of inheritance) {
      if (detectCircularDependency(parentName)) {
        errors.push(`Circular dependency detected with role "${parentName}"`);
      }
    }

    // Check for non-existent roles
    for (const parentName of inheritance) {
      if (!availableRoles.find(r => r.name === parentName)) {
        errors.push(`Role "${parentName}" does not exist`);
      }
    }

    // Warnings for complex inheritance chains
    if (inheritance.length > 3) {
      warnings.push('Deep inheritance chains may impact performance');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  };

  /**
   * Handle adding a parent role
   */
  const handleAddParent = (roleName: string) => {
    const newInheritance = [...selectedInheritance, roleName];
    const validation = validateInheritance(newInheritance);

    if (validation.isValid) {
      onInheritanceChange(newInheritance);
    }
  };

  /**
   * Handle removing a parent role
   */
  const handleRemoveParent = (roleName: string) => {
    const newInheritance = selectedInheritance.filter(name => name !== roleName);
    onInheritanceChange(newInheritance);
  };

  /**
   * Handle checkbox toggle for role selection
   */
  const handleRoleToggle = (roleName: string, checked: boolean) => {
    if (checked) {
      handleAddParent(roleName);
    } else {
      handleRemoveParent(roleName);
    }
  };

  const validation = validateInheritance(selectedInheritance);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Role Inheritance
        </CardTitle>
        <CardDescription>
          Select parent roles that this role should inherit permissions from
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Inheritance Display */}
        {selectedInheritance.length > 0 && (
          <div>
            <Label className="text-sm font-medium">Current inheritance:</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedInheritance.map(roleName => (
                <Badge
                  key={roleName}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {roleName}
                  {!disabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0.5 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleRemoveParent(roleName)}
                      title={`Remove ${roleName} from inheritance`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Role Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Available parent roles ({selectableRoles.length}):
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-auto p-1"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {isExpanded && (
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
              {selectableRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No additional roles available for inheritance
                </p>
              ) : (
                <div className="space-y-3">
                  {selectableRoles.map(role => {
                    const wouldCreateCircular = detectCircularDependency(role.name);
                    const isDisabled = disabled || wouldCreateCircular;

                    return (
                      <div key={role.name} className="flex items-start gap-3">
                        <Checkbox
                          id={`inherit-${role.name}`}
                          checked={selectedInheritance.includes(role.name)}
                          onCheckedChange={(checked: boolean) =>
                            handleRoleToggle(role.name, checked)
                          }
                          disabled={isDisabled}
                        />
                        <div className="flex-1 min-w-0">
                          <Label
                            htmlFor={`inherit-${role.name}`}
                            className={`block text-sm font-medium ${
                              isDisabled ? 'text-muted-foreground' : 'cursor-pointer'
                            }`}
                          >
                            {role.name}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {role.description}
                          </p>
                          {role.inheritsFrom && role.inheritsFrom.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs text-muted-foreground">
                                Inherits from:
                              </span>
                              <div className="flex gap-1">
                                {role.inheritsFrom.map(parentName => (
                                  <Badge
                                    key={parentName}
                                    variant="outline"
                                    className="text-xs px-1 py-0"
                                  >
                                    {parentName}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {wouldCreateCircular && (
                            <p className="text-xs text-destructive mt-1">
                              Would create circular dependency
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Validation Messages */}
        {!validation.isValid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {validation.errors.map((error, index) => (
                  <div key={index} className="text-sm">{error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {validation.warnings.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {validation.warnings.map((warning, index) => (
                  <div key={index} className="text-sm">{warning}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Actions */}
        {selectedInheritance.length > 0 && !disabled && (
          <div className="flex justify-end pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onInheritanceChange([])}
              className="text-sm"
            >
              Clear All
            </Button>
          </div>
        )}

        {/* Help Text */}
        {selectedInheritance.length === 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              This role will only have permissions explicitly assigned to it.
              Select parent roles above to inherit their permissions automatically.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
