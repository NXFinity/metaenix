import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from './EmptyState';
import { FileTextIcon } from 'lucide-react';

describe('EmptyState', () => {
  it('should render with title', () => {
    render(<EmptyState title="No items" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('should render with description', () => {
    render(
      <EmptyState
        title="No items"
        description="There are no items to display"
      />
    );
    expect(screen.getByText('There are no items to display')).toBeInTheDocument();
  });

  it('should render with icon', () => {
    render(<EmptyState title="No items" icon={<FileTextIcon />} />);
    const iconContainer = screen.getByText('No items').closest('div')?.parentElement;
    expect(iconContainer?.querySelector('svg')).toBeInTheDocument();
  });

  it('should render action button when provided', async () => {
    const handleAction = vi.fn();
    const user = userEvent.setup();
    
    render(
      <EmptyState
        title="No items"
        action={{
          label: 'Create Item',
          onClick: handleAction,
        }}
      />
    );
    
    const button = screen.getByRole('button', { name: 'Create Item' });
    expect(button).toBeInTheDocument();
    
    await user.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('should render action button with custom variant', () => {
    render(
      <EmptyState
        title="No items"
        action={{
          label: 'Action',
          onClick: () => {},
          variant: 'outline',
        }}
      />
    );
    
    const button = screen.getByRole('button', { name: 'Action' });
    expect(button).toHaveClass('border');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <EmptyState title="No items" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

