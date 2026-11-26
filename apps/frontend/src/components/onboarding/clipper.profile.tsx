'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import copy from 'copy-to-clipboard';
import { CircleDashedIcon, CopyIcon, DownloadIcon } from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import type { OnboardingAccount } from '@vibeschedule/frontend/components/clippers/clipper.types';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@vibeschedule/frontend/components/ui/alert';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';

// The profile we hand out for an account, for the clipper to carry over into
// TikTok: picture to save, name, username and bio to copy

export const useCopy = () => {
  const t = useT();
  const toaster = useToaster();
  return useCallback(
    (value: string) => {
      copy(value);
      toaster.show(t('start_copied'), 'success');
    },
    [t, toaster]
  );
};

const CopyRow: FC<{ label: string; value: string | null }> = ({
  label,
  value,
}) => {
  const t = useT();
  const copyValue = useCopy();
  if (!value) {
    return null;
  }
  return (
    <div className="flex items-center gap-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-medium break-words">{value}</span>
      </div>
      <Button
        variant="outline"
        size="icon"
        className="size-10 shrink-0 md:size-8"
        aria-label={t('start_copy', { label })}
        onClick={() => copyValue(value)}
      >
        <CopyIcon />
      </Button>
    </div>
  );
};

// the picture as a file, loaded before the tap: iOS shares only right inside it
const useAvatarFile = (account: OnboardingAccount) => {
  const fetch = useFetch();
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    if (!account.profile.avatar) {
      return;
    }
    let cancelled = false;
    fetch(`/onboarding/accounts/${account.id}/avatar`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error();
        }
        const blob = await response.blob();
        const ext = blob.type.split('/')[1] || 'jpg';
        if (!cancelled) {
          setFile(
            new File(
              [blob],
              `${account.profile.username || 'profilbild'}.${ext}`,
              {
                type: blob.type,
              }
            )
          );
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [account.id, account.profile.avatar]);
  return file;
};

export const Profile: FC<{ account: OnboardingAccount }> = ({ account }) => {
  const t = useT();
  const file = useAvatarFile(account);
  const { profile } = account;

  const save = useCallback(() => {
    if (!file) {
      return;
    }
    const download = () => {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    if (
      typeof navigator.share === 'function' &&
      navigator.canShare?.({ files: [file] })
    ) {
      navigator.share({ files: [file] }).catch((err: Error) => {
        if (err.name !== 'AbortError') {
          download();
        }
      });
    } else {
      download();
    }
  }, [file]);

  if (!profile.ready) {
    return (
      <Alert>
        <CircleDashedIcon />
        <AlertTitle>{t('start_profile_pending')}</AlertTitle>
        <AlertDescription>{t('start_profile_pending_text')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <img
          src={profile.avatar!}
          alt=""
          className="size-16 shrink-0 rounded-full border object-cover"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {t('start_profile_picture')}
          </span>
          <Button
            variant="outline"
            className="h-10 self-start md:h-8"
            onClick={save}
            disabled={!file}
          >
            {file ? (
              <DownloadIcon data-icon="inline-start" />
            ) : (
              <Spinner data-icon="inline-start" />
            )}
            {t('start_save_picture')}
          </Button>
        </div>
      </div>
      <CopyRow label={t('start_profile_name')} value={profile.name} />
      <CopyRow
        label={t('start_profile_username')}
        value={profile.username && `@${profile.username}`}
      />
      <CopyRow label={t('start_profile_bio')} value={profile.bio} />
    </div>
  );
};
