import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card';

describe('Card Components', () => {
  describe('Card', () => {
    it('should render card with children', () => {
      render(
        <Card>
          <div>Card content</div>
        </Card>
      );
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<Card className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('CardHeader', () => {
    it('should render card header with children', () => {
      render(
        <Card>
          <CardHeader>
            <div>Header content</div>
          </CardHeader>
        </Card>
      );
      expect(screen.getByText('Header content')).toBeInTheDocument();
    });
  });

  describe('CardTitle', () => {
    it('should render card title with text', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
          </CardHeader>
        </Card>
      );
      expect(screen.getByText('Card Title')).toBeInTheDocument();
    });

    it('should have proper heading styles', () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
          </CardHeader>
        </Card>
      );
      const title = container.querySelector('[data-slot="card-title"]');
      expect(title).toHaveClass('h4', 'font-semibold');
    });
  });

  describe('CardDescription', () => {
    it('should render card description with text', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription>Card description</CardDescription>
          </CardHeader>
        </Card>
      );
      expect(screen.getByText('Card description')).toBeInTheDocument();
    });

    it('should have muted text color', () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardDescription>Description</CardDescription>
          </CardHeader>
        </Card>
      );
      const description = container.querySelector('[data-slot="card-description"]');
      expect(description).toHaveClass('text-muted-foreground');
    });
  });

  describe('CardContent', () => {
    it('should render card content with children', () => {
      render(
        <Card>
          <CardContent>
            <div>Content</div>
          </CardContent>
        </Card>
      );
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('CardFooter', () => {
    it('should render card footer with children', () => {
      render(
        <Card>
          <CardFooter>
            <div>Footer content</div>
          </CardFooter>
        </Card>
      );
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });
  });
});

