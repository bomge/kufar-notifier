import pino from 'pino';
import pinoPretty from 'pino-pretty';
import fs from 'node:fs';
import path from 'node:path';
import type { ILogger } from '../core/interfaces/ILogger';

interface LoggerOptions {
  prefixes?: Record<string, string>;
  logLevel?: pino.Level;
  logFilePath?: string;
  token?: string;
}

class LoggerService implements ILogger {
  private logger: pino.Logger;

  constructor(options: LoggerOptions = {}) {
    const {
      prefixes = {},
      logLevel = 'info',
      logFilePath = './logs/app.log',
      token,
    } = options;

    this.logger = this.createLogger(logLevel, logFilePath, token);
    this.logger = this.logger.child(prefixes);
  }

  private createLogger(logLevel: pino.Level, logFilePath: string, token?: string): pino.Logger {
    this.ensureLogDirectoryExists(logFilePath);

    const streams: pino.StreamEntry[] = [
      { level: logLevel, stream: this.createPrettyStream() },
      { level: 'trace', stream: pino.destination(logFilePath) },
    ];

    if (token) {
      streams.push(this.createLogtailStream(token));
    }

    return pino(
      {
        level: logLevel,
        serializers: {
          error: this.createErrorSerializer(),
        },
      },
      pino.multistream(streams)
    );
  }

  private ensureLogDirectoryExists(logFilePath: string): void {
    const logDir = path.dirname(logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private createPrettyStream(): pino.StreamEntry['stream'] {
    return pinoPretty({
      translateTime: 'yyyy-mm-dd HH:MM:ss.l',
      include: 'msg,time,level',
      singleLine: true,
    //   messageFormat: '[{name}] {msg}',
	messageFormat: (log, messageKey) => {
        const message = log[messageKey];
        const module = log.module ? `[${log.module}] ` : '';
        const name = log.name ? `[${log.name}] ` : '';
        return `${module}${name}${message}`;
      },
    });
  }

  private createLogtailStream(token: string): pino.StreamEntry {
    const logtailTransport = pino.transport({
      target: "@logtail/pino",
      options: { sourceToken: token },
    });
    return { level: 'trace', stream: logtailTransport };
  }

  private createErrorSerializer(): pino.SerializerFn {
    return pino.stdSerializers.wrapErrorSerializer((error: any) => {
      if (error.name === 'AxiosError') {
        const toJSON = error.toJSON.bind(error);
        error.toJSON = () => ({
          ...toJSON(),
          response: {
            data: error.response?.data,
            headers: { ...error.response?.headers },
          },
        });
      }
      return error;
    });
  }

  private logWithMetadata(level: pino.Level, message: string, meta?: object): void {
    this.logger[level](meta || {}, message);
  }

  info(message: string, meta?: object): void {
    this.logWithMetadata('info', message, meta);
  }

  warn(message: string, meta?: object): void {
    this.logWithMetadata('warn', message, meta);
  }

  // error(message: string, meta?: object, error?: any): void {
  //   this.logWithMetadata('error', message, { ...meta, error }); //! redo this (error) if we pass error in meta but not as 3rd arg, it will be overrided to empty
  // }

  error(message: string, meta?: object, error?: any): void {
    const errorMeta = error !== undefined ? { error } : {};
    this.logWithMetadata('error', message, { ...meta, ...errorMeta });
}

  debug(message: string, meta?: object): void {
    this.logWithMetadata('debug', message, meta);
  }

  trace(message: string, meta?: object): void {
    this.logWithMetadata('trace', message, meta);
  }

  fatal(message: string, meta?: object, error?: any): void {
    this.logWithMetadata('fatal', message, { ...meta, error });
  }

  child(ctx: object = {}): ILogger {
    const childLogger = this.logger.child(ctx);
    return new ChildLoggerService(childLogger);
  }
}

class ChildLoggerService implements ILogger {
  constructor(private logger: pino.Logger) {}

  private logWithMetadata(level: pino.Level, message: string, meta?: object): void {
    this.logger[level](meta || {}, message);
  }

  info(message: string, meta?: object): void {
    this.logWithMetadata('info', message, meta);
  }

  warn(message: string, meta?: object): void {
    this.logWithMetadata('warn', message, meta);
  }

  error(message: string, meta?: object, error?: any): void {
    this.logWithMetadata('error', message, { ...meta, error });
  }

  debug(message: string, meta?: object): void {
    this.logWithMetadata('debug', message, meta);
  }

  trace(message: string, meta?: object): void {
    this.logWithMetadata('trace', message, meta);
  }

  fatal(message: string, meta?: object, error?: any): void {
    this.logWithMetadata('fatal', message, { ...meta, error });
  }

  child(ctx: object = {}): ILogger {
    const childLogger = this.logger.child(ctx);
    return new ChildLoggerService(childLogger);
  }
}

export default LoggerService;