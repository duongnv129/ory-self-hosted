/**
 * AuthZ Orchestrator Overview Page
 * Interactive demo showing hybrid authorization with real-time policy decisions
 *
 * This page demonstrates the AuthZ Orchestrator which combines:
 * - Structural authorization via Keto (Zanzibar-style permissions)
 * - Contextual policies via OPA (working hours, AAL, risk assessment)
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Brain, Shield, Clock, AlertTriangle, CheckCircle, XCircle, ArrowRight, Play, Eye } from 'lucide-react';

interface DecisionRequest {
  subject: string;
  action: string;
  resource: string;
  tenant: string;
  context: {
    hour_utc: number;
    classification: string;
    session: {
      aal: number;
    };
  };
}

interface DecisionResponse {
  state: 'ALLOW' | 'DENY' | 'STEP_UP_REQUIRED';
  action: string;
  resource: string;
  subject: string;
  tenant: string;
  structural: {
    allowed: boolean;
    required_relations: string[];
  };
  policies: any[];
  required_aal: number;
  session_aal: number;
  reasons: string[];
  timestamp: string;
}

interface TenantConfig {
  tenant_id: string;
  version: string;
  active?: {
    working_hours?: {
      blocks: Array<{
        days: string[];
        start_hour: number;
        end_hour: number;
      }>;
      override_subjects: string[];
    };
    assurance?: {
      base_action_aal: Record<string, number>;
      risk_escalation_rules: Array<{
        match: Record<string, any>;
        required_aal: number;
      }>;
    };
  };
}

export default function AuthZOrchestratorPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [decision, setDecision] = useState<DecisionResponse | null>(null);
  const [tenantConfigs, setTenantConfigs] = useState<TenantConfig[]>([]);
  const [selectedTenant, setSelectedTenant] = useState('tenant-a');
  
  // Decision request form state
  const [request, setRequest] = useState<DecisionRequest>({
    subject: 'user:alice@example.com',
    action: 'user.list',
    resource: 'user:collection',
    tenant: 'tenant-a',
    context: {
      hour_utc: new Date().getUTCHours(),
      classification: 'public',
      session: { aal: 1 }
    }
  });

  // Load tenant configurations on mount
  useEffect(() => {
    const loadTenantConfigs = async () => {
      try {
        const response = await fetch('http://localhost:8080/policy/tenants');
        const data = await response.json();
        
        // Load individual tenant configs
        const configs = await Promise.all(
          data.tenants.map(async (tenantId: string) => {
            const configResponse = await fetch(`http://localhost:8080/policy/tenant/${tenantId}/config`);
            return await configResponse.json();
          })
        );
        
        setTenantConfigs(configs);
      } catch (error) {
        console.error('Failed to load tenant configs:', error);
      }
    };
    
    loadTenantConfigs();
  }, []);

  const makeDecision = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8080/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      const data = await response.json();
      setDecision(data);
    } catch (error) {
      console.error('Decision request failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'ALLOW': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'DENY': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'STEP_UP_REQUIRED': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default: return null;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'ALLOW': return 'text-green-600 bg-green-50 border-green-200';
      case 'DENY': return 'text-red-600 bg-red-50 border-red-200'; 
      case 'STEP_UP_REQUIRED': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const selectedTenantConfig = tenantConfigs.find(c => c.tenant_id === selectedTenant);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">AuthZ Orchestrator</h2>
        <p className="mt-2 text-muted-foreground">
          Hybrid authorization combining structural permissions (Keto) with contextual policies (OPA)
        </p>
      </div>

      {/* Key Features */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dual Authorization</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Keto + OPA</div>
            <p className="text-xs text-muted-foreground">
              Structural + Contextual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Working Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">9-17 UTC</div>
            <p className="text-xs text-muted-foreground">
              Business hours enforcement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Step-Up Auth</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AAL 1-3</div>
            <p className="text-xs text-muted-foreground">
              Dynamic authentication levels
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Assessment</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Context</div>
            <p className="text-xs text-muted-foreground">
              Time, IP, classification
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Real-Time Decision Interface */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Decision Request Form */}
        <Card>
          <CardHeader>
            <CardTitle>Test Authorization Decision</CardTitle>
            <CardDescription>
              Configure a request and see the authorization decision in real-time
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="subject">Subject (User)</Label>
                <Input
                  id="subject"
                  value={request.subject}
                  onChange={(e) => setRequest(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="user:alice@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="action">Action</Label>
                  <select
                    id="action"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={request.action}
                    onChange={(e) => setRequest(prev => ({ ...prev, action: e.target.value }))}
                  >
                    <optgroup label="User Actions">
                      <option value="user.list">user.list</option>
                      <option value="user.create">user.create</option>
                      <option value="user.delete">user.delete</option>
                    </optgroup>
                    <optgroup label="Product Actions">
                      <option value="product.list">product.list</option>
                      <option value="product.create">product.create</option>
                      <option value="product.delete">product.delete</option>
                    </optgroup>
                    <optgroup label="Category Actions">
                      <option value="category.list">category.list</option>
                      <option value="category.create">category.create</option>
                      <option value="category.edit">category.edit</option>
                      <option value="category.delete">category.delete</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <Label htmlFor="resource">Resource</Label>
                  <select
                    id="resource"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={request.resource}
                    onChange={(e) => setRequest(prev => ({ ...prev, resource: e.target.value }))}
                  >
                    <option value="user:collection">user:collection</option>
                    <option value="product:collection">product:collection</option>
                    <option value="category:collection">category:collection</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tenant">Tenant</Label>
                  <select
                    id="tenant"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={request.tenant}
                    onChange={(e) => {
                      setRequest(prev => ({ ...prev, tenant: e.target.value }));
                      setSelectedTenant(e.target.value);
                    }}
                  >
                    <option value="tenant-a">tenant-a (Strict)</option>
                    <option value="tenant-b">tenant-b (Lenient)</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="hour">Hour (UTC)</Label>
                  <Input
                    id="hour"
                    type="number"
                    min="0"
                    max="23"
                    value={request.context.hour_utc}
                    onChange={(e) => setRequest(prev => ({
                      ...prev,
                      context: { ...prev.context, hour_utc: parseInt(e.target.value) || 0 }
                    }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="classification">Classification</Label>
                  <select
                    id="classification"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={request.context.classification}
                    onChange={(e) => setRequest(prev => ({
                      ...prev,
                      context: { ...prev.context, classification: e.target.value }
                    }))}
                  >
                    <option value="public">Public</option>
                    <option value="internal">Internal</option>
                    <option value="confidential">Confidential</option>
                    <option value="secret">Secret</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="aal">Session AAL</Label>
                  <select
                    id="aal"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={request.context.session.aal}
                    onChange={(e) => setRequest(prev => ({
                      ...prev,
                      context: { ...prev.context, session: { aal: parseInt(e.target.value) } }
                    }))}
                  >
                    <option value={1}>AAL 1 (Password)</option>
                    <option value={2}>AAL 2 (Password + TOTP)</option>
                    <option value={3}>AAL 3 (Password + TOTP + Hardware)</option>
                  </select>
                </div>
              </div>

              <Button onClick={makeDecision} disabled={isLoading} className="w-full">
                {isLoading ? 'Processing...' : 'Make Decision'}
                <Play className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Decision Response */}
        <Card>
          <CardHeader>
            <CardTitle>Authorization Decision</CardTitle>
            <CardDescription>
              Real-time response from the AuthZ Orchestrator
            </CardDescription>
          </CardHeader>
          <CardContent>
            {decision ? (
              <div className="space-y-4">
                {/* Decision State */}
                <div className={`flex items-center gap-3 rounded-lg border p-4 ${getStateColor(decision.state)}`}>
                  {getStateIcon(decision.state)}
                  <div>
                    <div className="font-semibold">{decision.state}</div>
                    <div className="text-sm opacity-80">
                      {decision.state === 'ALLOW' && 'Access granted'}
                      {decision.state === 'DENY' && 'Access denied'}
                      {decision.state === 'STEP_UP_REQUIRED' && 'Higher authentication required'}
                    </div>
                  </div>
                </div>

                {/* Decision Details */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium">Structural Auth</div>
                      <div className="text-sm text-muted-foreground">
                        {decision.structural.allowed ? '✅ Allowed' : '❌ Denied'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Required Relations</div>
                      <div className="text-sm text-muted-foreground">
                        {decision.structural.required_relations.join(', ')}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium">Required AAL</div>
                      <div className="text-sm text-muted-foreground">
                        {decision.required_aal}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Session AAL</div>
                      <div className="text-sm text-muted-foreground">
                        {decision.session_aal}
                      </div>
                    </div>
                  </div>

                  {decision.reasons.length > 0 && (
                    <div>
                      <div className="text-sm font-medium">Reasons</div>
                      <div className="text-sm text-muted-foreground">
                        {decision.reasons.join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Click "Make Decision" to see authorization result
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tenant Configuration Viewer */}
      {selectedTenantConfig && (
        <Card>
          <CardHeader>
            <CardTitle>Tenant Configuration: {selectedTenant}</CardTitle>
            <CardDescription>
              Policy configuration for the selected tenant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Working Hours */}
              {selectedTenantConfig.active?.working_hours && (
                <div>
                  <h4 className="font-semibold mb-2">Working Hours</h4>
                  <div className="space-y-2">
                    {selectedTenantConfig.active.working_hours.blocks?.map((block, idx) => (
                      <div key={idx} className="text-sm">
                        <Badge variant="outline">
                          {block.days.join(', ')} {block.start_hour}:00-{block.end_hour}:00 UTC
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assurance Levels */}
              {selectedTenantConfig.active?.assurance && (
                <div>
                  <h4 className="font-semibold mb-2">Authentication Assurance</h4>
                  <div className="space-y-1">
                    {Object.entries(selectedTenantConfig.active.assurance.base_action_aal || {}).map(([action, aal]) => (
                      <div key={action} className="text-sm flex justify-between">
                        <span>{action}</span>
                        <Badge variant="secondary">AAL {aal}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison with Other Models */}
      <Card>
        <CardHeader>
          <CardTitle>How AuthZ Orchestrator Differs</CardTitle>
          <CardDescription>
            Comparison with other authorization models in this demo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-semibold">Simple RBAC</h4>
              <p className="text-sm text-muted-foreground">
                Only structural permissions via Keto. No contextual policies.
              </p>
              <Link href="/simple-rbac">
                <Button variant="outline" size="sm">
                  <Eye className="mr-2 h-4 w-4" />
                  View Simple RBAC
                </Button>
              </Link>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Tenant RBAC</h4>
              <p className="text-sm text-muted-foreground">
                Tenant-scoped permissions but no contextual policies.
              </p>
              <Link href="/tenant-rbac">
                <Button variant="outline" size="sm">
                  <Eye className="mr-2 h-4 w-4" />
                  View Tenant RBAC
                </Button>
              </Link>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Resource RBAC</h4>
              <p className="text-sm text-muted-foreground">
                Fine-grained resource permissions but no contextual policies.
              </p>
              <Link href="/resource-rbac">
                <Button variant="outline" size="sm">
                  <Eye className="mr-2 h-4 w-4" />
                  View Resource RBAC
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}