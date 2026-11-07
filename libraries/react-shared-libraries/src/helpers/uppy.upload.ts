import sha256 from 'sha256';

const call = async (fetch: any, endpoint: string, data: object) => {
  const res = await fetch(`/media/${endpoint}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  // customFetch does not throw on HTTP errors, and Uppy treats whatever this
  // returns as a successful step
  if (!res.ok) {
    throw new Error(await res.text().catch(() => ''));
  }
  return res.json();
};

// multipart upload straight to R2, the backend signs every step
export const r2UploadOptions = (fetch: any) => ({
  // no Companion server, every step below is custom; the empty endpoint
  // only satisfies the plugin's option types
  endpoint: '',
  shouldUseMultipart: () => true,
  createMultipartUpload: async (file: any) => {
    // hashing loads the whole file into memory, skip it for big ones
    const fileHash =
      file.size <= 100 * 1024 * 1024
        ? sha256(Buffer.from(await new Response(file.data).arrayBuffer()))
        : '';
    return call(fetch, 'create-multipart-upload', {
      file,
      fileHash,
      contentType: file.type,
    });
  },
  listParts: (file: any, props: any) =>
    call(fetch, 'list-parts', { file, ...props }),
  signPart: (file: any, props: any) =>
    call(fetch, 'sign-part', { file, ...props }),
  abortMultipartUpload: (file: any, props: any) =>
    call(fetch, 'abort-multipart-upload', { file, ...props }),
  completeMultipartUpload: (file: any, props: any) =>
    call(fetch, 'complete-multipart-upload', { file, ...props }),
});
