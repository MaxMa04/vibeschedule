'use client';

import React, {
  FC,
  useCallback,
  useMemo,
  useRef,
  useState,
  ClipboardEvent,
  forwardRef,
  useImperativeHandle,
} from 'react';
import clsx from 'clsx';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import useCookie from 'react-use-cookie';
import { BoldText } from '@vibeschedule/frontend/components/new-launch/bold.text';
import { UText } from '@vibeschedule/frontend/components/new-launch/u.text';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import {
  Media,
  useLaunchStore,
} from '@vibeschedule/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';
import { MultiMediaComponent } from '@vibeschedule/frontend/components/media/media.component';
import { deleteDialog } from '@vibeschedule/react/helpers/delete.dialog';
import { useExistingData } from '@vibeschedule/frontend/components/launches/helpers/use.existing.data';
import { useDropzone } from 'react-dropzone';
import { useUppyUploader } from '@vibeschedule/frontend/components/media/new.uploader';
import { Dashboard } from '@uppy/react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Bold from '@tiptap/extension-bold';
import Text from '@tiptap/extension-text';
import Paragraph from '@tiptap/extension-paragraph';
import Underline from '@tiptap/extension-underline';
import { History } from '@tiptap/extension-history';
import { Fragment, Slice } from '@tiptap/pm/model';
import { Placeholder } from '@tiptap/extensions';
import { stripHtmlValidation } from '@vibeschedule/helpers/utils/strip.html.validation';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { InformationComponent } from '@vibeschedule/frontend/components/launches/information.component';
import {
  LockIcon,
  ResetIcon,
  EmojiIcon,
} from '@vibeschedule/frontend/components/ui/icons';

const MAX_UPLOAD_SIZE = 1024 * 1024 * 1024; // 1 GB

// bold and underline are exclusive, the backend turns each into its own
// unicode letters
const InterceptBoldShortcut = Extension.create({
  name: 'preventBoldWithUnderline',
  addKeyboardShortcuts() {
    return {
      'Mod-b': () => {
        this.editor.commands.unsetUnderline();
        return this.editor.commands.toggleBold();
      },
    };
  },
});

const InterceptUnderlineShortcut = Extension.create({
  name: 'preventUnderlineWithBold',
  addKeyboardShortcuts() {
    return {
      'Mod-u': () => {
        this.editor.commands.unsetBold();
        return this.editor.commands.toggleUnderline();
      },
    };
  },
});

