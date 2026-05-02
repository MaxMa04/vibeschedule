export type ExitCode = 1 | 2 | 3;

export class CliError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly exitCode: ExitCode = 1,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export class ConfigError extends CliError {
  constructor(message: string, details?: unknown) {
    super(message, "CONFIG_ERROR", 3, details);
  }
}

export class ExternalApiError extends CliError {
  constructor(message: string, details?: unknown) {
    super(message, "EXTERNAL_API_ERROR", 2, details);
  }
}
