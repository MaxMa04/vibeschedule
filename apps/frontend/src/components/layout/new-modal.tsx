'use client';

import i18next from '@vibeschedule/react/translation/i18next';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
} from 'react';
import { makeId } from '@vibeschedule/nestjs-libraries/services/make.is';
import { cn } from '@vibeschedule/frontend/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@vibeschedule/frontend/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@vibeschedule/frontend/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@vibeschedule/frontend/components/ui/alert-dialog';

/**
 * - `sm` | `md` (default) | `lg` | `xl`: centered dialog of that width
 * - `full`: large workspace (post editor, media library), full screen on phones
 * Any other value (old pixel or percent sizes) is treated as `xl`.
 */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface OpenModalInterface {
  title?: ReactNode;
  description?: ReactNode;
  /** `sheet` slides in from the right, for admin forms */
  variant?: 'dialog' | 'sheet';
  size?: ModalSize | string | number;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  /** no header and no padding, the children render the whole surface */
  removeLayout?: boolean;
  /** same as `size: 'full'` */
  fullScreen?: boolean;
  withCloseButton?: boolean;
  destructive?: boolean;
  /** asks before closing by Escape, outside click or the close button */
  askClose?: boolean;
  onClose?: () => void;
  children: ReactNode | ((close: () => void) => ReactNode);
  id?: string;
  /** @deprecated ignored, use `size` */
  classNames?: { modal?: string };
  /** @deprecated ignored */
  top?: string | number;
  /** @deprecated ignored, use `size: 'full'` */
  height?: string | number;
  /** @deprecated ignored */
  maxSize?: string | number;
}

export interface ConfirmOptions {
  title?: ReactNode;
  description?: ReactNode;
  approveLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onlyApprove?: boolean;
}

type StackEntry = { id: string; closing?: boolean } & (
  | ({ kind: 'modal' } & OpenModalInterface)
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (v: boolean) => void }
);

interface ModalStore {
  stack: StackEntry[];
  push(entry: StackEntry): void;
  close(id: string): void;
  closeAll(): void;
  remove(id: string): void;
}

// closing a layer also closes everything stacked on top of it
const fromIndex = (stack: StackEntry[], id: string, closing?: boolean) =>
  stack.findIndex(
    (p) => p.id === id && (closing === undefined || !!p.closing === closing)
  );

const useModalStore = create<ModalStore>((set, get) => ({
  stack: [],
  push: (entry) =>
    set((state) =>
      state.stack.some((p) => p.id === entry.id && !p.closing)
        ? state
        : {
            stack: [...state.stack.filter((p) => p.id !== entry.id), entry],
          }
    ),
  close: (id) => {
    const index = fromIndex(get().stack, id, false);
    if (index === -1) {
      return;
    }
    set((state) => ({
      stack: state.stack.map((p, i) =>
        i >= index ? { ...p, closing: true } : p
      ),
    }));
    // in case the exit animation never reports back
    setTimeout(() => get().remove(id), 500);
  },
  closeAll: () => {
    const ids = get().stack.map((p) => p.id);
    set((state) => ({
      stack: state.stack.map((p) => ({ ...p, closing: true })),
    }));
    setTimeout(() => ids.forEach((id) => get().remove(id)), 500);
  },
  remove: (id) =>
    set((state) => {
      const index = fromIndex(state.stack, id, true);
      return index === -1 ? state : { stack: state.stack.slice(0, index) };
    }),
}));

const CurrentModalContext = createContext({ id: '' });

export const useModals = () => {
  const { push, close, closeAll } = useModalStore(
    useShallow((state) => ({
      push: state.push,
      close: state.close,
      closeAll: state.closeAll,
    }))
  );
  const current = useContext(CurrentModalContext);

  const openModal = useCallback(
    (params: OpenModalInterface) =>
      push({ ...params, kind: 'modal', id: params.id || makeId(20) }),
    [push]
  );

  const closeCurrent = useCallback(() => {
    if (current.id) {
      close(current.id);
    }
  }, [close, current.id]);

  return { openModal, closeAll, closeById: close, closeCurrent };
};

export const areYouSure = (options: ConfirmOptions = {}): Promise<boolean> =>
  new Promise<boolean>((resolve) => {
    useModalStore.getState().push({
      kind: 'confirm',
      id: makeId(20),
      options,
      resolve,
    });
  });

export const useDecisionModal = () => {
  const open = useCallback(
    (options: ConfirmOptions = {}) => areYouSure(options),
    []
  );
  return { open };
};

const sizeClass = (entry: OpenModalInterface): ModalSize => {
  if (entry.fullScreen || entry.removeLayout) {
    return 'full';
  }
  if (
    entry.size === 'sm' ||
    entry.size === 'md' ||
    entry.size === 'lg' ||
    entry.size === 'full'
  ) {
    return entry.size;
  }
  return entry.size ? 'xl' : 'md';
};

const dialogSizes: Record<ModalSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-5xl',
  full: 'flex flex-col h-[calc(100dvh-2rem)] sm:w-[min(calc(100%-2rem),1400px)] sm:max-w-none max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none',
};

