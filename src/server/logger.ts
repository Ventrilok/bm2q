type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m",  // green
  warn: "\x1b[33m",  // yellow
  error: "\x1b[31m", // red
};

const RESET = "\x1b[0m";

const DEFAULT_LEVEL: LogLevel =
  process.env.NODE_ENV === "production" ? "info" : "debug";

const envLevel = process.env.LOG_LEVEL as LogLevel | undefined;
const minLevel: LogLevel =
  envLevel && Object.hasOwn(LEVEL_PRIORITY, envLevel) ? envLevel : DEFAULT_LEVEL;

// No ANSI colors when output is piped or collected (e.g. container logs)
const useColor = Boolean(process.stdout.isTTY);

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[minLevel];
}

function formatTimestamp(): string {
  const d = new Date();
  return d.toISOString().slice(11, 23); // HH:mm:ss.SSS
}

function formatArgs(args: unknown[]): string {
  return args
    .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
    .join(" ");
}

function log(level: LogLevel, scope: string, ...args: unknown[]) {
  if (!shouldLog(level)) return;
  const label = `[${level.toUpperCase()}]`;
  const tag = useColor ? `${LEVEL_COLORS[level]}${label}${RESET}` : label;
  const ts = formatTimestamp();
  const prefix = scope ? `[${scope}]` : "";
  console.log(`${ts} ${tag} ${prefix} ${formatArgs(args)}`);
}

export function createLogger(scope: string) {
  return {
    debug: (...args: unknown[]) => log("debug", scope, ...args),
    info: (...args: unknown[]) => log("info", scope, ...args),
    warn: (...args: unknown[]) => log("warn", scope, ...args),
    error: (...args: unknown[]) => log("error", scope, ...args),
  };
}
