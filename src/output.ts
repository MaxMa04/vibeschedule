import { CliError } from "./errors.js";

export function printResult(data: unknown, json = false): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  console.log(formatHuman(data));
}

export function printError(error: unknown, json = false): never {
  const cliError =
    error instanceof CliError
      ? error
      : new CliError(error instanceof Error ? error.message : String(error), "UNKNOWN_ERROR", 1);

  if (json) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: {
            code: cliError.code,
            message: cliError.message,
            details: cliError.details,
          },
        },
        null,
        2,
      ),
    );
  } else {
    console.error(`${cliError.code}: ${cliError.message}`);
  }

  process.exit(cliError.exitCode);
}

function formatHuman(data: unknown): string {
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.map((item) => formatHuman(item)).join("\n");
  if (data && typeof data === "object" && "message" in data) {
    return String((data as { message: unknown }).message);
  }
  return JSON.stringify(data, null, 2);
}
