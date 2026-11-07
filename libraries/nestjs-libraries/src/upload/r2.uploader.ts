import {
  S3Client,
  ListPartsCommand,
  CreateMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  UploadPartCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Request, Response } from 'express';
import path from 'path';
import { Readable } from 'stream';
import { makeId } from '@vibeschedule/nestjs-libraries/services/make.is';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fileTypeFromBuffer } = require('file-type');

const ALLOWED_EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
};

export const UPLOAD_ALLOWED_MIME = new Set(Object.values(ALLOWED_EXT_TO_MIME));

export const MAX_VIDEO_SIZE = 1024 * 1024 * 1024;

export const maxUploadSize = (mime: string) =>
  mime.startsWith('image/') ? 10 * 1024 * 1024 : MAX_VIDEO_SIZE;

const { CLOUDFLARE_BUCKETNAME, CLOUDFLARE_BUCKET_URL } = process.env;

const R2 = new S3Client({
  region: process.env.CLOUDFLARE_REGION || 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY!,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
  },
  // presigned part URLs must not carry checksums the browser does not send
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

const normalizeExtension = (filename: string) => {
  const ext = path.extname(filename || '').toLowerCase();
  return ALLOWED_EXT_TO_MIME[ext] ? ext : null;
};

export const publicUrl = (key: string) => `${CLOUDFLARE_BUCKET_URL}/${key}`;

// Streams into the bucket without buffering the whole body; the caller has
// already sniffed the real type from the first bytes
export async function uploadStream(
  stream: Readable,
  mime: string,
  ext: string
) {
  const key = `${makeId(20)}.${ext}`;
  await new Upload({
    client: R2,
    params: {
      Bucket: CLOUDFLARE_BUCKETNAME,
      Key: key,
      Body: stream,
      ContentType: mime,
    },
  }).done();
  return { filename: key, path: publicUrl(key) };
}

export async function removeFile(fileUrl: string) {
  await R2.send(
    new DeleteObjectCommand({
      Bucket: CLOUDFLARE_BUCKETNAME,
      Key: fileUrl.split('/').pop(),
    })
  );
}

// The browser uploads the parts straight to R2 through presigned URLs (Uppy
// AwsS3 multipart), the backend only signs and completes
export default async function handleR2Upload(
  endpoint: string,
  req: Request,
  res: Response
) {
  switch (endpoint) {
    case 'create-multipart-upload':
      return createMultipartUpload(req, res);
    case 'sign-part':
      return signPart(req, res);
    case 'list-parts':
      return listParts(req, res);
    case 'abort-multipart-upload':
      return abortMultipartUpload(req, res);
    case 'complete-multipart-upload':
      return completeMultipartUpload(req, res);
  }
  return res.status(404).end();
}

async function createMultipartUpload(req: Request, res: Response) {
  const ext = normalizeExtension(req.body.file?.name);
  if (!ext) {
    return res.status(400).json({ message: 'Dateityp nicht unterstützt.' });
  }

  const response = await R2.send(
    new CreateMultipartUploadCommand({
      Bucket: CLOUDFLARE_BUCKETNAME,
      Key: makeId(20) + ext,
      ContentType: ALLOWED_EXT_TO_MIME[ext],
    })
  );
  return res
    .status(200)
    .json({ uploadId: response.UploadId, key: response.Key });
}

async function signPart(req: Request, res: Response) {
  const { key, uploadId } = req.body;
  const url = await getSignedUrl(
    R2,
    new UploadPartCommand({
      Bucket: CLOUDFLARE_BUCKETNAME,
      Key: key,
      PartNumber: parseInt(req.body.partNumber),
      UploadId: uploadId,
    }),
    { expiresIn: 3600 }
  );
  return res.status(200).json({ url });
}

async function listParts(req: Request, res: Response) {
  const { key, uploadId } = req.body;
  const response = await R2.send(
    new ListPartsCommand({
      Bucket: CLOUDFLARE_BUCKETNAME,
      Key: key,
      UploadId: uploadId,
    })
  );
  return res.status(200).json(response.Parts || []);
}

async function abortMultipartUpload(req: Request, res: Response) {
  const { key, uploadId } = req.body;
  const response = await R2.send(
    new AbortMultipartUploadCommand({
      Bucket: CLOUDFLARE_BUCKETNAME,
      Key: key,
      UploadId: uploadId,
    })
  );
  return res.status(200).json(response);
}

// Returns the public URL, or answers the request itself when the file is rejected
async function completeMultipartUpload(req: Request, res: Response) {
  const { key, uploadId, parts } = req.body;
  await R2.send(
    new CompleteMultipartUploadCommand({
      Bucket: CLOUDFLARE_BUCKETNAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    })
  );

  // the extension was only declared by the browser, the bytes decide
  const ext = normalizeExtension(key);
  const head = await R2.send(
    new GetObjectCommand({
      Bucket: CLOUDFLARE_BUCKETNAME,
      Key: key,
      Range: 'bytes=0-4100',
    })
  );
  const detected = await fileTypeFromBuffer(
    Buffer.from(await head.Body!.transformToByteArray())
  );
  const size = Number(head.ContentRange?.split('/')[1]);
  if (
    !ext ||
    detected?.mime !== ALLOWED_EXT_TO_MIME[ext] ||
    !(size <= maxUploadSize(detected.mime))
  ) {
    await R2.send(
      new DeleteObjectCommand({ Bucket: CLOUDFLARE_BUCKETNAME, Key: key })
    );
    return res
      .status(400)
      .json({ message: 'Datei ist zu groß oder passt nicht zum Dateityp.' });
  }

  return { Location: publicUrl(key) };
}
