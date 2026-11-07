import { BadRequestException } from '@nestjs/common';
import { pipeline, Readable, Transform } from 'stream';
import {
  maxUploadSize,
  UPLOAD_ALLOWED_MIME,
  uploadStream,
} from '@vibeschedule/nestjs-libraries/upload/r2.uploader';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fileTypeStream } = require('file-type');

// Fails once the bytes exceed maxSize, so a missing or lying Content-Length
// cannot stream an unbounded body into storage
function maxSizeStream(maxSize: number) {
  let total = 0;
  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      total += chunk.length;
      if (total > maxSize) {
        return callback(new BadRequestException('Datei ist zu groß.'));
      }
      callback(null, chunk);
    },
  });
}

// Sniffs the real type from the first bytes, applies the per-type size cap
// and streams the rest into R2
export async function uploadStreamToStorage(
  webStream: ReadableStream,
  declaredSize = 0
) {
  let sniffed: ReadableStream & { fileType?: { mime: string; ext: string } };
  try {
    sniffed = await fileTypeStream(webStream);
  } catch (err) {
    throw new BadRequestException('Datei konnte nicht gelesen werden.', {
      cause: err,
    });
  }

  const detected = sniffed.fileType;
  if (!detected || !UPLOAD_ALLOWED_MIME.has(detected.mime)) {
    await sniffed.cancel();
    throw new BadRequestException('Dateityp nicht unterstützt.');
  }

  const maxSize = maxUploadSize(detected.mime);
  if (declaredSize > maxSize) {
    await sniffed.cancel();
    throw new BadRequestException('Datei ist zu groß.');
  }

  // pipeline (not pipe) so failing the cap also tears down the source
  const body = pipeline(
    Readable.fromWeb(sniffed as any),
    maxSizeStream(maxSize),
    () => {}
  );

  try {
    return {
      ...(await uploadStream(body, detected.mime, detected.ext)),
      ext: detected.ext,
    };
  } catch (err) {
    body.destroy();
    throw err;
  }
}
