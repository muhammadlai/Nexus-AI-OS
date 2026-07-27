/**
 * ============================================================================
 * Nexus AI OS — Memory Module Public API
 * Single entry point for the memory subsystem.
 *
 * Usage:
 *   import { memoryEngine, MemoryType } from '@/brain/memory';
 * ============================================================================
 */

export * from './memory.enums';
export * from './memory.types';
export * from './memory.store';
export * from './memory.utils';
export * from './MemoryEngine';
export * from './memory.adapter';

export { default } from './MemoryEngine';
