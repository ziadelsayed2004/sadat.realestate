import { Component, type ReactNode } from 'react';
import type { FoundationCopy } from '../frontend_foundation/locale.js';
import { RouteErrorPage } from './pages.js';

export interface RouteErrorBoundaryProps {
  readonly copy: FoundationCopy;
  readonly children: ReactNode;
}

interface RouteErrorBoundaryState {
  readonly hasError: boolean;
}

export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  public state: RouteErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(_error: unknown): RouteErrorBoundaryState {
    return { hasError: true };
  }

  public render() {
    if (this.state.hasError) return <RouteErrorPage copy={this.props.copy} />;
    return this.props.children;
  }
}
