'use client';

import { useCallback, useState } from 'react';
import { useSWRConfig } from 'swr';
import copy from 'copy-to-clipboard';
import {
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  RefreshCwIcon,
  TerminalIcon,
} from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useUser } from '@vibeschedule/frontend/components/layout/user.context';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { useVariables } from '@vibeschedule/react/helpers/variable.context';
import { deleteDialog } from '@vibeschedule/react/helpers/delete.dialog';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@vibeschedule/frontend/components/ui/card';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@vibeschedule/frontend/components/ui/input-group';

export const ApiKeyComponent = () => {
  const user = useUser();
  const fetch = useFetch();
  const toaster = useToaster();
  const { backendUrl } = useVariables();
  const { mutate } = useSWRConfig();
  const t = useT();
  const [visible, setVisible] = useState(false);
  const [rotating, setRotating] = useState(false);
  const apiKey = user?.publicApi || user?.apiKey || '';
  const shownKey = visible ? apiKey : '•'.repeat(32);

  const commands = (key: string) =>
    `export VIBESCHEDULE_API_URL=${backendUrl}\nexport VIBESCHEDULE_API_KEY=${key}\nvibeschedule --help`;

  const copyText = useCallback(
    (text: string, message: string) => () => {
      copy(text);
      toaster.show(message);
    },
    [toaster]
  );

  const rotate = useCallback(async () => {
    if (
      !(await deleteDialog(
        t('rotate_api_key_confirm'),
        t('rotate_api_key'),
        t('rotate_api_key'),
        t('cancel')
      ))
    ) {
      return;
    }
    setRotating(true);
    const response = await fetch('/user/api-key/rotate', { method: 'POST' });
    setRotating(false);
    if (!response.ok) {
      toaster.show(t('api_key_rotate_failed'), 'warning');
      return;
    }
    await mutate('/user/self');
    toaster.show(t('api_key_rotated'));
  }, [fetch, mutate, t, toaster]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('label_api_key')}</CardTitle>
          <CardDescription>{t('api_key_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {apiKey ? (
            <InputGroup className="h-10 md:h-9">
              <InputGroupInput
                readOnly
                value={shownKey}
                aria-label={t('label_api_key')}
                className="font-mono"
                onFocus={(e) => visible && e.target.select()}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label={visible ? t('hide') : t('reveal')}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOffIcon /> : <EyeIcon />}
                </InputGroupButton>
                <InputGroupButton
                  size="icon-xs"
                  aria-label={t('copy')}
                  onClick={copyText(apiKey, t('api_key_copied'))}
                >
                  <CopyIcon />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          ) : (
            <p className="text-sm text-muted-foreground">{t('no_api_key')}</p>
          )}
        </CardContent>
        <CardFooter className="flex-wrap gap-2">
          <p className="mr-auto text-sm text-muted-foreground">
            {t('rotate_api_key_hint')}
          </p>
          <Button
            variant="outline"
            className="h-10 w-full sm:w-fit md:h-8"
            disabled={rotating}
            onClick={rotate}
          >
            {rotating ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <RefreshCwIcon data-icon="inline-start" />
            )}
            {t('rotate_api_key')}
          </Button>
        </CardFooter>
      </Card>
      {!!apiKey && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TerminalIcon className="size-4 text-muted-foreground" />
              {t('cli_title')}
            </CardTitle>
            <CardDescription>{t('cli_description')}</CardDescription>
            <CardAction>
              <Button
                variant="outline"
                className="h-10 md:h-8"
                onClick={copyText(commands(apiKey), t('commands_copied'))}
              >
                <CopyIcon data-icon="inline-start" />
                <span className="max-sm:sr-only">{t('copy_commands')}</span>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed whitespace-pre">
              {commands(shownKey)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
