/**
 * Provider Registry
 * 
 * Manages provider selection and fallback
 */

import type { MovieProvider } from './base/MovieProvider';
import type { ProviderName } from '@/types/movie';
import { TMDbProvider } from './tmdb/TMDbProvider';
import { MockProvider } from './mock/MockProvider';

class ProviderRegistry {
  private providers: Map<ProviderName, MovieProvider> = new Map();
  private primaryProvider: ProviderName = 'mock'; // Default to mock
  private fallbackOrder: ProviderName[] = ['mock', 'tmdb'];

  constructor() {
    // Register providers
    this.registerProvider(new TMDbProvider());
    this.registerProvider(new MockProvider());
    
    // Set primary provider from environment
    const envProvider = process.env.NEXT_PUBLIC_PRIMARY_PROVIDER as ProviderName;
    if (envProvider && this.providers.has(envProvider)) {
      this.primaryProvider = envProvider;
      console.log(`[ProviderRegistry] Using primary provider: ${envProvider}`);
    }
  }

  /**
   * Register a provider
   */
  registerProvider(provider: MovieProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * Get provider by name
   */
  getProvider(name: ProviderName): MovieProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get primary provider
   */
  getPrimaryProvider(): MovieProvider {
    const provider = this.providers.get(this.primaryProvider);
    if (!provider) {
      throw new Error(`Primary provider ${this.primaryProvider} not registered`);
    }
    return provider;
  }

  /**
   * Get all providers in priority order
   */
  getProvidersInOrder(): MovieProvider[] {
    return this.fallbackOrder
      .map((name) => this.providers.get(name))
      .filter((p): p is MovieProvider => !!p)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Set primary provider
   */
  setPrimaryProvider(name: ProviderName): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} not registered`);
    }
    this.primaryProvider = name;
  }

  /**
   * Set fallback order
   */
  setFallbackOrder(order: ProviderName[]): void {
    // Validate all providers exist
    for (const name of order) {
      if (!this.providers.has(name)) {
        throw new Error(`Provider ${name} not registered`);
      }
    }
    this.fallbackOrder = order;
  }

  /**
   * Execute with fallback
   */
  async executeWithFallback<T>(
    operation: (provider: MovieProvider) => Promise<T>,
    traceId?: string
  ): Promise<T> {
    const providers = this.getProvidersInOrder();
    const errors: Error[] = [];

    for (const provider of providers) {
      try {
        return await operation(provider);
      } catch (error) {
        errors.push(error as Error);
        
        // If this is the last provider, throw
        if (provider === providers[providers.length - 1]) {
          throw error;
        }
        
        // Otherwise continue to next provider
        console.warn(`Provider ${provider.name} failed, trying next provider`, error);
      }
    }

    // Should never reach here
    throw new Error('All providers failed');
  }

  /**
   * Health check all providers
   */
  async healthCheckAll(): Promise<Record<ProviderName, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, provider] of this.providers) {
      try {
        results[name] = await provider.healthCheck();
      } catch {
        results[name] = false;
      }
    }

    return results as Record<ProviderName, boolean>;
  }
}

/**
 * Global provider registry instance
 */
export const providerRegistry = new ProviderRegistry();