const ModalLayer: FC<{
  entry: Extract<StackEntry, { kind: 'modal' }>;
  index: number;
}> = ({ entry, index }) => {
  const close = useModalStore((state) => state.close);
  const remove = useModalStore((state) => state.remove);

  const requestClose = useCallback(async () => {
    if (entry.askClose && !(await areYouSure())) {
      return;
    }
    entry.onClose?.();
    close(entry.id);
  }, [entry, close]);

  const onOpenChange = useCallback(
    (open: boolean, details: { reason: string }) => {
      if (open) {
        return;
      }
      if (details.reason === 'escape-key' && entry.closeOnEscape === false) {
        return;
      }
      if (
        details.reason === 'outside-press' &&
        entry.closeOnClickOutside === false
      ) {
        return;
      }
      requestClose();
    },
    [entry, requestClose]
  );

  const onOpenChangeComplete = useCallback(
    (open: boolean) => {
      if (!open) {
        remove(entry.id);
      }
    },
    [entry.id, remove]
  );

  const body =
    typeof entry.children === 'function'
      ? entry.children(requestClose)
      : entry.children;
  const showClose = entry.withCloseButton !== false && !entry.removeLayout;
  const size = sizeClass(entry);
  const stacked = <ModalStack index={index + 1} />;

  if (entry.variant === 'sheet') {
    return (
      <CurrentModalContext.Provider value={{ id: entry.id }}>
        <Sheet
          open={!entry.closing}
          onOpenChange={onOpenChange}
          onOpenChangeComplete={onOpenChangeComplete}
          disablePointerDismissal={entry.closeOnClickOutside === false}
        >
          <SheetContent
            showCloseButton={showClose}
            className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
          >
            {(!!entry.title || !!entry.description) && (
              <SheetHeader className="border-b pe-12">
                {!!entry.title && <SheetTitle>{entry.title}</SheetTitle>}
                {!!entry.description && (
                  <SheetDescription>{entry.description}</SheetDescription>
                )}
              </SheetHeader>
            )}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
              {body}
            </div>
          </SheetContent>
          {stacked}
        </Sheet>
      </CurrentModalContext.Provider>
    );
  }

  return (
    <CurrentModalContext.Provider value={{ id: entry.id }}>
      <Dialog
        open={!entry.closing}
        onOpenChange={onOpenChange}
        onOpenChangeComplete={onOpenChangeComplete}
        disablePointerDismissal={entry.closeOnClickOutside === false}
      >
        <DialogContent
          showCloseButton={showClose}
          className={cn(
            'max-h-[calc(100dvh-2rem)]',
            dialogSizes[size],
            size !== 'full' && 'overflow-y-auto',
            entry.removeLayout && 'gap-0 overflow-hidden p-0',
            entry.destructive && 'ring-destructive/40'
          )}
        >
          {!entry.removeLayout && (!!entry.title || !!entry.description) && (
            <DialogHeader className={cn(showClose && 'pe-8')}>
              {!!entry.title && (
                <DialogTitle className="text-lg font-semibold">
                  {entry.title}
                </DialogTitle>
              )}
              {!!entry.description && (
                <DialogDescription>{entry.description}</DialogDescription>
              )}
            </DialogHeader>
          )}
          {size === 'full' ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              {body}
            </div>
          ) : (
            body
          )}
        </DialogContent>
        {stacked}
      </Dialog>
    </CurrentModalContext.Provider>
  );
};

const ConfirmLayer: FC<{
  entry: Extract<StackEntry, { kind: 'confirm' }>;
  index: number;
}> = ({ entry, index }) => {
  const close = useModalStore((state) => state.close);
  const remove = useModalStore((state) => state.remove);
  const {
    title = i18next.t('are_you_sure'),
    description = i18next.t('are_you_sure_you_want_to_close_the_window'),
    approveLabel = i18next.t('yes'),
    cancelLabel = i18next.t('no'),
    destructive,
    onlyApprove,
  } = entry.options;

  const answer = useCallback(
    (value: boolean) => {
      if (entry.closing) {
        return;
      }
      entry.resolve(value);
      close(entry.id);
    },
    [entry, close]
  );

  return (
    <AlertDialog
      open={!entry.closing}
      onOpenChange={(open) => !open && answer(false)}
      onOpenChangeComplete={(open) => !open && remove(entry.id)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {!!description && (
            <AlertDialogDescription className="whitespace-pre-line">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          {!onlyApprove && (
            <AlertDialogCancel
              className="h-10 md:h-8"
              onClick={() => answer(false)}
            >
              {cancelLabel}
            </AlertDialogCancel>
          )}
          <AlertDialogAction
            autoFocus
            className="h-10 md:h-8"
            variant={destructive ? 'destructive' : 'default'}
            onClick={() => answer(true)}
          >
            {approveLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
      <ModalStack index={index + 1} />
    </AlertDialog>
  );
};

// each layer renders the next one inside its root, so Base UI treats the
// stack as nested dialogs (Escape and outside clicks reach only the top one)
const ModalStack: FC<{ index: number }> = ({ index }) => {
  const entry = useModalStore((state) => state.stack[index]);
  if (!entry) {
    return null;
  }
  return entry.kind === 'confirm' ? (
    <ConfirmLayer key={entry.id} entry={entry} index={index} />
  ) : (
    <ModalLayer key={entry.id} entry={entry} index={index} />
  );
};

export const ModalProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // a page change leaves nothing open
  useEffect(() => () => useModalStore.getState().closeAll(), []);
  return (
    <>
      {children}
      <ModalStack index={0} />
    </>
  );
};
