/**
 * ============================================================================
 * Nexus AI OS — Intent Engine Public API
 * ----------------------------------------------------------------------------
 * Single entry point for the intent subsystem.
 *
 * Usage:
 *   import { IntentEngine, IntentName } from '@/brain/intent';
 *   const engine = new IntentEngine();
 *   await engine.initialize();
 *   const result = await engine.detect('remind me to email Ali tomorrow');
 * ============================================================================
 */

export * from './constants';
export * from './types';
export * from './interfaces';
export * from './utils';
export * from './EntityExtractor';
export * from './ContextAnalyzer';
export * from './IntentRegistry';
export * from './IntentClassifier';
export * from './IntentEngine';

// Convenience default export (the main engine class).
export { IntentEngine as default } from './IntentEngine';
