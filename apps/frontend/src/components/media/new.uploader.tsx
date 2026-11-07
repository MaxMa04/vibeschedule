import { useMemo } from 'react';
import Uppy, { UploadResult } from '@uppy/core';
import Compressor from '@uppy/compressor';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { r2UploadOptions } from '@vibeschedule/react/helpers/uppy.upload';
import AwsS3Multipart from '@uppy/aws-s3';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { useLaunchStore } from '@vibeschedule/frontend/components/new-launch/store';

const MAX_IMAGE_SIZE = 30 * 1024 * 1024;
const MAX_VIDEO_SIZE = 1000 * 1024 * 1024;

const expandTypes: Record<string, string[]> = {
  'image/*': [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
  ],
  'video/*': ['video/mp4', 'video/mpeg', 'video/quicktime'],
};

// GIFs lose their animation when compressed
class CompressionWrapper extends Compressor<any, any> {
  override async prepareUpload(fileIDs: string[]) {
    const { files } = this.uppy.getState();
    return super.prepareUpload(
      fileIDs.filter((id) => {
        const file = files[id];
        return (
          !!file &&
          file.type !== 'image/gif' &&
          !(file.name || '').toLowerCase().endsWith('.gif')
        );
      })
    );
  }
}

export function useUppyUploader(props: {
  onUploadSuccess: (result: any[]) => void;
  onStart: () => void;
  onEnd: () => void;
  allowedFileTypes: string;
}) {
  const setLocked = useLaunchStore((state) => state.setLocked);
  const toast = useToaster();
  const t = useT();
  const fetch = useFetch();
  const { onUploadSuccess, allowedFileTypes } = props;

  return useMemo(() => {
    let fileOrderIndex = 0;
    const allowed = allowedFileTypes
      .split(',')
      .map((type) => type.trim())
      .flatMap((type) => expandTypes[type] || [type]);

    const uppy = new Uppy({
      autoProceed: true,
      restrictions: { maxFileSize: MAX_VIDEO_SIZE },
    });

    uppy.addPreProcessor(async (fileIDs) => {
      for (const file of uppy.getFiles()) {
        if (!fileIDs.includes(file.id)) {
          continue;
        }

        const isVideo = file.type?.startsWith('video/');
        const message = !allowed.includes(file.type || '')
          ? t('file_type_not_allowed', { types: allowedFileTypes })
          : file.size! > (isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE)
          ? t(isVideo ? 'video_too_large' : 'image_too_large')
          : '';

        if (message) {
          uppy.info(message, 'error', 5000);
          toast.show(message, 'warning');
          uppy.removeFile(file.id);
          throw new Error(message);
        }
      }
    });

    uppy.use(AwsS3Multipart, r2UploadOptions(fetch));
    uppy.use(CompressionWrapper, {
      convertTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxWidth: 1000,
      maxHeight: 1000,
      quality: 1,
    });

    uppy.on('file-added', (file) => {
      setLocked(true);
      uppy.setFileMeta(file.id, { addedOrder: fileOrderIndex++ });
    });
    uppy.on('error', () => {
      // a single file failing leaves the batch running, 'complete' reports it with the rest
      if (Object.keys(uppy.getState().currentUploads).length) {
        return;
      }
      uppy.cancelAll();
      setLocked(false);
      props.onEnd();
      fileOrderIndex = 0;
    });
    uppy.on('upload-start', () => {
      props.onStart();
    });
    uppy.on('complete', (result: UploadResult<any, any>) => {
      for (const file of [
        ...(result.successful || []),
        ...(result.failed || []),
      ]) {
        uppy.removeFile(file.id);
      }

      if (result.failed?.length) {
        toast.show(t('some_files_failed_to_upload'), 'warning');
      }

      props.onEnd();
      setLocked(false);
      fileOrderIndex = 0;
      onUploadSuccess(
        [...(result.successful || [])]
          .sort((a, b) => +a.meta.addedOrder - +b.meta.addedOrder)
          .map((p) => p.response!.body!.saved)
      );
    });
    return uppy;
  }, []);
}
