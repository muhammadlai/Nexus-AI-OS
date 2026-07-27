/**
 * ============================================================================
 * Nexus AI OS — Brain Module Public API
 * ----------------------------------------------------------------------------
 * Single entry point for importing anything from the Brain module.
 *
 * Usage:
 *   import { brainCore, BrainState } from '@/brain';
 * ============================================================================
 */

export * from './enums';
export * from './types';
export * from './engines';
export * from './utils';
export * from './BrainCore';

// Convenience default export (the singleton).
export { default } from './BrainCore';
