'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import useCookie from 'react-use-cookie';
import { useDropzone } from 'react-dropzone';
import { ReactSortable } from 'react-sortablejs';
import { useShallow } from 'zustand/react/shallow';
import { useEditor, EditorContent } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Bold from '@tiptap/extension-bold';
import Text from '@tiptap/extension-text';
import Paragraph from '@tiptap/extension-paragraph';
import Underline from '@tiptap/extension-underline';
import { History } from '@tiptap/extension-history';
import { Fragment, Slice } from '@tiptap/pm/model';
import { Placeholder } from '@tiptap/extensions';
import {
  ImageIcon,
  SmileIcon,
  UploadIcon,
  XIcon,
} from 'lucide-react';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { deleteDialog } from '@vibeschedule/react/helpers/delete.dialog';
import { stripHtmlValidation } from '@vibeschedule/helpers/utils/strip.html.validation';
import { countLength } from '@vibeschedule/helpers/utils/count.length';
import { hasExtension } from '@vibeschedule/helpers/utils/has.extension';
import {
  Media,
  useLaunchStore,
} from '@vibeschedule/frontend/components/new-launch/store';
import { useExistingData } from '@vibeschedule/frontend/components/launches/helpers/use.existing.data';
import { MediaBox } from '@vibeschedule/frontend/components/media/media.component';
import { useUppyUploader } from '@vibeschedule/frontend/components/media/new.uploader';
import { useModals } from '@vibeschedule/frontend/components/layout/new-modal';
import { BoldText } from '@vibeschedule/frontend/components/new-launch/bold.text';
import { UText } from '@vibeschedule/frontend/components/new-launch/u.text';
import { ToolbarButton } from '@vibeschedule/frontend/components/new-launch/toolbar.button';
import { SelectCurrent } from '@vibeschedule/frontend/components/new-launch/select.current';
import { providerFor } from '@vibeschedule/frontend/components/new-launch/providers/show.all.providers';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import { FieldError } from '@vibeschedule/frontend/components/ui/field';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@vibeschedule/frontend/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@vibeschedule/frontend/components/ui/tooltip';
import { cn } from '@vibeschedule/frontend/lib/utils';
import {
  InterceptBoldShortcut,
  InterceptUnderlineShortcut,
} from '@vibeschedule/frontend/components/new-launch/shortcuts';

const MAX_UPLOAD_SIZE = 1024 * 1024 * 1024; // 1 GB

const plainText = (html: string) => stripHtmlValidation('normal', html, true);

// the text of the shared post or of one channel, with its media
export const ContentEditor: FC = () => {
  const t = useT();
  const existingData = useExistingData();
  const {
    internal,
    global,
    current,
    selectedIntegrations,
    addRemoveInternal,
    setGlobalValueText,
    setInternalValueText,
    setGlobalValueMedia,
    setInternalValueMedia,
    appendGlobalValueMedia,
    appendInternalValueMedia,
    error,
    clearError,
  } = useLaunchStore(
    useShallow((state) => ({
      internal: state.internal.find((p) => p.integration.id === state.current),
      global: state.global,
      current: state.current,
      selectedIntegrations: state.selectedIntegrations,
      addRemoveInternal: state.addRemoveInternal,
      setGlobalValueText: state.setGlobalValueText,
      setInternalValueText: state.setInternalValueText,
      setGlobalValueMedia: state.setGlobalValueMedia,
      setInternalValueMedia: state.setInternalValueMedia,
      appendGlobalValueMedia: state.appendGlobalValueMedia,
      appendInternalValueMedia: state.appendInternalValueMedia,
      error: state.errors[state.current],
      clearError: state.clearError,
    }))
  );

  const channel = selectedIntegrations.find(
    (p) => p.integration.id === current
  )?.integration;
  const canEdit = current === 'global' || !!internal;
  const value = internal ? internal.integrationValue[0] : global[0];

  const changeValue = useCallback(
    (content: string) => {
      clearError(current);
      return internal
        ? setInternalValueText(current, content)
        : setGlobalValueText(content);
    },
    [current, internal]
  );

  const changeMedia = useCallback(
    (media: Media[]) => {
      clearError(current);
      return internal
        ? setInternalValueMedia(current, media)
        : setGlobalValueMedia(media);
    },
    [current, internal]
  );

  const appendMedia = useCallback(
    (media: Media[]) => {
      clearError(current);
      return internal
        ? appendInternalValueMedia(current, media)
        : appendGlobalValueMedia(media);
    },
    [current, internal]
  );

  const goBackToGlobal = useCallback(async () => {
    if (
      await deleteDialog(
        t('are_you_sure_go_back_to_global_mode'),
        t('yes_go_back_to_global_mode')
      )
    ) {
      addRemoveInternal(current);
    }
  }, [addRemoveInternal, current]);

  return (
    <div className="flex flex-col gap-3">
      <SelectCurrent />
      {!!channel && !internal && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            {t('editor_channel_uses_global', { name: channel.name })}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => addRemoveInternal(current)}
          >
            {t('editor_customize_channel')}
          </Button>
        </div>
      )}
      {!!channel && !!internal && !existingData.integration && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary" />
            {t('editing_a_specific_network')}
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={goBackToGlobal}
          >
            {t('back_to_global')}
          </Button>
        </div>
      )}
      <Editor
        key={`${current}-${!!internal}`}
        editable={canEdit}
        value={value?.content || ''}
        media={value?.media || []}
        onChange={changeValue}
        setMedia={changeMedia}
        appendMedia={appendMedia}
        invalid={!!error}
      />
      <FieldError>{error}</FieldError>
    </div>
  );
};

