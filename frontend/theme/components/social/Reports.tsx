'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsService } from '@/core/api/social/report';
import type { ReportResourceType, ReportReason } from '@/core/api/social/report';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/theme/ui/dialog';
import { Button } from '@/theme/ui/button';
import { Label } from '@/theme/ui/label';
import { Textarea } from '@/theme/ui/textarea';
import { useAlerts } from '@/theme/components/alerts';
import { Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportsProps {
  resourceType: ReportResourceType;
  resourceId: string;
  trigger?: React.ReactNode;
  className?: string;
  onReportSubmitted?: () => void;
}

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'hate_speech', label: 'Hate Speech' },
  { value: 'violence', label: 'Violence' },
  { value: 'copyright', label: 'Copyright Violation' },
  { value: 'false_information', label: 'False Information' },
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'other', label: 'Other' },
];

export function Reports({
  resourceType,
  resourceId,
  trigger,
  className,
  onReportSubmitted,
}: ReportsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('spam');
  const [description, setDescription] = useState('');
  const { showSuccess, showError } = useAlerts();
  const queryClient = useQueryClient();

  const reportMutation = useMutation({
    mutationFn: () =>
      reportsService.create({
        resourceType,
        resourceId,
        reason,
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      showSuccess('Report submitted successfully', 'Thank you for reporting. We will review this content.');
      setIsOpen(false);
      setDescription('');
      setReason('spam');
      onReportSubmitted?.();
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (error: any) => {
      // Handle 409 Conflict (already reported)
      if (error?.response?.status === 409) {
        showError(
          'Already Reported',
          'You have already reported this content. Our team will review it shortly.'
        );
      } else {
        const errorMessage =
          error?.response?.data?.message ||
          error?.message ||
          'Failed to submit report. Please try again.';
        showError('Report Failed', errorMessage);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      showError('Report Failed', 'Please select a reason for reporting.');
      return;
    }
    reportMutation.mutate();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !reportMutation.isPending) {
      setIsOpen(false);
      setDescription('');
      setReason('spam');
    } else {
      setIsOpen(open);
    }
  };

  const defaultTrigger = (
    <Button
      variant="ghost"
      size="sm"
      className={cn('text-muted-foreground hover:text-destructive', className)}
    >
      <Flag className="h-4 w-4" />
      <span className="sr-only">Report</span>
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Report Content</DialogTitle>
            <DialogDescription>
              Help us keep the platform safe by reporting content that violates our community guidelines.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="report-reason">Reason for reporting *</Label>
              <select
                id="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value as ReportReason)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                {REPORT_REASONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-description">
                Additional details (optional)
              </Label>
              <Textarea
                id="report-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide any additional context that might help us understand the issue..."
                rows={4}
                maxLength={1000}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/1000 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={reportMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={reportMutation.isPending || !reason}
            >
              {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default Reports;

