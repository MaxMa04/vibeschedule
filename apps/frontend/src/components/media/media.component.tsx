'use client';

import React, {
  ChangeEvent,
  ClipboardEvent,
  FC,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button } from '@vibeschedule/react/form/button';
import useSWR from 'swr';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { hasExtension } from '@vibeschedule/helpers/utils/has.extension';
import { Media } from '@prisma/client';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import clsx from 'clsx';
import { VideoFrame } from '@vibeschedule/react/helpers/video.frame';
import { useUppyUploader } from '@vibeschedule/frontend/components/media/new.uploader';
import { DropFiles } from '@vibeschedule/frontend/components/layout/drop.files';
import { deleteDialog } from '@vibeschedule/react/helpers/delete.dialog';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { ReactSortable } from 'react-sortablejs';
import { useModals } from '@vibeschedule/frontend/components/layout/new-modal';
import { Dashboard } from '@uppy/react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  DeleteCircleIcon,
  CloseCircleIcon,
  DragHandleIcon,
  InsertMediaIcon,
  VerticalDividerIcon,
  NoMediaIcon,
  TrashIcon,
} from '@vibeschedule/frontend/components/ui/icons';
import { useDebounce } from 'use-debounce';
// on phones the media library takes the whole screen
export const mediaLibrarySize = () =>
  window.matchMedia('(max-width: 1025px)').matches
    ? '100%'
    : 'calc(100% - 80px)';