export const EditorWrapper: FC = () => {
  const t = useT();
  const {
    internal,
    global,
    current,
    addRemoveInternal,
    setGlobalValueText,
    setInternalValueText,
    setGlobalValueMedia,
    setInternalValueMedia,
    appendGlobalValueMedia,
    appendInternalValueMedia,
    totalChars,
    chars,
  } = useLaunchStore(
    useShallow((state) => ({
      internal: state.internal.find((p) => p.integration.id === state.current),
      global: state.global,
      current: state.current,
      addRemoveInternal: state.addRemoveInternal,
      setGlobalValueText: state.setGlobalValueText,
      setInternalValueText: state.setInternalValueText,
      setGlobalValueMedia: state.setGlobalValueMedia,
      setInternalValueMedia: state.setInternalValueMedia,
      appendGlobalValueMedia: state.appendGlobalValueMedia,
      appendInternalValueMedia: state.appendInternalValueMedia,
      totalChars: state.totalChars,
      chars: state.chars,
    }))
  );

  const existingData = useExistingData();
  const canEdit = current === 'global' || !!internal;
  const value = internal ? internal.integrationValue[0] : global[0];

  const changeValue = useCallback(
    (content: string) =>
      internal
        ? setInternalValueText(current, content)
        : setGlobalValueText(content),
    [current, internal]
  );

  const changeImages = useCallback(
    (media: Media[]) =>
      internal
        ? setInternalValueMedia(current, media)
        : setGlobalValueMedia(media),
    [current, internal]
  );

  const appendImages = useCallback(
    (media: Media[]) =>
      internal
        ? appendInternalValueMedia(current, media)
        : appendGlobalValueMedia(media),
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
    <div className="relative flex flex-col gap-[20px] flex-1 min-w-0">
      {!canEdit && (
        <>
          <div
            onClick={() => addRemoveInternal(current)}
            className="text-center absolute w-full h-full p-[20px] left-0 top-0 items-center justify-center flex z-[101] flex-col gap-[16px] cursor-pointer"
          >
            <div>
              <div className="w-[54px] h-[54px] rounded-full absolute z-[101] flex justify-center items-center">
                <LockIcon />
              </div>
              <div className="w-[54px] h-[54px] rounded-full bg-newSettings opacity-80" />
            </div>
            <div className="text-[14px] font-[600] text-newTextColor">
              {t('click_to_exit_global_editing')}
            </div>
            <div className="text-surface rounded-[12px] h-[44px] px-[20px] bg-ink flex justify-center items-center">
              {t('edit_content')}
            </div>
          </div>
          <div className="absolute w-full h-full left-0 top-0 bg-newSettings opacity-80 z-[100] rounded-[20px]" />
        </>
      )}
      <div
        className={clsx(
          'relative flex flex-col gap-[20px] flex-1 bg-newSettings rounded-[20px]',
          !canEdit && 'blur-s'
        )}
      >
        <Editor
          key={`${current}-${!!internal}`}
          value={value.content}
          pictures={value.media}
          onChange={changeValue}
          setImages={changeImages}
          appendImages={appendImages}
          totalChars={totalChars}
          chars={chars}
        />
      </div>
      {!!internal && !existingData.integration && (
        <div
          className="flex gap-[20px] items-center cursor-pointer select-none"
          onClick={goBackToGlobal}
        >
          <div className="flex gap-[6px] items-center">
            <div className="w-[8px] h-[8px] rounded-full bg-teal" />
            <div className="text-[14px] font-[600]">
              {t('editing_a_specific_network')}
            </div>
          </div>
          <div className="flex gap-[6px] items-center">
            <ResetIcon />
            <div className="text-[13px] font-[600]">{t('back_to_global')}</div>
          </div>
        </div>
      )}
    </div>
  );
};

