/**
 * Environment Configuration
 * Validates and exports all environment variables with type safety
 */

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

export const env = {
  // Oathkeeper API Gateway (single entry point for ALL API calls including Kratos)
  oathkeeperUrl: getEnvVar('NEXT_PUBLIC_OATHKEEPER_URL', 'http://localhost:4455'),

  // App Configuration
  appName: getEnvVar('NEXT_PUBLIC_APP_NAME', 'Ory RBAC Demo'),
  appVersion: getEnvVar('NEXT_PUBLIC_APP_VERSION', '1.0.0'),

  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
} as const;

// Validate required environment variables on module load
if (typeof window === 'undefined') {
  // Server-side validation
  console.log('Environment configuration loaded:', {
    oathkeeperUrl: env.oathkeeperUrl,
    nodeEnv: process.env.NODE_ENV,
  });
}
