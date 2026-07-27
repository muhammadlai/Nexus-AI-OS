/**
 * ============================================================================
 * Nexus AI OS — Intent Engine Constants
 * ----------------------------------------------------------------------------
 * Canonical intent names, confidence thresholds, priorities, and limits.
 * Centralized so the entire subsystem shares a single source of truth.
 * ============================================================================
 */

/**
 * The canonical set of supported intents.
 * Frozen enum-like object for ESM-safe, tree-shakeable constants.
 */
export enum IntentName {
  Greeting = 'greeting',
  Conversation = 'conversation',
  Question = 'question',
  Search = 'search',
  Reminder = 'reminder',
  Calendar = 'calendar',
  Email = 'email',
  Browser = 'browser',
  FileOperation = 'file_operation',
  CodeGeneration = 'code_generation',
  CodingHelp = 'coding_help',
  Translation = 'translation',
  Math = 'math',
  Weather = 'weather',
  News = 'news',
  Music = 'music',
  Video = 'video',
  Shopping = 'shopping',
  Navigation = 'navigation',
  SystemControl = 'system_control',
  Automation = 'automation',
  Knowledge = 'knowledge',
  MemoryRecall = 'memory_recall',
  MemoryStore = 'memory_store',
  TaskCreation = 'task_creation',
  TaskExecution = 'task_execution',
  TaskCancel = 'task_cancel',
  VoiceCommand = 'voice_command',
  VisionCommand = 'vision_command',
  ScreenAnalysis = 'screen_analysis',
  ImageGeneration = 'image_generation',
  DocumentAnalysis = 'document_analysis',
  Meeting = 'meeting',
  Learning = 'learning',
  Unknown = 'unknown',
}

/** Confidence thresholds governing classification decisions. */
export const INTENT_THRESHOLDS = {
  /** Minimum score for an intent to be considered a valid match. */
  minConfidence: 0.35,
  /** Score above which an intent is treated as highly confident. */
  highConfidence: 0.75,
  /** Delta within which two intents are treated as ambiguous. */
  ambiguityMargin: 0.12,
  /** Minimum score for secondary (multi-)intents to be retained. */
  secondaryConfidence: 0.4,
} as const;

/** Default priority values used by the registry (higher wins on ties). */
export const INTENT_PRIORITIES = {
  system: 100,
  high: 75,
  normal: 50,
  low: 25,
  fallback: 0,
} as const;

/** Hard operational limits protecting performance and memory. */
export const INTENT_LIMITS = {
  /** Maximum intents retained in a single prediction result. */
  maxPredictions: 5,
  /** Maximum entities extracted from one message. */
  maxEntities: 64,
  /** Maximum conversation-history items considered by the analyzer. */
  maxHistoryWindow: 20,
  /** Maximum length (chars) of input processed. */
  maxInputLength: 8_000,
} as const;

/** The intent used when nothing matches. */
export const FALLBACK_INTENT = IntentName.Unknown;

/**
 * Keyword / pattern definitions per intent. Each intent lists keyword
 * groups and regex patterns. This is the deterministic baseline that a
 * future LLM classifier can augment or override without breaking the API.
 */
export interface IntentPatternDefinition {
  /** Keywords that strongly indicate this intent. */
  keywords: string[];
  /** Regex patterns that indicate this intent. */
  patterns: RegExp[];
  /** Base weight applied when this intent matches. */
  weight: number;
}

