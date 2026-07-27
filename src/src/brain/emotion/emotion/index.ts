/**
 * ============================================================================
 * Nexus AI OS — Emotion Engine Public API
 * ----------------------------------------------------------------------------
 * Single entry point for the emotion subsystem.
 *
 * Usage:
 *   import { EmotionEngine, emotionEngine, EmotionType } from '@/brain/emotion';
 *   await emotionEngine.initialize();
 *   const result = await emotionEngine.analyze('I am so excited about this!');
 *   const reply = emotionEngine.generateEmpathy(result, 'friendly');
 * ============================================================================
 */

export * from './constants';
export * from './types';
export * from './interfaces';
export * from './utils';
export * from './EmotionRegistry';
export * from './SentimentAnalyzer';
export * from './EmotionClassifier';
export * from './EmotionContext';
export * from './EmotionAnalyzer';
export * from './MoodTracker';
export * from './EmotionMemory';
export * from './EmpathyEngine';
export * from './EmotionEngine';

// Convenience default export (the singleton instance).
export { default } from './EmotionEngine';