// the characters used against each platform limit the text goes to
const CharCounters: FC<{ text: string }> = ({ text }) => {
  const t = useT();
  const { current, selectedIntegrations, internal } = useLaunchStore(
    useShallow((state) => ({
      current: state.current,
      selectedIntegrations: state.selectedIntegrations,
      internal: state.internal,
    }))
  );

  const counters = useMemo(() => {
    const channels = selectedIntegrations
      .map((p) => p.integration)
      .filter((integration) =>
        current === 'global'
          ? !internal.some((p) => p.integration.id === integration.id)
          : integration.id === current
      );
    const identifiers = [...new Set(channels.map((p) => p.identifier))];
    return identifiers.map((identifier) => {
      const max = providerFor(identifier)?.maximumCharacters || 0;
      const length = countLength(identifier, text);
      return { identifier, max, length, over: !!max && length > max };
    });
  }, [current, selectedIntegrations, internal, text]);

  if (!counters.length) {
    return (
      <span className="text-xs text-muted-foreground tabular-nums">
        {t('editor_characters', { count: text.length })}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {counters.map((counter) => (
        <span
          key={counter.identifier}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs tabular-nums',
            counter.over
              ? 'bg-destructive/10 text-destructive'
              : 'text-muted-foreground'
          )}
        >
          <img
            src={`/icons/platforms/${counter.identifier}.png`}
            alt={counter.identifier}
            className="size-3.5 rounded-sm"
          />
          {counter.length.toLocaleString('de-DE')}/
          {counter.max.toLocaleString('de-DE')}
        </span>
      ))}
    </div>
  );
};

const MediaThumb: FC<{ media: Media; onRemove: () => void }> = ({
  media,
  onRemove,
}) => {
  const t = useT();
  return (
    <div className="group relative size-20 shrink-0 cursor-grab overflow-hidden rounded-lg border bg-muted active:cursor-grabbing">
      {hasExtension(media.path, 'mp4') ? (
        <video
          src={media.path}
          muted
          className="size-full object-cover"
          preload="metadata"
        />
      ) : (
        <img src={media.path} alt="" className="size-full object-cover" />
      )}
      <Button
        type="button"
        size="icon-xs"
        variant="secondary"
        aria-label={t('editor_remove_media')}
        onClick={onRemove}
        className="absolute end-1 top-1 opacity-90 shadow-sm"
      >
        <XIcon />
      </Button>
    </div>
  );
};