/** Baseline pattern library covering every supported intent. */
export const INTENT_PATTERNS: Record<string, IntentPatternDefinition> = {
  [IntentName.Greeting]: {
    keywords: ['hi', 'hello', 'hey', 'salam', 'assalam', 'good morning', 'good evening'],
    patterns: [/\b(hi|hello|hey)\b/i, /\bgood\s+(morning|evening|afternoon)\b/i],
    weight: 1,
  },
  [IntentName.Conversation]: {
    keywords: ['how are you', 'what do you think', 'lets talk', 'chat', 'tell me'],
    patterns: [/\bhow\s+are\s+you\b/i, /\blet'?s\s+(talk|chat)\b/i],
    weight: 0.8,
  },
  [IntentName.Question]: {
    keywords: ['what', 'why', 'how', 'when', 'where', 'who', 'which'],
    patterns: [/\b(what|why|how|when|where|who|which)\b/i, /\?\s*$/],
    weight: 0.9,
  },
  [IntentName.Search]: {
    keywords: ['search', 'find', 'look up', 'google', 'lookup'],
    patterns: [/\b(search|find|look\s?up|google)\b/i],
    weight: 1,
  },
  [IntentName.Reminder]: {
    keywords: ['remind', 'reminder', 'alert me', 'dont forget'],
    patterns: [/\bremind\s+me\b/i, /\bset\s+a?\s*reminder\b/i],
    weight: 1.1,
  },
  [IntentName.Calendar]: {
    keywords: ['schedule', 'calendar', 'appointment', 'event', 'book'],
    patterns: [/\b(schedule|appointment|calendar|book)\b/i],
    weight: 1,
  },
  [IntentName.Email]: {
    keywords: ['email', 'send mail', 'compose', 'inbox', 'reply'],
    patterns: [/\b(email|e-mail|inbox|compose)\b/i, /\bsend\s+(a\s+)?mail\b/i],
    weight: 1,
  },
  [IntentName.Browser]: {
    keywords: ['open website', 'browse', 'navigate to', 'open url', 'open tab'],
    patterns: [/\bopen\s+(the\s+)?(website|url|tab|browser)\b/i, /\bbrowse\b/i],
    weight: 1,
  },
  [IntentName.FileOperation]: {
    keywords: ['create file', 'delete file', 'open file', 'save', 'rename', 'move file', 'copy file'],
    patterns: [/\b(create|delete|open|save|rename|move|copy)\s+(the\s+)?file\b/i],
    weight: 1,
  },
  [IntentName.CodeGeneration]: {
    keywords: ['write code', 'generate code', 'create function', 'build a', 'implement'],
    patterns: [/\b(write|generate|create)\s+(the\s+)?(code|function|class|component)\b/i],
    weight: 1.1,
  },
  [IntentName.CodingHelp]: {
    keywords: ['debug', 'fix bug', 'error in', 'why is my code', 'refactor', 'optimize code'],
    patterns: [/\b(debug|fix|refactor|optimi[sz]e)\b/i, /\berror\s+in\b/i],
    weight: 1,
  },
  [IntentName.Translation]: {
    keywords: ['translate', 'translation', 'in french', 'in urdu', 'to english'],
    patterns: [/\btranslate\b/i, /\bin\s+(french|urdu|spanish|german|english|arabic)\b/i],
    weight: 1,
  },
  [IntentName.Math]: {
    keywords: ['calculate', 'solve', 'sum of', 'multiply', 'divide', 'equation'],
    patterns: [/\b(calculate|solve|compute)\b/i, /\d+\s*[+\-*/]\s*\d+/],
    weight: 1,
  },
  [IntentName.Weather]: {
    keywords: ['weather', 'temperature', 'forecast', 'raining', 'sunny'],
    patterns: [/\b(weather|temperature|forecast)\b/i],
    weight: 1.1,
  },
  [IntentName.News]: {
    keywords: ['news', 'headlines', 'latest news', 'whats happening'],
    patterns: [/\b(news|headlines)\b/i],
    weight: 1,
  },
  [IntentName.Music]: {
    keywords: ['play music', 'song', 'playlist', 'play track', 'pause music'],
    patterns: [/\bplay\s+(some\s+)?(music|song|track)\b/i, /\bplaylist\b/i],
    weight: 1,
  },
  [IntentName.Video]: {
    keywords: ['play video', 'youtube', 'watch', 'movie', 'stream'],
    patterns: [/\b(play|watch)\s+(the\s+)?(video|movie)\b/i, /\byoutube\b/i],
    weight: 1,
  },
  [IntentName.Shopping]: {
    keywords: ['buy', 'order', 'add to cart', 'purchase', 'shop for'],
    patterns: [/\b(buy|order|purchase)\b/i, /\badd\s+to\s+cart\b/i],
    weight: 1,
  },
  [IntentName.Navigation]: {
    keywords: ['directions', 'navigate', 'route to', 'how to get to', 'map'],
    patterns: [/\b(directions|navigate|route)\b/i, /\bhow\s+to\s+get\s+to\b/i],
    weight: 1,
  },
  [IntentName.SystemControl]: {
    keywords: ['shutdown', 'restart', 'volume', 'brightness', 'settings', 'turn off', 'turn on'],
    patterns: [/\b(shutdown|restart|reboot)\b/i, /\b(volume|brightness)\b/i, /\bturn\s+(on|off)\b/i],
    weight: 1,
  },
  [IntentName.Automation]: {
    keywords: ['automate', 'workflow', 'when this then', 'trigger', 'routine'],
    patterns: [/\bautomat(e|ion)\b/i, /\bworkflow\b/i, /\bwhen\s+.+\s+then\b/i],
    weight: 1,
  },
  [IntentName.Knowledge]: {
    keywords: ['explain', 'define', 'what is', 'tell me about', 'meaning of'],
    patterns: [/\b(explain|define)\b/i, /\bwhat\s+is\b/i, /\btell\s+me\s+about\b/i],
    weight: 0.9,
  },
  [IntentName.MemoryRecall]: {
    keywords: ['remember when', 'what did i', 'recall', 'do you remember', 'my saved'],
    patterns: [/\bdo\s+you\s+remember\b/i, /\bwhat\s+did\s+i\b/i, /\brecall\b/i],
    weight: 1,
  },
  [IntentName.MemoryStore]: {
    keywords: ['remember that', 'save this', 'note that', 'keep in mind', 'store this'],
    patterns: [/\bremember\s+that\b/i, /\bsave\s+this\b/i, /\bnote\s+that\b/i],
    weight: 1,
  },
  [IntentName.TaskCreation]: {
    keywords: ['create task', 'add task', 'new task', 'to do', 'todo'],
    patterns: [/\b(create|add|new)\s+task\b/i, /\bto-?do\b/i],
    weight: 1,
  },
  [IntentName.TaskExecution]: {
    keywords: ['run task', 'execute', 'start task', 'do it', 'perform'],
    patterns: [/\b(run|execute|start|perform)\s+(the\s+)?task\b/i],
    weight: 1,
  },
  [IntentName.TaskCancel]: {
    keywords: ['cancel task', 'stop task', 'abort', 'cancel', 'never mind'],
    patterns: [/\b(cancel|stop|abort)\b/i, /\bnever\s+mind\b/i],
    weight: 1,
  },
  [IntentName.VoiceCommand]: {
    keywords: ['listen', 'voice mode', 'speak', 'say', 'wake word'],
    patterns: [/\bvoice\s+(mode|command)\b/i, /\bstart\s+listening\b/i],
    weight: 1,
  },
  [IntentName.VisionCommand]: {
    keywords: ['look at', 'camera', 'see this', 'scan', 'detect object'],
    patterns: [/\b(look\s+at|camera|scan)\b/i, /\bdetect\s+object\b/i],
    weight: 1,
  },
  [IntentName.ScreenAnalysis]: {
    keywords: ['analyze screen', 'whats on my screen', 'read screen', 'screenshot'],
    patterns: [/\b(analy[sz]e|read)\s+(my\s+)?screen\b/i, /\bscreenshot\b/i],
    weight: 1,
  },
  [IntentName.ImageGeneration]: {
    keywords: ['generate image', 'create image', 'draw', 'make a picture', 'image of'],
    patterns: [/\b(generate|create|make)\s+(an?\s+)?(image|picture|photo)\b/i, /\bdraw\b/i],
    weight: 1.1,
  },
  [IntentName.DocumentAnalysis]: {
    keywords: ['analyze document', 'summarize pdf', 'read document', 'extract from'],
    patterns: [/\b(analy[sz]e|summari[sz]e|read)\s+(the\s+)?(document|pdf|file)\b/i],
    weight: 1,
  },
  [IntentName.Meeting]: {
    keywords: ['meeting', 'join call', 'zoom', 'conference', 'schedule meeting'],
    patterns: [/\bmeeting\b/i, /\bjoin\s+(the\s+)?(call|meeting)\b/i, /\b(zoom|teams)\b/i],
    weight: 1,
  },
  [IntentName.Learning]: {
    keywords: ['teach me', 'learn', 'tutorial', 'how do i', 'course'],
    patterns: [/\bteach\s+me\b/i, /\blearn\b/i, /\btutorial\b/i, /\bhow\s+do\s+i\b/i],
    weight: 0.9,
  },
  [IntentName.Unknown]: {
    keywords: [],
    patterns: [],
    weight: 0,
  },
};
