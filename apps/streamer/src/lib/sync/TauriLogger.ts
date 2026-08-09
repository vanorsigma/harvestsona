import { debug, error, info, warn } from '@tauri-apps/plugin-log';
import type { ILogger } from 'syncflare';

export type SyncflareLogger = ILogger;

// to get the true parent caller, since tauri logs the immediate call site
function getActualCaller(): string | undefined {
  const err = new Error();
  if (!err.stack) return '';

  const lines = err.stack.split('\n');
  const callerLine = lines.find((line) => {
    if (!line) return false;
    return line.includes('at ') && !line.includes('TauriLogger');
  });
  return callerLine;
}

function format(message: string, args: unknown[]): string {
  return args.length > 0 ? `${message} ${JSON.stringify(args)}` : message;
}

export class TauriLogger implements ILogger {
  debug(message: string, ...args: unknown[]): void {
    const actualCaller = getActualCaller();
    if (actualCaller) {
      debug(`[Actual: ${actualCaller}] ${format(message, args)}`);
    } else {
      debug(format(message, args));
    }
  }

  info(message: string, ...args: unknown[]): void {
    info(format(message, args));
  }

  warn(message: string, ...args: unknown[]): void {
    warn(format(message, args));
  }

  error(message: string, ...args: unknown[]): void {
    error(format(message, args));
  }
}