const Editor: FC<{
  value: string;
  media: Media[];
  editable: boolean;
  invalid: boolean;
  onChange: (value: string) => void;
  setMedia: (value: Media[]) => void;
  appendMedia: (value: Media[]) => void;
}> = (props) => {
  const { media, setMedia, appendMedia, editable } = props;
  const t = useT();
  const toaster = useToaster();
  const modals = useModals();
  const [mode] = useCookie('mode', 'light');
  const [uploading, setUploading] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const uppy = useUppyUploader({
    onUploadSuccess: appendMedia,
    allowedFileTypes: 'image/*,video/mp4',
    onStart: () => {},
    onEnd: () => setUploading(false),
  });

  const upload = useCallback(
    (files: File[]) => {
      if (!files.length || !editable) {
        return;
      }
      if (uploading) {
        toaster.show(t('upload_in_progress'), 'warning');
        return;
      }
      const totalSize = files.reduce((acc, file) => acc + file.size, 0);
      if (totalSize > MAX_UPLOAD_SIZE) {
        toaster.show(t('upload_size_limit_exceeded'), 'warning');
        return;
      }

      setUploading(true);
      for (const file of files) {
        uppy.addFile(file);
      }
    },
    [uppy, uploading, editable]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: upload,
    noClick: true,
    noKeyboard: true,
    disabled: !editable,
  });

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph.configure({ HTMLAttributes: { dir: 'auto' } }),
      Text,
      Underline,
      Bold,
      InterceptBoldShortcut,
      InterceptUnderlineShortcut,
      Placeholder.configure({
        placeholder: t('write_something'),
        emptyEditorClass: 'is-editor-empty',
      }),
      History.configure({ depth: 100, newGroupDelay: 100 }),
    ],
    content: props.value || '',
    editable,
    shouldRerenderOnTransaction: true,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'min-h-40 px-3 py-2.5 text-sm leading-relaxed outline-none [&_p]:min-h-[1lh]',
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.items || [])
          .filter((item) => item.kind === 'file')
          .map((item) => item.getAsFile())
          .filter((file): file is File => !!file);
        if (!files.length) {
          return false;
        }
        upload(files);
        return true;
      },
      // the default parser merges consecutive newlines, which drops the
      // blank lines of pasted plain text; keep each one as an empty paragraph
      clipboardTextParser: (text, $context, _plain, view) => {
        const { schema } = view.state;
        const marks = $context.marks();
        return Slice.maxOpen(
          Fragment.from(
            text
              .split(/\r\n?|\n/)
              .map((line) =>
                schema.nodes.paragraph.create(
                  null,
                  line ? schema.text(line, marks) : undefined
                )
              )
          )
        );
      },
    },
    onUpdate: ({ editor: instance }) => props.onChange(instance.getHTML()),
  });

  const text = useMemo(() => plainText(props.value), [props.value]);

  const openLibrary = useCallback(() => {
    modals.openModal({
      title: t('media_library'),
      size: 'xl',
      closeOnEscape: true,
      children: (close) => (
        <MediaBox
          setMedia={(selected) => {
            appendMedia(selected.map(({ id, path }) => ({ id, path })));
            close();
          }}
          closeModal={close}
        />
      ),
    });
  }, [appendMedia]);

  const insertEmoji = useCallback(
    (emoji: string) => {
      editor?.chain().focus().insertContent(emoji).run();
      setEmojiOpen(false);
    },
    [editor]
  );

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative flex flex-col rounded-lg border bg-background transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30',
        props.invalid && 'border-destructive ring-3 ring-destructive/20',
        !editable && 'opacity-70'
      )}
    >
      <input {...getInputProps({ 'aria-label': t('editor_upload_media') })} />
      {isDragActive && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-background/90 text-sm font-medium">
          {t('drop_files_here_to_upload')}
        </div>
      )}
      <EditorContent
        editor={editor}
        className="[&_.is-editor-empty:first-child]:before:pointer-events-none [&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0 [&_.is-editor-empty:first-child]:before:text-muted-foreground [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]"
      />
      {(!!media.length || uploading) && (
        <div className="flex gap-2 overflow-x-auto px-3 pb-3">
          <ReactSortable
            list={media.map((item) => ({ ...item }))}
            setList={(list) => {
              const next = list.map(({ id, path }) => ({ id, path }));
              if (next.map((m) => m.id).join() !== media.map((m) => m.id).join()) {
                setMedia(next);
              }
            }}
            className="flex gap-2"
            animation={200}
            disabled={!editable}
          >
            {media.map((item, index) => (
              <MediaThumb
                key={item.id}
                media={item}
                onRemove={() => setMedia(media.filter((_, i) => i !== index))}
              />
            ))}
          </ReactSortable>
          {uploading && (
            <div className="flex size-20 shrink-0 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
              <Spinner />
            </div>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1 border-t px-1.5 py-1.5">
        <BoldText editor={editor} disabled={!editable} />
        <UText editor={editor} disabled={!editable} />
        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <Tooltip>
            <TooltipTrigger
              render={
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('insert_emoji')}
                      disabled={!editable}
                    />
                  }
                />
              }
            >
              <SmileIcon />
            </TooltipTrigger>
            <TooltipContent>{t('insert_emoji')}</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-auto p-0" align="start">
            <EmojiPicker
              height={380}
              width={320}
              lazyLoadEmojis
              theme={mode === 'dark' ? Theme.DARK : Theme.LIGHT}
              onEmojiClick={(e) => insertEmoji(e.emoji)}
            />
          </PopoverContent>
        </Popover>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton
          label={t('editor_media_from_library')}
          disabled={!editable}
          onClick={openLibrary}
        >
          <ImageIcon />
        </ToolbarButton>
        <ToolbarButton
          label={t('editor_upload_media')}
          disabled={!editable || uploading}
          onClick={open}
        >
          {uploading ? <Spinner /> : <UploadIcon />}
        </ToolbarButton>
        <div className="ms-auto ps-2">
          <CharCounters text={text} />
        </div>
      </div>
    </div>
  );
};
