/**
 * ============================================================================
 * Nexus AI OS — EntityExtractor
 * ----------------------------------------------------------------------------
 * Extracts structured entities from text: names, emails, URLs, phones,
 * dates, times, currencies, cities, countries, file paths, programming
 * languages, frameworks, organizations, products, and custom entities.
 * ============================================================================
 */

import { IEntityExtractor } from './interfaces';
import { IntentEntity, CustomEntityDefinition } from './types';
import { INTENT_LIMITS } from './constants';
import { clamp } from './utils';

/** Internal descriptor for a built-in entity type. */
interface EntityRule {
  type: string;
  pattern: RegExp;
  confidence: number;
  normalize?: (value: string) => string;
}

/** Known gazetteers (small, illustrative baseline; extendable at runtime). */
const CITIES = [
  'karachi', 'lahore', 'islamabad', 'london', 'new york', 'paris', 'tokyo',
  'dubai', 'berlin', 'toronto', 'sydney', 'mumbai', 'delhi', 'san francisco',
];

const COUNTRIES = [
  'pakistan', 'india', 'united states', 'usa', 'uk', 'united kingdom',
  'canada', 'australia', 'germany', 'france', 'japan', 'china', 'uae',
];

const PROGRAMMING_LANGUAGES = [
  'typescript', 'javascript', 'python', 'java', 'c++', 'c#', 'go', 'rust',
  'kotlin', 'swift', 'php', 'ruby', 'dart', 'scala', 'r', 'sql',
];

const FRAMEWORKS = [
  'react', 'angular', 'vue', 'svelte', 'next.js', 'nextjs', 'node', 'nodejs',
  'express', 'nestjs', 'django', 'flask', 'spring', 'laravel', 'flutter',
  'tensorflow', 'pytorch',
];

const ORGANIZATIONS = [
  'google', 'openai', 'microsoft', 'apple', 'amazon', 'meta', 'nvidia',
  'anthropic', 'github', 'openrouter', 'gemini',
];

const PRODUCTS = [
  'gpt-4', 'gpt-5', 'gemini', 'claude', 'chatgpt', 'copilot', 'iphone',
  'android', 'windows', 'macos', 'linux',
];

/**
 * Production entity extractor. Combines regex-based structured extraction
 * with gazetteer lookups and runtime-registrable custom entities.
 */
export class EntityExtractor implements IEntityExtractor {
  private readonly rules: EntityRule[];
  private readonly customEntities = new Map<string, CustomEntityDefinition>();

  constructor() {
    this.rules = this.buildBuiltInRules();
  }

  /** Extracts and deduplicates all entities from the input. */
  public extract(input: string): IntentEntity[] {
    const found: IntentEntity[] = [];

    // 1. Regex-based structured rules.
    for (const rule of this.rules) {
      this.applyRegexRule(input, rule, found);
    }

    // 2. Gazetteer-based rules.
    this.applyGazetteer(input, 'city', CITIES, 0.7, found);
    this.applyGazetteer(input, 'country', COUNTRIES, 0.75, found);
    this.applyGazetteer(input, 'programming_language', PROGRAMMING_LANGUAGES, 0.85, found);
    this.applyGazetteer(input, 'framework', FRAMEWORKS, 0.85, found);
    this.applyGazetteer(input, 'organization', ORGANIZATIONS, 0.8, found);
    this.applyGazetteer(input, 'product', PRODUCTS, 0.75, found);

    // 3. Custom registered entities.
    for (const def of this.customEntities.values()) {
      this.applyRegexRule(
        input,
        {
          type: def.type,
          pattern: def.pattern,
          confidence: def.confidence ?? 0.7,
          normalize: def.normalize,
        },
        found,
      );
    }

    // 4. Heuristic proper-name detection (capitalized words in raw text).
    this.applyNameHeuristic(input, found);

    return this.dedupe(found).slice(0, INTENT_LIMITS.maxEntities);
  }

  /** Registers a custom entity definition. */
  public registerEntity(def: CustomEntityDefinition): void {
    this.customEntities.set(def.type, def);
  }

  /** Removes a previously registered custom entity by type. */
  public removeEntity(type: string): boolean {
    return this.customEntities.delete(type);
  }

  /* ---------------------------- internals ---------------------------- */