export const Pagination: FC<{
  current: number;
  totalPages: number;
  setPage: (num: number) => void;
}> = (props) => {
  const t = useT();

  const { current, totalPages, setPage } = props;

  const paginationItems = useMemo(() => {
    // Convert to 1-based for algorithm (current is 0-based)
    const c = current + 1;
    const m = totalPages;

    // If total pages <= 10, show all pages
    if (m <= 10) {
      return Array.from({ length: m }, (_, i) => i + 1);
    }

    const delta = 3;
    const left = c - delta;
    const right = c + delta + 1;
    const range: number[] = [];
    const rangeWithDots: (number | '...')[] = [];
    let l: number | undefined;

    // Build the range of pages to show
    for (let i = 1; i <= m; i++) {
      if (i === 1 || i === m || (i >= left && i < right)) {
        range.push(i);
      }
    }

    // Add dots where there are gaps
    for (const i of range) {
      if (l !== undefined) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    // Limit to maximum 10 items by trimming pages near edges if needed
    while (rangeWithDots.length > 10) {
      const currentIndex = rangeWithDots.findIndex((item) => item === c);
      if (currentIndex !== -1 && currentIndex > rangeWithDots.length / 2) {
        // Current is in second half, remove one item from start side
        rangeWithDots.splice(2, 1);
      } else {
        // Current is in first half, remove one item from end side
        rangeWithDots.splice(-3, 1);
      }
    }

    return rangeWithDots;
  }, [current, totalPages]);

  return (
    <ul className="flex flex-row flex-wrap items-center gap-1 justify-center mt-[15px]">
      <li className={clsx(current === 0 && 'opacity-20 pointer-events-none')}>
        <div
          className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 py-2 gap-1 ps-2.5 text-gray-400 hover:text-white border-[#1F1F1F] hover:bg-forth"
          aria-label={t('previous')}
          onClick={() => setPage(current - 1)}
        >
          <ChevronLeftIcon className="lucide lucide-chevron-left h-4 w-4" />
          <span className="mobile:hidden">{t('previous')}</span>
        </div>
      </li>
      {paginationItems.map((item, index) => (
        // phones show "2 / 6" instead of the page numbers
        <li key={index} className="mobile:hidden">
          {item === '...' ? (
            <span className="inline-flex items-center justify-center h-10 w-10 text-textColor select-none">
              ...
            </span>
          ) : (
            <div
              aria-current="page"
              onClick={() => setPage(item - 1)}
              className={clsx(
                'cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border hover:bg-forth h-10 w-10 hover:text-white border-newBorder',
                current === item - 1
                  ? 'bg-forth !text-white'
                  : 'text-textColor hover:text-white'
              )}
            >
              {item}
            </div>
          )}
        </li>
      ))}
      <li className="hidden mobile:flex h-10 items-center px-[8px] text-[14px] text-textColor">
        {current + 1} / {totalPages}
      </li>
      <li
        className={clsx(
          current + 1 === totalPages && 'opacity-20 pointer-events-none'
        )}
      >
        <a
          className="text-textColor hover:text-white group cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 py-2 gap-1 pe-2.5 text-gray-400 border-[#1F1F1F] hover:bg-forth"
          aria-label={t('next')}
          onClick={() => setPage(current + 1)}
        >
          <span className="mobile:hidden">{t('next')}</span>
          <ChevronRightIcon className="lucide lucide-chevron-right h-4 w-4" />
        </a>
      </li>
    </ul>
  );
};
const MAX_UPLOAD_SIZE = 1024 * 1024 * 1024; // 1 GB
export const MediaBox: FC<{
  setMedia: (params: { id: string; path: string }[]) => void;
  standalone?: boolean;
  type?: 'image' | 'image-static' | 'video';
  closeModal: () => void;
}> = ({ type, standalone, setMedia }) => {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 300);
  const fetch = useFetch();
  const modals = useModals();
  const toaster = useToaster();
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
  const { data, mutate, isLoading } = useSWR(
    `get-media-${page}-${debouncedSearch}`,
    loadMedia
  );
  const [selected, setSelected] = useState([]);
  const t = useT();
  const uploaderRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);

  const uppy = useUppyUploader({
    allowedFileTypes:
      type == 'image'
        ? 'image/*'
        : type == 'image-static'
        ? 'image/jpeg,image/png'
        : type == 'video'
        ? 'video/mp4'
        : 'image/*,video/mp4',
    onUploadSuccess: async (arr) => {
      await mutate();
      if (standalone) {
        return;
      }
      setSelected((prevSelected) => {
        return [...prevSelected, ...arr];
      });
    },
    onStart: () => setLoading(true),
    onEnd: () => setLoading(false),
  });

  // uploader messages (errors, processing warnings) stay after the upload ends
  const [uploadInfo, setUploadInfo] = useState(false);
  useEffect(() => {
    const show = () => setUploadInfo(true);
    const hide = () => setUploadInfo(false);
    uppy.on('info-visible', show);
    uppy.on('info-hidden', hide);
    return () => {
      uppy.off('info-visible', show);
      uppy.off('info-hidden', hide);
    };
  }, [uppy]);

  const addRemoveSelected = useCallback(
    (media: any) => () => {
      if (standalone) {
        return;
      }
      const exists = selected.find((p: any) => p.id === media.id);
      if (exists) {
        setSelected(selected.filter((f: any) => f.id !== media.id));
        return;
      }
      setSelected([...selected, media]);
    },
    [selected]
  );

  const addMedia = useCallback(async () => {
    if (standalone) {
      return;
    }
    // @ts-ignore
    setMedia(selected);
    modals.closeCurrent();
  }, [selected]);

  const addToUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const totalSize = files.reduce((acc, file) => acc + file.size, 0);

      if (totalSize > MAX_UPLOAD_SIZE) {
        toaster.show(t('upload_size_limit_exceeded'), 'warning');
        return;
      }

      setLoading(true);

      // @ts-ignore
      uppy.addFiles(files);
    },
    [toaster, t]
  );

  const dragAndDrop = useCallback(
    async (event: ClipboardEvent<HTMLDivElement> | File[]) => {
      // @ts-ignore
      const clipboardItems = event.map((p) => ({
        kind: 'file',
        getAsFile: () => p,
      }));
      if (!clipboardItems) {
        return;
      }

      const files: File[] = [];
      // @ts-ignore
      for (const item of clipboardItems) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      const totalSize = files.reduce((acc, file) => acc + file.size, 0);

      if (totalSize > MAX_UPLOAD_SIZE) {
        toaster.show(t('upload_size_limit_exceeded'), 'warning');
        return;
      }

      setLoading(true);

      for (const file of files) {
        uppy.addFile(file);
      }
    },
    [toaster, t]
  );

  const maximize = useCallback(
    (media: Media) => async (e: any) => {
      e.stopPropagation();
      modals.openModal({
        title: '',
        top: 10,
        children: (
          <div className="w-full h-full p-[50px]">
            {hasExtension(media.path, 'mp4') ? (
              <VideoFrame autoplay={true} url={media.path} />
            ) : (
              <img
                width="100%"
                height="100%"
                className="w-full h-full max-h-[100%] max-w-[100%] object-cover"
                src={media.path}
                alt="media"
              />
            )}
          </div>
        ),
      });
    },
    []
  );

  const deleteImage = useCallback(
    (media: Media) => async (e: any) => {
      e.stopPropagation();
      if (
        !(await deleteDialog(t('are_you_sure_you_want_to_delete_the_image')))
      ) {
        return;
      }
      await fetch(`/media/${media.id}`, {
        method: 'DELETE',
      });
      mutate();
    },
    [mutate]
  );

  // phones have no hover, so the selected media are deleted together
  const deleteSelected = useCallback(async () => {
    if (
      !(await deleteDialog(t('are_you_sure_you_want_to_delete_selected_media')))
    ) {
      return;
    }
    const toDelete = selected;
    setSelected([]);
    try {
      await Promise.all(
        toDelete.map((media: any) =>
          fetch(`/media/${media.id}`, {
            method: 'DELETE',
          })
        )
      );
    } finally {
      const result = await mutate();
      // deleting a whole last page leaves nothing to show there
      if (page >= (result?.pages || 1)) {
        setPage(Math.max(0, (result?.pages || 1) - 1));
      }
    }
  }, [selected, mutate, page, t]);

  const btn = useMemo(() => {
    return (
      <button
        disabled={loading}
        onClick={() => uploaderRef?.current?.click()}
        className="relative cursor-pointer bg-btnSimple changeColor flex gap-[8px] h-[44px] px-[18px] justify-center items-center rounded-[8px]"
      >
        {loading ? (
          <div className="absolute left-[50%] top-[50%] -translate-y-[50%] -translate-x-[50%]">
            <div className="animate-spin h-[20px] w-[20px] border-4 border-white border-t-transparent rounded-full" />
          </div>
        ) : (
          <PlusIcon size={14} />
        )}
        <div className={loading ? 'invisible' : undefined}>{t('upload')}</div>
      </button>
    );
  }, [t, loading]);

  return (
    <DropFiles
      disabled={loading}
      className="flex flex-col flex-1"
      onDrop={dragAndDrop}
    >
      <div className="flex flex-col flex-1">
        <div
          className={clsx(
            'flex items-center gap-[12px] mobile:flex-wrap',
            !isLoading && !data?.results?.length && !debouncedSearch && 'hidden'
          )}
        >
          <div className="flex-1 mobile:basis-full">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search_media_by_name')}
              className="w-full h-[44px] px-[14px] rounded-[8px] bg-newBgColorInner border border-newColColor text-[14px] outline-none focus:border-teal"
            />
          </div>
          <input
            type="file"
            ref={uploaderRef}
            onChange={addToUpload}
            className="hidden"
            multiple={true}
          />
          <div
            className={clsx('flex gap-[8px]', !standalone && 'mobile:hidden')}
          >
            {btn}
          </div>
          {!standalone && !!data?.results?.length && (
            <div className="hidden mobile:block basis-full text-[14px] font-[600]">
              {t('select_or_upload_pictures_max_1gb')}
            </div>
          )}
          {!!selected.length && (
            <div
              onClick={deleteSelected}
              className="hidden mobile:flex basis-full justify-center items-center gap-[8px] h-[24px] text-[15px] font-[600] text-error cursor-pointer select-none"
            >
              <TrashIcon size={18} />
              {t('delete_selected')} ({selected.length})
            </div>
          )}
        </div>
        <div
          className={clsx(
            'w-full pointer-events-none relative mt-[5px] mb-[5px]',
            // phones only keep the upload progress while there is something to show
            !loading && !uploadInfo && 'mobile:hidden'
          )}
        >
          <div className="w-full h-[46px] overflow-hidden absolute left-0 bg-newBgColorInner uppyChange">
            <Dashboard
              height={46}
              uppy={uppy}
              id={`uploader`}
              showProgressDetails={true}
              hideUploadButton={true}
              hideRetryButton={true}
              hidePauseResumeButton={true}
              hideCancelButton={true}
              hideProgressAfterFinish={true}
            />
          </div>
          <div className="w-full h-[46px] uppyChange" />
        </div>
        <div
          className={clsx(
            'flex-1 relative',
            !isLoading &&
              !data?.results?.length &&
              'bg-newTextColor/[0.02] rounded-[12px]'
          )}
        >
          <div
            className={clsx(
              'absolute -left-[3px] -top-[3px] withp3 h-full overflow-x-hidden overflow-y-auto scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner mobile:-left-[6px] mobile:-top-[6px] mobile:!w-[calc(100%+12px)] mobile:!h-[calc(100%+12px)]',
              !isLoading &&
                !data?.results?.length &&
                'flex justify-center items-center gap-[20px] flex-col'
            )}
          >
            {!isLoading && !data?.results?.length && (
              <>
                <NoMediaIcon />
                <div className="text-[20px] font-[600]">
                  {debouncedSearch
                    ? t('no_media_match_search')
                    : t('you_dont_have_any_media_yet')}
                </div>
                <div className="whitespace-pre-line text-newTextColor/[0.6] text-center">
                  {t('select_or_upload_pictures_max_1gb')} {'\n'}
                  {t('you_can_drag_drop_pictures')}
                </div>
                <div className="forceChange flex gap-[8px] mobile:w-full mobile:max-w-[300px] mobile:child:flex-1">
                  {btn}
                </div>
              </>
            )}
            {isLoading && (
              <>
                {[...new Array(16)].map((_, i) => (
                  <div
                    className={clsx(
                      'px-[3px] py-[3px] mobile:p-[6px] float-left rounded-[6px] cursor-pointer w8-max mobile:!w-1/2 mobile:!max-w-[50%] aspect-square'
                    )}
                    key={i}
                  >
                    <div className="w-full h-full bg-newSep rounded-[6px] animate-pulse" />
                  </div>
                ))}
              </>
            )}
            {data?.results
              ?.filter((f: any) => {
                if (type === 'video') {
                  return hasExtension(f.path, 'mp4');
                } else if (type === 'image') {
                  return !hasExtension(f.path, 'mp4');
                } else if (type === 'image-static') {
                  return ['jpg', 'jpeg', 'png'].some((ext) =>
                    hasExtension(f.path, ext)
                  );
                }
                return true;
              })
              .map((media: any) => (
                <div
                  className={clsx(
                    'group px-[3px] py-[3px] mobile:p-[6px] float-left rounded-[6px] w8-max mobile:!w-1/2 mobile:!max-w-[50%] aspect-square',
                    !standalone && 'cursor-pointer'
                  )}
                  key={media.id}
                >
                  <div
                    className={clsx(
                      'w-full h-full rounded-[6px] border-[4px] relative',
                      !!selected.find((p) => p.id === media.id)
                        ? 'border-teal'
                        : 'border-transparent'
                    )}
                    onClick={addRemoveSelected(media)}
                  >
                    {!!selected.find((p: any) => p.id === media.id) ? (
                      <div className="text-white flex z-[101] justify-center items-center text-[14px] font-[500] w-[24px] h-[24px] rounded-full bg-teal absolute -bottom-[10px] -end-[10px]">
                        {selected.findIndex((z: any) => z.id === media.id) + 1}
                      </div>
                    ) : (
                      <DeleteCircleIcon
                        className={clsx(
                          'cursor-pointer hidden z-[100] group-hover:block absolute -top-[5px] -end-[5px]',
                          // the picker deletes the selected media on phones
                          !standalone && 'mobile:!hidden'
                        )}
                        onClick={deleteImage(media)}
                      />
                    )}
                    <div
                      className={clsx(
                        'absolute bottom-[10px] start-[10px] end-[10px] z-[100] truncate text-end mobile:text-[12px] rounded-[4px] px-[6px] bg-black/60 text-white',
                        !standalone && 'mobile:hidden'
                      )}
                    >
                      {media.originalName}
                    </div>
                    <div className="w-full h-full rounded-[6px] overflow-hidden relative">
                      <div className="absolute z-[20] left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%]">
                        <div
                          onClick={maximize(media)}
                          className={clsx(
                            'cursor-pointer p-[4px] bg-black/40 hidden group-hover:block hover:scale-150 transition-all',
                            !standalone && 'mobile:!hidden'
                          )}
                        >
                          <svg
                            width="30"
                            height="30"
                            viewBox="0 0 14 14"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M2 9H0V14H5V12H2V9ZM0 5H2V2H5V0H0V5ZM12 12H9V14H14V9H12V12ZM9 0V2H12V5H14V0H9Z"
                              fill="#F1F5F9"
                            />
                          </svg>
                        </div>
                      </div>
                      {hasExtension(media.path, 'mp4') ? (
                        <VideoFrame url={media.path} />
                      ) : (
                        <img
                          width="100%"
                          height="100%"
                          className="w-full h-full object-cover"
                          src={media.path}
                          alt="media"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
        {(data?.pages || 0) > 1 && (
          <Pagination
            current={page}
            totalPages={data?.pages}
            setPage={setPage}
          />
        )}
        {!standalone && (
          <div className="flex justify-end mt-[32px] gap-[8px] mobile:flex-col mobile:mt-[16px] mobile:gap-[12px]">
            {!isLoading && !!data?.results?.length && (
              <div className="hidden mobile:flex gap-[8px] mobile:child:flex-1">
                {btn}
              </div>
            )}
            <button
              onClick={() => modals.closeCurrent()}
              className="cursor-pointer h-[52px] px-[20px] items-center justify-center border border-newTextColor/10 flex rounded-[10px] mobile:hidden"
            >
              {t('cancel')}
            </button>
            {!isLoading && !!data?.results?.length && (
              <button
                onClick={standalone ? () => {} : addMedia}
                disabled={selected.length === 0}
                className="cursor-pointer text-surface disabled:opacity-80 disabled:cursor-not-allowed h-[52px] px-[20px] items-center justify-center bg-ink flex rounded-[12px] mobile:h-[44px] mobile:rounded-[8px] mobile:font-[600] mobile:disabled:opacity-100 mobile:disabled:bg-btnSimple mobile:disabled:text-textItemBlur"
              >
                {t('add_selected_media')}
              </button>
            )}
          </div>
        )}
      </div>
    </DropFiles>
  );
};
export const MultiMediaComponent: FC<{
  value?: Array<{
    path: string;
    id: string;
  }>;
  name: string;
  error?: any;
  toolBar?: React.ReactNode;
  // after the tools, outside of their scroll
  toolBarEnd?: React.ReactNode;
  toolsClassName?: string;
  toolsStyle?: React.CSSProperties;
  information?: React.ReactNode;
  onChange: (event: {
    target: {
      name: string;
      value?: Array<{
        id: string;
        path: string;
      }>;
    };
  }) => void;
}> = (props) => {
  const {
    name,
    error,
    onChange,
    value,
    toolBar,
    toolBarEnd,
    toolsClassName,
    toolsStyle,
    information,
  } = props;
  const modals = useModals();
  const t = useT();
  useEffect(() => {
    if (value) {
      setCurrentMedia(value);
    }
  }, [value]);

  const [currentMedia, setCurrentMedia] = useState(value);
  const changeMedia = useCallback(
    (
      m:
        | {
            path: string;
            id: string;
          }
        | {
            path: string;
            id: string;
          }[]
    ) => {
      const mediaArray = Array.isArray(m) ? m : [m];
      const newMedia = [...(currentMedia || []), ...mediaArray];
      setCurrentMedia(newMedia);
      onChange({
        target: {
          name,
          value: newMedia,
        },
      });
    },
    [currentMedia]
  );
  const showModal = useCallback(() => {
    modals.openModal({
      title: t('media_library'),
      askClose: false,
      closeOnEscape: true,
      fullScreen: true,
      size: mediaLibrarySize(),
      height: mediaLibrarySize(),
      children: (close) => (
        <MediaBox setMedia={changeMedia} closeModal={close} />
      ),
    });
  }, [changeMedia, t]);

  const clearMedia = useCallback(
    (topIndex: number) => () => {
      const newMedia = currentMedia?.filter((f, index) => index !== topIndex);
      setCurrentMedia(newMedia);
      onChange({
        target: {
          name,
          value: newMedia,
        },
      });
    },
    [currentMedia]
  );

  return (
    <>
      <div className="b1 flex flex-col gap-[8px] mobile:gap-[16px] rounded-bl-[8px] select-none w-full">
        <div className="flex gap-[10px] px-[12px] mobile:px-0 mobile:empty:hidden">
          {!!currentMedia?.length && (
            <ReactSortable
              list={currentMedia}
              setList={(value) =>
                onChange({ target: { name: 'upload', value } })
              }
              className="flex gap-[10px] sortable-container"
              animation={200}
              swap={true}
              handle=".dragging"
            >
              {currentMedia.map((media, index) => (
                <div
                  key={media.id}
                  className="cursor-pointer rounded-[5px] w-[40px] h-[40px] mobile:w-[60px] mobile:h-[60px] mobile:rounded-[8px] border-2 mobile:border-0 border-tableBorder relative flex transition-all"
                >
                  <DragHandleIcon className="z-[20] dragging absolute pe-[1px] pb-[3px] -start-[4px] -top-[4px] cursor-move" />

                  <div className="w-full h-full relative group">
                    {hasExtension(media?.path, 'mp4') ? (
                      <VideoFrame url={media?.path} />
                    ) : (
                      <img
                        className="w-full h-full object-cover rounded-[4px] mobile:rounded-[8px]"
                        src={media?.path}
                      />
                    )}
                  </div>

                  <CloseCircleIcon
                    onClick={clearMedia(index)}
                    className="absolute -end-[4px] -top-[4px] mobile:-end-[8px] mobile:-top-[8px] mobile:w-[24px] mobile:h-[24px] z-[20] rounded-full bg-white"
                  />
                </div>
              ))}
            </ReactSortable>
          )}
        </div>
        {/* on phones the info stays with the post, the tools can move to the bottom */}
        {information && (
          <div className="hidden mobile:flex justify-end">{information}</div>
        )}
        <div
          className={clsx(
            'flex gap-[8px] px-[12px] mobile:px-0 border-t border-newColColor mobile:border-t-0 w-full b1 text-textColor',
            toolsClassName
          )}
          style={toolsStyle}
        >
          <div className="flex gap-[8px] mobile:gap-[4px] mobile:flex-1 mobile:min-w-0 mobile:overflow-x-auto mobile:scrollbar-none b1">
            <div className="flex py-[10px] mobile:py-0 mobile:shrink-0 b2 items-center gap-[4px]">
              <div
                onClick={showModal}
                className="cursor-pointer h-[30px] mobile:h-[40px] mobile:min-w-[40px] rounded-[6px] mobile:rounded-[8px] justify-center items-center flex bg-newColColor mobile:bg-newSettings px-[8px]"
              >
                <div className="flex gap-[8px] items-center">
                  <div>
                    <InsertMediaIcon className="mobile:w-[20px] mobile:h-[20px]" />
                  </div>
                  <div className="text-[10px] font-[600] maxMedia:hidden block">
                    {t('insert_media')}
                  </div>
                </div>
              </div>
            </div>
            <div
              className={clsx(
                'text-newColColor h-full flex items-center mobile:shrink-0 mobile:px-[4px]',
                !toolBar && 'mobile:hidden'
              )}
            >
              <VerticalDividerIcon />
            </div>
            {!!toolBar && (
              <div className="flex py-[10px] mobile:py-0 mobile:shrink-0 b2 items-center gap-[4px]">
                {toolBar}
              </div>
            )}
          </div>
          {toolBarEnd}
          {information && (
            <div className="flex-1 justify-end flex py-[10px] mobile:hidden b2 items-center gap-[4px]">
              {information}
            </div>
          )}
        </div>
      </div>
      <div className="text-[12px] text-error">{error}</div>
    </>
  );
};
