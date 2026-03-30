/**
 * Plugin registry system for modular features
 * TODO: Implement plugin registration, discovery, and lifecycle management
 */

import React from 'react';
import { StateCreator } from 'zustand';

export interface FeaturePlugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  component: React.ComponentType<Record<string, unknown>>;
  sidebarIcon?: React.ComponentType<{ className?: string }>;
  sidebarLabel?: string;
  dataLoader?: () => Promise<void>;
  storeSlice?: StateCreator<any>;
  enabled?: boolean;
}

class PluginRegistry {
  private plugins: Map<string, FeaturePlugin> = new Map();

  /**
   * TODO: Register a new feature plugin
   */
  register(plugin: FeaturePlugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin with id "${plugin.id}" is already registered`);
      return;
    }

    this.plugins.set(plugin.id, plugin);
    console.log(`[Plugin Registry] Registered plugin: ${plugin.name} v${plugin.version}`);
  }

  /**
   * TODO: Unregister a feature plugin
   */
  unregister(pluginId: string): void {
    this.plugins.delete(pluginId);
    console.log(`[Plugin Registry] Unregistered plugin: ${pluginId}`);
  }

  /**
   * TODO: Get a specific plugin
   */
  get(pluginId: string): FeaturePlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * TODO: Get all registered plugins
   */
  getAll(): FeaturePlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * TODO: Get enabled plugins only
   */
  getEnabled(): FeaturePlugin[] {
    return Array.from(this.plugins.values()).filter((p) => p.enabled !== false);
  }

  /**
   * TODO: Get plugins with data loaders for initialization
   */
  getDataLoaders(): Array<() => Promise<void>> {
    return this.getEnabled()
      .filter((p) => p.dataLoader)
      .map((p) => p.dataLoader as () => Promise<void>);
  }

  /**
   * TODO: Get store slices for combining into root store
   */
  getStoreSlices(): StateCreator<any>[] {
    return this.getEnabled()
      .filter((p) => p.storeSlice)
      .map((p) => p.storeSlice as StateCreator<any>);
  }

  /**
   * TODO: Enable/disable a plugin at runtime
   */
  setEnabled(pluginId: string, enabled: boolean): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.enabled = enabled;
      console.log(
        `[Plugin Registry] Plugin ${pluginId} is now ${enabled ? 'enabled' : 'disabled'}`
      );
    }
  }
}

export const pluginRegistry = new PluginRegistry();

/**
 * TODO: Auto-register built-in features using plugin system
 * This should be called on app startup to register all core features
 */
export function registerBuiltInFeatures(): void {
  // TODO: Register satellite feature
  // registerFeature(satellitePlugin);

  // TODO: Register launches feature
  // registerFeature(launchesPlugin);

  // TODO: Register graphs feature
  // registerFeature(graphsPlugin);

  // TODO: Register weather feature
  // registerFeature(weatherPlugin);

  // TODO: Register investments feature
  // registerFeature(investmentsPlugin);
}

export function registerFeature(plugin: FeaturePlugin): void {
  pluginRegistry.register(plugin);
}

export function getRegisteredFeatures(): FeaturePlugin[] {
  return pluginRegistry.getAll();
}