const Editor: FC<{
  value: string;
  pictures: Media[];
  onChange: (value: string) => void;
  setImages: (value: Media[]) => void;
  appendImages: (value: Media[]) => void;
  totalChars: number;
  chars: Record<string, number>;
}> = (props) => {
  const { pictures, setImages, appendImages, chars } = props;
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [mode] = useCookie('mode', 'light');
  const t = useT();
  const toaster = useToaster();
  const editorRef = useRef<undefined | { editor: any }>(undefined);
  const [loading, setLoading] = useState(false);

  const uppy = useUppyUploader({
    onUploadSuccess: appendImages,
    allowedFileTypes: 'image/*,video/mp4',
    onStart: () => {},
    onEnd: () => setLoading(false),
  });

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

      setLoading(true);
      for (const file of files) {
        uppy.addFile(file);
      }
    },
    [uppy]
  );

  const paste = useCallback(
    (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.items || [])
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter((file): file is File => !!file);

      upload(files);
      return false;
    },
    [upload]
  );

  const { getRootProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      if (loading) {
        toaster.show(t('upload_in_progress'), 'warning');
        return;
      }
      upload(files);
    },
  });

  const valueWithoutHtml = useMemo(() => {
    return stripHtmlValidation('normal', props.value || '', true);
  }, [props.value]);

  const addText = useCallback((emoji: string) => {
    editorRef.current?.editor?.commands?.insertContent(emoji);
    editorRef.current?.editor?.commands?.focus();
  }, []);

  const focusEnd = useCallback(() => {
    if (!editorRef.current?.editor?.isFocused) {
      editorRef.current?.editor?.commands?.focus('end');
    }
  }, []);

  return (
    <div className="flex flex-col gap-[20px] flex-1 min-w-0">
      <div className="relative flex-1 p-[12px] flex flex-col">
        <div className="relative cursor-text flex flex-1 flex-col">
          <div {...getRootProps()} className="flex flex-1 flex-col">
            <div
              className={clsx(
                'absolute left-0 top-0 w-full h-full bg-black/70 z-[300] transition-all items-center justify-center flex text-white text-sm',
                !isDragActive ? 'pointer-events-none opacity-0' : 'opacity-100'
              )}
            >
              {t('drop_files_here_to_upload')}
            </div>
            <div className="px-[10px] pt-[10px] bg-newBgColorInner rounded-t-[12px] relative z-[99]">
              <OnlyEditor
                value={props.value}
                onChange={props.onChange}
                paste={paste}
                ref={editorRef}
              />
            </div>
            <div className="bg-newBgColorInner flex-1" onClick={focusEnd} />
            <div className="w-full pointer-events-none">
              <div className="w-full h-[46px] overflow-hidden absolute left-0 bg-newBgColorInner uppyChange">
                <Dashboard
                  height={46}
                  uppy={uppy}
                  id="prog-editor"
                  showProgressDetails={true}
                  hideUploadButton={true}
                  hideRetryButton={true}
                  hidePauseResumeButton={true}
                  hideCancelButton={true}
                  hideProgressAfterFinish={true}
                />
              </div>
            </div>
            <div
              className="w-full h-[46px] bg-newBgColorInner cursor-text"
              onClick={focusEnd}
            />
            <div className="flex bg-newBgColorInner rounded-b-[12px] cursor-default">
              <MultiMediaComponent
                value={pictures}
                name="image"
                information={
                  <InformationComponent
                    isPicture={pictures.length > 0}
                    chars={chars}
                    totalChars={valueWithoutHtml.length}
                    totalAllowedChars={props.totalChars}
                    text={valueWithoutHtml}
                  />
                }
                toolBar={
                  <div className="flex gap-[5px]">
                    <UText
                      editor={editorRef.current?.editor}
                      currentValue={props.value}
                    />
                    <BoldText
                      editor={editorRef.current?.editor}
                      currentValue={props.value}
                    />
                    <div
                      data-tooltip-id="tooltip"
                      data-tooltip-content={t('insert_emoji')}
                      className="select-none cursor-pointer rounded-[6px] w-[30px] h-[30px] bg-newColColor flex justify-center items-center"
                      onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                    >
                      <EmojiIcon />
                    </div>
                    <div className="relative">
                      <div className="absolute z-[500] -start-[50px] bottom-[35px]">
                        <EmojiPicker
                          height={400}
                          theme={mode === 'dark' ? Theme.DARK : Theme.LIGHT}
                          onEmojiClick={(e) => {
                            addText(e.emoji);
                            setEmojiPickerOpen(false);
                          }}
                          open={emojiPickerOpen}
                        />
                      </div>
                    </div>
                  </div>
                }
                onChange={(value) => setImages(value.target.value || [])}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const OnlyEditor = forwardRef<
  any,
  {
    value: string;
    onChange: (value: string) => void;
    paste: (event: ClipboardEvent) => boolean;
  }
>(({ value, onChange, paste }, ref) => {
  const t = useT();

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph.configure({
        HTMLAttributes: {
          dir: 'auto',
        },
      }),
      Text,
      Underline,
      Bold,
      InterceptBoldShortcut,
      InterceptUnderlineShortcut,
      Placeholder.configure({
        placeholder: t('write_something'),
        emptyEditorClass: 'is-editor-empty',
      }),
      History.configure({
        depth: 100,
        newGroupDelay: 100,
      }),
    ],
    content: value || '',
    shouldRerenderOnTransaction: true,
    immediatelyRender: false,
    editorProps: {
      handlePaste: (view, event) => paste(event as any),
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
    onUpdate: (innerProps) => {
      onChange(innerProps.editor.getHTML());
    },
  });

  useImperativeHandle(ref, () => ({
    editor,
  }));

  return <EditorContent editor={editor} />;
});
