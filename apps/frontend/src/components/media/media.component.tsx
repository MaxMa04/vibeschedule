'use client';

import {
  ChangeEvent,
  FC,
  MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import useSWR from 'swr';
import { useDebounce } from 'use-debounce';
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ImageIcon,
  Maximize2Icon,
  PlayIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { hasExtension } from '@vibeschedule/helpers/utils/has.extension';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { VideoFrame } from '@vibeschedule/react/helpers/video.frame';
import { deleteDialog } from '@vibeschedule/react/helpers/delete.dialog';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useUppyUploader } from '@vibeschedule/frontend/components/media/new.uploader';
import { DropFiles } from '@vibeschedule/frontend/components/layout/drop.files';
import { useModals } from '@vibeschedule/frontend/components/layout/new-modal';
import { cn } from '@vibeschedule/frontend/lib/utils';
import {
  PageBody,
  PageHeader,
} from '@vibeschedule/frontend/components/layout/page-header';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import { Skeleton } from '@vibeschedule/frontend/components/ui/skeleton';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';
import { Progress } from '@vibeschedule/frontend/components/ui/progress';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@vibeschedule/frontend/components/ui/input-group';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@vibeschedule/frontend/components/ui/empty';

const MAX_UPLOAD_SIZE = 1024 * 1024 * 1024; // 1 GB

export interface MediaItem {
  id: string;
  name: string;
  originalName?: string | null;
  path: string;
  createdAt?: string;
}

const isVideo = (media: { path: string }) => hasExtension(media.path, 'mp4');

const matchesType = (
  media: MediaItem,
  type?: 'image' | 'image-static' | 'video'
) => {
  if (type === 'video') {
    return isVideo(media);
  }
  if (type === 'image') {
    return !isVideo(media);
  }
  if (type === 'image-static') {
    return ['jpg', 'jpeg', 'png'].some((ext) => hasExtension(media.path, ext));
  }
  return true;
};

const allowedFileTypes = (type?: 'image' | 'image-static' | 'video') =>
  type === 'image'
    ? 'image/*'
    : type === 'image-static'
    ? 'image/jpeg,image/png'
    : type === 'video'
    ? 'video/mp4'
    : 'image/*,video/mp4';

const MediaPreview: FC<{ media: MediaItem }> = ({ media }) => (
  <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-muted">
    {isVideo(media) ? (
      <VideoFrame
        url={media.path}
        autoplay={true}
        controls={true}
        className="max-h-[75dvh] object-contain"
      />
    ) : (
      <img
        className="max-h-[75dvh] w-auto max-w-full object-contain"
        src={media.path}
        alt={media.originalName || media.name}
      />
    )}
  </div>
);

