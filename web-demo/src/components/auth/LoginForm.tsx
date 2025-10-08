/**
 * Login Form Component
 * Handles Kratos login flow with password authentication
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { kratosClient, LoginFlow } from '@/lib/api/kratos';
import { useAuth } from '@/lib/hooks';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  returnTo?: string;
  onError?: (error: string) => void;
}

export function LoginForm({ returnTo, onError }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [flow, setFlow] = useState<LoginFlow | null>(null);
  const { refreshSession } = useAuth();
  const router = useRouter();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Initialize login flow on mount
  useEffect(() => {
    const initFlow = async () => {
      try {
        const loginFlow = await kratosClient.createLoginFlow(returnTo);
        setFlow(loginFlow);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        onError?.('Failed to initialize login. Please refresh the page.');
        console.error('Failed to initialize login flow:', errorMessage);
      }
    };
    initFlow();
  }, [returnTo, onError]);

  const onSubmit = async (data: LoginFormData) => {
    if (!flow) {
      onError?.('Login flow not initialized. Please refresh the page.');
      return;
    }

    setIsLoading(true);
    try {
      await kratosClient.submitLogin(flow, data.email, data.password);
      await refreshSession();
      toast.success('Successfully logged in!');
      router.push(returnTo || '/simple-rbac');
    } catch (error: unknown) {
      const axiosError = error as {
        response?: {
          data?: {
            ui?: {
              messages?: Array<{ text: string }>;
            };
            error?: {
              message: string;
            };
          };
        };
      };

      const errorMessage = axiosError.response?.data?.ui?.messages?.[0]?.text ||
                          axiosError.response?.data?.error?.message ||
                          'Invalid email or password';
      onError?.(errorMessage);
      toast.error(errorMessage);

      // Reinitialize flow on error
      try {
        const loginFlow = await kratosClient.createLoginFlow(returnTo);
        setFlow(loginFlow);
      } catch (flowError) {
        console.error('Failed to reinitialize login flow:', flowError);
        onError?.('Failed to reinitialize login. Please refresh the page.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="admin@example.com"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
    </Form>
  );
}
