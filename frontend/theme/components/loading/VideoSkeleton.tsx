import { Card, CardContent } from '@/theme/ui/card';
import { Skeleton } from './Skeleton';

export function VideoSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <Skeleton variant="rectangular" height={200} className="rounded-lg aspect-video" />
        <div className="space-y-2">
          <Skeleton variant="text" width="75%" height={24} />
          <Skeleton variant="text" width="50%" height={16} />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton variant="text" width={80} />
          <Skeleton variant="text" width={60} />
        </div>
      </CardContent>
    </Card>
  );
}

