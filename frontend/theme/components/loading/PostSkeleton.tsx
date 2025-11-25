import { Card, CardContent, CardHeader } from '@/theme/ui/card';
import { Skeleton } from './Skeleton';

export function PostSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="20%" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="90%" />
        <Skeleton variant="text" width="75%" />
        <Skeleton variant="rectangular" height={200} className="rounded-lg" />
        <div className="flex items-center gap-4 pt-2">
          <Skeleton variant="text" width={60} />
          <Skeleton variant="text" width={60} />
          <Skeleton variant="text" width={60} />
        </div>
      </CardContent>
    </Card>
  );
}

