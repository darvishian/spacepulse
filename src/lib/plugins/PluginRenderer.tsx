/**
 * Plugin renderer component that dynamically renders registered plugins
 * TODO: Implement plugin component rendering with error boundaries
 */

'use client';

import React from 'react';
import { pluginRegistry } from './registry';

interface PluginRendererProps {
  location?: 'sidebar' | 'main' | 'panel' | 'all';
  className?: string;
}

/**
 * TODO: Implement error boundary for individual plugins
 */
class PluginErrorBoundary extends React.Component<
  { children: React.ReactNode; pluginName: string },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; pluginName: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `[PluginRenderer] Error in plugin "${this.props.pluginName}":`,
      error,
      errorInfo
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-space-warning rounded-lg bg-space-warning/10">
          <p className="text-space-warning text-sm">
            Error loading plugin: {this.props.pluginName}
          </p>
          {process.env.NEXT_PUBLIC_DEBUG_MODE && (
            <p className="text-xs text-gray-400 mt-2">
              {this.state.error?.message}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * TODO: Render individual plugin components
 */
function PluginComponent({ pluginId }: { pluginId: string }) {
  const plugin = pluginRegistry.get(pluginId);

  if (!plugin) {
    return null;
  }

  const Component = plugin.component;

  return (
    <PluginErrorBoundary pluginName={plugin.name}>
      <div data-plugin-id={pluginId}>
        <Component />
      </div>
    </PluginErrorBoundary>
  );
}

/**
 * TODO: Render all enabled plugins in specified location
 */
export function PluginRenderer({
  location = 'all',
  className = '',
}: PluginRendererProps) {
  const plugins = pluginRegistry.getEnabled();

  if (plugins.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {plugins.map((plugin) => (
        <PluginComponent key={plugin.id} pluginId={plugin.id} />
      ))}
    </div>
  );
}

export default PluginRenderer;