const MediaTile: FC<{
  media: MediaItem;
  selectedIndex: number;
  selectable: boolean;
  anySelected: boolean;
  onToggle: () => void;
  onPreview: (e: MouseEvent) => void;
  onDelete: (e: MouseEvent) => void;
}> = ({
  media,
  selectedIndex,
  selectable,
  anySelected,
  onToggle,
  onPreview,
  onDelete,
}) => {
  const t = useT();
  const selected = selectedIndex > -1;
  const label = media.originalName || media.name;
  return (
    <div className="group/tile flex min-w-0 flex-col gap-1.5">
      <div className="relative">
        <button
          type="button"
          onClick={selectable ? onToggle : onPreview}
          aria-pressed={selectable ? selected : undefined}
          aria-label={label}
          className={cn(
            'relative block aspect-square w-full overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10 transition outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            selected && 'ring-2 ring-primary'
          )}
        >
          {isVideo(media) ? (
            <VideoFrame url={media.path} />
          ) : (
            <img
              className="size-full object-cover transition-transform duration-300 group-hover/tile:scale-[1.03]"
              src={media.path}
              alt=""
              loading="lazy"
            />
          )}
          {isVideo(media) && (
            <span className="absolute bottom-2 left-2 flex size-6 items-center justify-center rounded-full bg-black/60 text-white">
              <PlayIcon className="size-3 fill-current" />
            </span>
          )}
          {selected && <span className="absolute inset-0 bg-primary/10" />}
        </button>
        {selectable ? (
          <span
            className={cn(
              'pointer-events-none absolute top-2 left-2 flex size-6 items-center justify-center rounded-full border-2 text-xs font-semibold tabular-nums shadow-sm',
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-white/90 bg-black/20'
            )}
          >
            {selected ? selectedIndex + 1 : null}
          </span>
        ) : (
          <button
            type="button"
            role="checkbox"
            aria-checked={selected}
            aria-label={t('select_media', { name: label })}
            onClick={onToggle}
            className={cn(
              'absolute top-2 left-2 flex size-7 items-center justify-center rounded-full border-2 shadow-sm transition outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-white/90 bg-black/20 text-transparent md:opacity-0 md:group-focus-within/tile:opacity-100 md:group-hover/tile:opacity-100',
              anySelected && 'md:opacity-100'
            )}
          >
            <CheckIcon className="size-4" />
          </button>
        )}
        <div className="absolute top-2 right-2 flex gap-1 transition-opacity md:opacity-0 md:group-focus-within/tile:opacity-100 md:group-hover/tile:opacity-100">
          {selectable && (
            <Button
              size="icon-sm"
              variant="secondary"
              className="shadow-sm"
              aria-label={t('preview')}
              onClick={onPreview}
            >
              <Maximize2Icon />
            </Button>
          )}
          <Button
            size="icon-sm"
            variant="secondary"
            className="text-destructive shadow-sm"
            aria-label={t('delete')}
            onClick={onDelete}
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>
      <p className="truncate text-xs text-muted-foreground" title={label}>
        {label}
      </p>
    </div>
  );
};

const PageControls: FC<{
  page: number;
  pages: number;
  setPage: (page: number) => void;
}> = ({ page, pages, setPage }) => {
  const t = useT();
  if (pages <= 1) {
    return null;
  }
  return (
    <nav
      aria-label={t('pagination')}
      className="flex items-center justify-center gap-2"
    >
      <Button
        variant="outline"
        className="h-10 md:h-8"
        disabled={page === 0}
        onClick={() => setPage(page - 1)}
      >
        <ChevronLeftIcon data-icon="inline-start" />
        <span className="max-sm:sr-only">{t('previous')}</span>
      </Button>
      <span className="px-2 text-sm text-muted-foreground tabular-nums">
        {t('page_of', { page: page + 1, pages })}
      </span>
      <Button
        variant="outline"
        className="h-10 md:h-8"
        disabled={page + 1 >= pages}
        onClick={() => setPage(page + 1)}
      >
        <span className="max-sm:sr-only">{t('next')}</span>
        <ChevronRightIcon data-icon="inline-end" />
      </Button>
    </nav>
  );
};

/**
 * The media library. `standalone` is the /media page; otherwise it is the
 * picker, and `setMedia` receives the selected media in the order they were
 * picked.
 */
