/**
 * Registration Form Component
 * Handles Kratos registration flow with password authentication
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { kratosClient, RegistrationFlow } from '@/lib/api/kratos';
import { useAuth } from '@/lib/hooks';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onError?: (error: string) => void;
}

export function RegisterForm({ onError }: RegisterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [flow, setFlow] = useState<RegistrationFlow | null>(null);
  const { refreshSession } = useAuth();
  const router = useRouter();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Initialize registration flow
  useEffect(() => {
    const initFlow = async () => {
      try {
        const registrationFlow = await kratosClient.createRegistrationFlow();
        setFlow(registrationFlow);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        onError?.('Failed to initialize registration. Please refresh the page.');
        console.error('Failed to initialize registration flow:', errorMessage);
      }
    };
    initFlow();
  }, [onError]);

  const onSubmit = async (data: RegisterFormData) => {
    if (!flow) {
      onError?.('Registration flow not initialized. Please refresh the page.');
      return;
    }

    setIsLoading(true);
    try {
      await kratosClient.submitRegistration(
        flow,
        data.email,
        data.password,
        data.firstName,
        data.lastName
      );
      await refreshSession();
      toast.success('Account created successfully!');
      router.push('/simple-rbac');
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
                          'Registration failed. Please try again.';
      onError?.(errorMessage);
      toast.error(errorMessage);

      // Reinitialize flow
      try {
        const registrationFlow = await kratosClient.createRegistrationFlow();
        setFlow(registrationFlow);
      } catch (flowError) {
        console.error('Failed to reinitialize registration flow:', flowError);
        onError?.('Failed to reinitialize registration. Please refresh the page.');
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
                <Input type="email" placeholder="you@example.com" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>
    </Form>
  );
}
