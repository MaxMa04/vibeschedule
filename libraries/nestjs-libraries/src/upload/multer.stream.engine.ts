import { Request } from 'express';
import { StorageEngine } from 'multer';
import { Readable } from 'stream';
import { uploadStreamToStorage } from '@vibeschedule/nestjs-libraries/upload/custom.upload.validation';
import {
  MAX_VIDEO_SIZE,
  removeFile,
} from '@vibeschedule/nestjs-libraries/upload/r2.uploader';

// Streams each incoming file straight into R2 instead of buffering it.
// `file.filename` / `file.path` become the stored key and public URL,
// `file.originalname` keeps the sender's name with the detected extension
class MulterStreamEngine implements StorageEngine {
  _handleFile(
    req: Request,
    file: Express.Multer.File,
    cb: (error?: any, info?: Partial<Express.Multer.File>) => void
  ) {
    uploadStreamToStorage(Readable.toWeb(file.stream) as any).then(
      (uploaded) => {
        const safeBase =
          (file.originalname || 'upload')
            .replace(/\.[^./\\]*$/, '')
            .replace(/[\\/]/g, '_')
            .slice(0, 100) || 'upload';
        cb(null, {
          filename: uploaded.filename,
          path: uploaded.path,
          originalname: `${safeBase}.${uploaded.ext}`,
        });
      },
      (err) => cb(err)
    );
  }

  // the request failed after the file was stored, so drop the orphan
  _removeFile(
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null) => void
  ) {
    removeFile(file.path).then(
      () => cb(null),
      (err) => cb(err)
    );
  }
}

// Multer's own limit sits one byte above the largest allowed type so the
// in-stream cap rejects with a clean 400 instead of multer truncating
export const streamUploadOptions = {
  storage: new MulterStreamEngine(),
  limits: { fileSize: MAX_VIDEO_SIZE + 1 },
};
