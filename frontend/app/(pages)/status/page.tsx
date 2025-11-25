'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/theme/ui/card';
import { apiClient } from '@/lib/api/client';
import { LoadingSpinner } from '@/theme/components/loading/LoadingSpinner';
import { ErrorState } from '@/theme/components/error/ErrorState';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  message?: string;
}

interface StatusResponse {
  status: 'ok' | 'degraded' | 'down';
  services: ServiceStatus[];
}

export default function StatusPage() {
  const [statusData, setStatusData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch basic health check
        const healthResponse = await apiClient.get('/health');
        const healthData = healthResponse.data;
        
        // Parse health check response from NestJS Terminus
        // Structure: { status: 'ok'|'error', info: { database: { status: 'up' }, redis: { status: 'up' } }, error: {...} }
        // When status is 'ok', all services in 'info' are healthy
        // When status is 'error', check 'error' object for failed services
        
        const overallHealthStatus = healthData.status; // 'ok' or 'error'
        
        // If status is 'ok', all services in info are operational
        // If status is 'error', check which services failed
        const dbInfo = healthData.info?.database;
        const redisInfo = healthData.info?.redis;
        const dbError = healthData.error?.database;
        const redisError = healthData.error?.redis;
        
        // Determine service statuses
        // Service is operational if:
        // 1. Overall status is 'ok' AND service exists in 'info' (means it passed health check)
        // 2. Service status is explicitly 'up'
        // Service is down if:
        // 1. Overall status is 'error' AND service exists in 'error' (means it failed)
        // 2. Service status is explicitly 'down'
        const dbOperational = overallHealthStatus === 'ok' && dbInfo !== undefined && dbError === undefined;
        const redisOperational = overallHealthStatus === 'ok' && redisInfo !== undefined && redisError === undefined;
        
        // Determine overall status
        let overallStatus: 'ok' | 'degraded' | 'down';
        if (overallHealthStatus === 'ok' && dbOperational && redisOperational) {
          overallStatus = 'ok';
        } else if (overallHealthStatus === 'error' && !dbOperational && !redisOperational) {
          overallStatus = 'down';
        } else {
          overallStatus = 'degraded';
        }
        
        // Build services array
        const services: ServiceStatus[] = [
          {
            name: 'API',
            status: overallHealthStatus === 'ok' ? 'operational' : 'down',
          },
          {
            name: 'Database',
            status: dbOperational ? 'operational' : 'down',
          },
          {
            name: 'Redis',
            status: redisOperational ? 'operational' : 'down',
          },
        ];
        
        setStatusData({
          status: overallStatus,
          services,
        });
      } catch (err) {
        // Only show error if it's a real API error, not a network issue
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch status';
        setError(errorMessage);
        
        // If we can't reach the API, assume all services are down
        // But don't set statusData if we have no information
        if (!statusData) {
          setStatusData({
            status: 'down',
            services: [
              { name: 'API', status: 'down' },
              { name: 'Database', status: 'down' },
              { name: 'Redis', status: 'down' },
            ],
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    // Refresh every 60 seconds
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const overallStatus = statusData?.status || 'down';
  const statusColor = overallStatus === 'ok' ? 'text-green-600 dark:text-green-400' :
                     overallStatus === 'degraded' ? 'text-yellow-600 dark:text-yellow-400' :
                     'text-red-600 dark:text-red-400';
  
  const statusText = overallStatus === 'ok' ? 'All Systems Operational' :
                    overallStatus === 'degraded' ? 'Partial Outage' :
                    'Service Disruption';

  return (
    <div className="flex flex-1 flex-col max-w-4xl mx-auto w-full p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 text-center space-y-4">
        <h1 className="h1">Service Status</h1>
        <div className="flex items-center justify-center gap-3">
          {overallStatus === 'ok' ? (
            <CheckCircle2 className={cn("h-8 w-8", statusColor)} />
          ) : overallStatus === 'degraded' ? (
            <AlertCircle className={cn("h-8 w-8", statusColor)} />
          ) : (
            <XCircle className={cn("h-8 w-8", statusColor)} />
          )}
          <p className={cn("text-xl font-semibold", statusColor)}>
            {statusText}
          </p>
        </div>
      </div>

      {/* Services List */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {statusData?.services.map((service) => (
              <div key={service.name} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  {service.status === 'operational' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : service.status === 'degraded' ? (
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                  <span className="text-base font-medium">{service.name}</span>
                </div>
                <span className={cn(
                  "text-sm font-medium capitalize",
                  service.status === 'operational' ? "text-green-600 dark:text-green-400" :
                  service.status === 'degraded' ? "text-yellow-600 dark:text-yellow-400" :
                  "text-red-600 dark:text-red-400"
                )}>
                  {service.status}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>Last updated: {new Date().toLocaleString()}</p>
        <p className="mt-2">Status updates every 60 seconds</p>
      </div>
    </div>
  );
}
