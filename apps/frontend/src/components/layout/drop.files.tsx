import { useDropzone } from 'react-dropzone';
import { FC, ReactNode } from 'react';
import { UploadIcon } from 'lucide-react';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { cn } from '@vibeschedule/frontend/lib/utils';

export const DropFiles: FC<{
  children: ReactNode;
  className?: string;
  onDrop: (files: File[]) => void;
  disabled?: boolean;
}> = (props) => {
  const t = useT();
  const toaster = useToaster();

  const { getRootProps, isDragActive } = useDropzone({
    noClick: true,
    noKeyboard: true,
    onDrop: (files) => {
      if (props.disabled) {
        toaster.show(t('upload_in_progress'), 'warning');
        return;
      }
      props.onDrop(files);
    },
  });
  return (
    <div {...getRootProps()} className={cn('relative', props.className)}>
      {isDragActive && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary bg-background/90 text-sm font-medium backdrop-blur-sm animate-in fade-in-0">
          <UploadIcon className="size-6 text-muted-foreground" />
          {t('drag_n_drop_some_files_here')}
        </div>
      )}
      {props.children}
    </div>
  );
};