  /** Builds the built-in regex rule set. */
  private buildBuiltInRules(): EntityRule[] {
    return [
      {
        type: 'email',
        pattern: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
        confidence: 0.98,
        normalize: (v) => v.toLowerCase(),
      },
      {
        type: 'url',
        pattern: /https?:\/\/[^\s]+/gi,
        confidence: 0.97,
      },
      {
        type: 'phone',
        pattern: /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{4}/g,
        confidence: 0.8,
        normalize: (v) => v.replace(/[\s-]/g, ''),
      },
      {
        type: 'currency',
        pattern: /(?:[$€£¥₨]|rs\.?|usd|eur|gbp|pkr)\s?\d+(?:[.,]\d+)?/gi,
        confidence: 0.85,
      },
      {
        type: 'date',
        pattern:
          /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?)\b/gi,
        confidence: 0.85,
      },
      {
        type: 'time',
        pattern: /\b(?:[01]?\d|2[0-3]):[0-5]\d(?:\s?[ap]m)?\b|\b\d{1,2}\s?[ap]m\b/gi,
        confidence: 0.85,
      },
      {
        type: 'file_path',
        pattern: /(?:[a-zA-Z]:\\|\.?\/)?(?:[\w.-]+[/\\])*[\w.-]+\.[a-zA-Z0-9]{1,8}\b/g,
        confidence: 0.7,
      },
    ];
  }

  /** Applies a single regex rule, appending matches. */
  private applyRegexRule(
    input: string,
    rule: EntityRule,
    out: IntentEntity[],
  ): void {
    const flags = rule.pattern.flags.includes('g')
      ? rule.pattern.flags
      : rule.pattern.flags + 'g';
    const re = new RegExp(rule.pattern.source, flags);
    let match: RegExpExecArray | null;

    while ((match = re.exec(input)) !== null) {
      const value = match[0];
      if (!value) {
        re.lastIndex++;
        continue;
      }
      out.push({
        type: rule.type,
        value,
        normalized: rule.normalize ? rule.normalize(value) : undefined,
        start: match.index,
        end: match.index + value.length,
        confidence: clamp(rule.confidence),
      });
    }
  }

  /** Matches gazetteer terms as whole-word occurrences. */
  private applyGazetteer(
    input: string,
    type: string,
    terms: string[],
    confidence: number,
    out: IntentEntity[],
  ): void {
    const lower = input.toLowerCase();
    for (const term of terms) {
      let from = 0;
      let idx = lower.indexOf(term, from);
      while (idx !== -1) {
        const before = idx === 0 ? ' ' : lower[idx - 1];
        const after =
          idx + term.length >= lower.length ? ' ' : lower[idx + term.length];
        const boundaryOk = /[^a-z0-9]/.test(before) && /[^a-z0-9]/.test(after);
        if (boundaryOk) {
          out.push({
            type,
            value: input.slice(idx, idx + term.length),
            normalized: term,
            start: idx,
            end: idx + term.length,
            confidence: clamp(confidence),
          });
        }
        from = idx + term.length;
        idx = lower.indexOf(term, from);
      }
    }
  }

  /**
   * Detects likely proper names: sequences of capitalized words in the
   * ORIGINAL (non-normalized) text, excluding sentence-initial noise.
   */
  private applyNameHeuristic(input: string, out: IntentEntity[]): void {
    const re = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(input)) !== null) {
      const value = match[1];
      // Skip if it overlaps an existing higher-confidence entity.
      const start = match.index;
      const end = start + value.length;
      const overlaps = out.some((e) => e.start < end && e.end > start);
      if (overlaps) continue;
      out.push({
        type: 'name',
        value,
        start,
        end,
        confidence: 0.5,
      });
    }
  }

  /** Removes overlapping duplicates, keeping the highest-confidence entity. */
  private dedupe(entities: IntentEntity[]): IntentEntity[] {
    const sorted = [...entities].sort(
      (a, b) => b.confidence - a.confidence || a.start - b.start,
    );
    const kept: IntentEntity[] = [];
    for (const e of sorted) {
      const conflict = kept.some(
        (k) => k.type === e.type && k.start < e.end && k.end > e.start,
      );
      if (!conflict) kept.push(e);
    }
    return kept.sort((a, b) => a.start - b.start);
  }
}