export const MediaBox: FC<{
  setMedia: (params: { id: string; path: string }[]) => void;
  standalone?: boolean;
  type?: 'image' | 'image-static' | 'video';
  closeModal: () => void;
}> = ({ type, standalone, setMedia, closeModal }) => {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 300);
  const fetch = useFetch();
  const modals = useModals();
  const toaster = useToaster();
  const t = useT();
  const uploaderRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState<MediaItem[]>([]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  const loadMedia = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page + 1) });
    if (debouncedSearch.trim()) {
      params.set('search', debouncedSearch.trim());
    }
    return (await fetch(`/media?${params.toString()}`)).json();
  }, [page, debouncedSearch]);

  const { data, mutate, isLoading } = useSWR<{
    results: MediaItem[];
    pages: number;
  }>(`get-media-${page}-${debouncedSearch}`, loadMedia, {
    keepPreviousData: true,
  });

  // the uploader is created once, so it calls the latest handler through a ref
  const uploaded = useRef<(arr: MediaItem[]) => void>(() => {});
  uploaded.current = async (arr: MediaItem[]) => {
    await mutate();
    if (arr.length) {
      toaster.show(
        arr.length > 1
          ? t('media_uploaded_count', { count: arr.length })
          : t('media_uploaded')
      );
    }
    if (!standalone) {
      setSelected((prev) => [...prev, ...arr]);
    }
  };

  const uppy = useUppyUploader({
    allowedFileTypes: allowedFileTypes(type),
    onUploadSuccess: (arr) => uploaded.current(arr),
    onStart: () => setUploading(true),
    onEnd: () => {
      setUploading(false);
      setProgress(0);
    },
  });

  useEffect(() => {
    const update = (value: number) => setProgress(value);
    uppy.on('progress', update);
    return () => {
      uppy.off('progress', update);
    };
  }, [uppy]);

  const upload = useCallback(
    (files: File[]) => {
      if (!files.length) {
        return;
      }
      const totalSize = files.reduce((acc, file) => acc + file.size, 0);
      if (totalSize > MAX_UPLOAD_SIZE) {
        toaster.show(t('upload_size_limit_exceeded'), 'warning');
        return;
      }
      setUploading(true);
      for (const file of files) {
        try {
          uppy.addFile({ name: file.name, type: file.type, data: file });
        } catch {
          // a file Uppy rejects (size limit) is reported through uppy.info
        }
      }
      if (!uppy.getFiles().length) {
        setUploading(false);
      }
    },
    [uppy, toaster, t]
  );

  const pickFiles = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      upload(Array.from(e.target.files || []));
      e.target.value = '';
    },
    [upload]
  );

  const toggle = useCallback(
    (media: MediaItem) => () =>
      setSelected((prev) =>
        prev.some((p) => p.id === media.id)
          ? prev.filter((p) => p.id !== media.id)
          : [...prev, media]
      ),
    []
  );

  const preview = useCallback(
    (media: MediaItem) => (e: MouseEvent) => {
      e.stopPropagation();
      modals.openModal({
        title: media.originalName || media.name,
        size: 'xl',
        children: <MediaPreview media={media} />,
      });
    },
    [modals]
  );

  const remove = useCallback(
    async (items: MediaItem[]) => {
      const result = await Promise.all(
        items.map((media) => fetch(`/media/${media.id}`, { method: 'DELETE' }))
      );
      setSelected((prev) =>
        prev.filter((p) => !items.some((item) => item.id === p.id))
      );
      const next = await mutate();
      // deleting a whole last page leaves nothing to show there
      if (page >= (next?.pages || 1)) {
        setPage(Math.max(0, (next?.pages || 1) - 1));
      }
      if (result.some((r) => !r.ok)) {
        toaster.show(t('media_delete_failed'), 'warning');
        return;
      }
      toaster.show(
        items.length > 1
          ? t('media_deleted_count', { count: items.length })
          : t('media_deleted')
      );
    },
    [fetch, mutate, page, t, toaster]
  );

  const deleteOne = useCallback(
    (media: MediaItem) => async (e: MouseEvent) => {
      e.stopPropagation();
      if (
        await deleteDialog(
          t('are_you_sure_you_want_to_delete_the_image'),
          t('delete'),
          t('delete_media')
        )
      ) {
        await remove([media]);
      }
    },
    [remove, t]
  );

  const deleteSelected = useCallback(async () => {
    if (
      await deleteDialog(
        t('are_you_sure_you_want_to_delete_selected_media'),
        t('delete'),
        t('delete_media')
      )
    ) {
      await remove(selected);
    }
  }, [remove, selected, t]);

  const addMedia = useCallback(() => {
    setMedia(selected.map(({ id, path }) => ({ id, path })));
    closeModal();
  }, [selected, setMedia, closeModal]);

  const results = (data?.results || []).filter((m) => matchesType(m, type));
  const empty = !isLoading && !results.length;

  const uploadButton = (
    <Button
      className="h-10 md:h-8"
      disabled={uploading}
      onClick={() => uploaderRef.current?.click()}
    >
      {uploading ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <UploadIcon data-icon="inline-start" />
      )}
      {t('upload')}
    </Button>
  );

  return (
    <DropFiles
      disabled={uploading}
      onDrop={upload}
      className={cn('flex min-h-0 flex-col gap-4', standalone && 'flex-1')}
    >
      <input
        type="file"
        ref={uploaderRef}
        onChange={pickFiles}
        className="hidden"
        multiple={true}
        accept={allowedFileTypes(type)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="h-10 min-w-0 flex-1 basis-56 md:h-8 md:max-w-xs">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_media_by_name')}
            aria-label={t('search_media_by_name')}
          />
        </InputGroup>
        {standalone && !!selected.length && (
          <div className="flex items-center gap-1 rounded-lg border bg-card py-0.5 ps-3 pe-0.5 text-sm">
            <span className="tabular-nums">
              {t('selected_count', { count: selected.length })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={deleteSelected}
            >
              <Trash2Icon data-icon="inline-start" />
              {t('delete')}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('clear_selection')}
              onClick={() => setSelected([])}
            >
              <XIcon />
            </Button>
          </div>
        )}
        {(!empty || !!debouncedSearch) && (
          <div className="ms-auto">{uploadButton}</div>
        )}
      </div>

      {uploading && (
        <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm">
          <Spinner className="text-muted-foreground" />
          <span className="shrink-0">{t('uploading')}</span>
          <Progress value={progress} className="flex-1" />
          <span className="w-10 text-end text-muted-foreground tabular-nums">
            {progress}%
          </span>
        </div>
      )}

      <div
        className={cn(
          'min-h-0',
          !standalone && '-mx-1 max-h-[55dvh] overflow-y-auto px-1 py-1'
        )}
      >
        {isLoading && !data ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="aspect-square rounded-lg" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : empty ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ImageIcon />
              </EmptyMedia>
              <EmptyTitle>
                {debouncedSearch
                  ? t('no_media_match_search')
                  : t('you_dont_have_any_media_yet')}
              </EmptyTitle>
              <EmptyDescription>
                {debouncedSearch
                  ? t('no_media_match_search_hint')
                  : t('media_empty_description')}
              </EmptyDescription>
            </EmptyHeader>
            {!debouncedSearch && <EmptyContent>{uploadButton}</EmptyContent>}
          </Empty>
        ) : (
          <div
            className={cn(
              'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4',
              standalone ? 'lg:grid-cols-6' : 'lg:grid-cols-5'
            )}
          >
            {results.map((media) => (
              <MediaTile
                key={media.id}
                media={media}
                selectable={!standalone}
                anySelected={!!selected.length}
                selectedIndex={selected.findIndex((p) => p.id === media.id)}
                onToggle={toggle(media)}
                onPreview={preview(media)}
                onDelete={deleteOne(media)}
              />
            ))}
          </div>
        )}
      </div>

      <PageControls page={page} pages={data?.pages || 0} setPage={setPage} />

      {standalone ? (
        !empty && (
          <p className="text-center text-xs text-muted-foreground">
            {t('media_drop_hint')}
          </p>
        )
      ) : (
        <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 border-t bg-muted/50 p-4 sm:flex-row sm:items-center">
          <span className="text-sm text-muted-foreground tabular-nums sm:me-auto">
            {selected.length
              ? t('selected_count', { count: selected.length })
              : t('select_or_upload_pictures_max_1gb')}
          </span>
          <Button
            variant="outline"
            className="h-10 md:h-8"
            onClick={closeModal}
          >
            {t('cancel')}
          </Button>
          <Button
            className="h-10 md:h-8"
            disabled={!selected.length}
            onClick={addMedia}
          >
            <CheckIcon data-icon="inline-start" />
            {t('add_selected_media')}
          </Button>
        </div>
      )}
    </DropFiles>
  );
};

export const MediaLibraryPage: FC = () => {
  const t = useT();
  return (
    <PageBody className="flex-1">
      <PageHeader title={t('media')} description={t('media_description')} />
      <MediaBox standalone={true} setMedia={() => {}} closeModal={() => {}} />
    </PageBody>
  );
};
