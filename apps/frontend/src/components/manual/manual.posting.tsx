'use client';

import { FC, ReactNode, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import copy from 'copy-to-clipboard';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  InboxIcon,
  SmartphoneIcon,
} from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import {
  fromUtc,
  newDayjs,
} from '@vibeschedule/frontend/components/layout/set.timezone';
import {
  PageBody,
  PageHeader,
} from '@vibeschedule/frontend/components/layout/page-header';
import { ChannelAvatar } from '@vibeschedule/frontend/components/launches/channel.avatar';
import { Badge } from '@vibeschedule/frontend/components/ui/badge';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@vibeschedule/frontend/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@vibeschedule/frontend/components/ui/empty';
import { Input } from '@vibeschedule/frontend/components/ui/input';
import { Skeleton } from '@vibeschedule/frontend/components/ui/skeleton';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@vibeschedule/frontend/components/ui/tabs';
import { Alert, AlertTitle } from '@vibeschedule/frontend/components/ui/alert';
import { cn } from '@vibeschedule/frontend/lib/utils';
import { usePersistedFilters } from '@vibeschedule/frontend/lib/use-persisted-filters';
import {
  ManualMedia,
  useManualMedia,
} from '@vibeschedule/frontend/components/manual/use.manual.media';

interface ManualPost {
  id: string;
  state: 'QUEUE' | 'PUBLISHED';
  publishDate: string;
  postedAt: string | null;
  releaseURL: string | null;
  // the post on the platform is known, so its numbers can be read
  linked: boolean;
  caption: string;
  media: ManualMedia[];
  channel: { id: string; name: string; picture: string; identifier: string };
}

interface Metric {
  label: string;
  data: { total: string }[];
}

const responseMessage = async (response: Response) => {
  const { message } = await response.json().catch(() => ({}));
  return (Array.isArray(message) ? message[0] : message) as string | undefined;
};

const numberFormat = new Intl.NumberFormat('de-DE');

const useWhen = () => {
  const t = useT();
  return useCallback(
    (post: ManualPost) => {
      const date = fromUtc(post.publishDate);
      const today = newDayjs().startOf('day');
      const days = date.startOf('day').diff(today, 'day');
      const time = date.format('HH:mm');
      const overdue = post.state === 'QUEUE' && date.isBefore(newDayjs());
      return {
        overdue,
        today: days === 0,
        label:
          days === 0
            ? t('manual_today_at', { time })
            : days === -1
            ? t('manual_yesterday_at', { time })
            : days === 1
            ? t('manual_tomorrow_at', { time })
            : date.format('DD.MM., HH:mm'),
      };
    },
    [t]
  );
};

const WhenBadge: FC<{ post: ManualPost }> = ({ post }) => {
  const t = useT();
  const when = useWhen()(post);
  if (post.state === 'PUBLISHED') {
    return (
      <Badge variant="outline">
        <CheckIcon data-icon="inline-start" />
        {t('manual_posted_on', {
          date: fromUtc(post.postedAt || post.publishDate).format(
            'DD.MM., HH:mm'
          ),
        })}
      </Badge>
    );
  }
  return (
    <Badge
      variant={
        when.overdue ? 'destructive' : when.today ? 'default' : 'secondary'
      }
      className="tabular-nums"
    >
      {when.overdue ? `${t('manual_overdue')} · ${when.label}` : when.label}
    </Badge>
  );
};

// the first slide of a post, the list does not need the others
const Thumb: FC<{ post: ManualPost }> = ({ post }) => {
  const first = useMemo(() => post.media.slice(0, 1), [post.id]);
  const { loaded } = useManualMedia(post.id, first);
  const media = loaded[0];
  return (
    <div className="relative aspect-[2/3] w-14 shrink-0 overflow-hidden rounded-md bg-muted">
      {!media && <Skeleton className="absolute inset-0 rounded-none" />}
      {media?.type === 'image' && (
        <img src={media.url} alt="" className="size-full object-cover" />
      )}
      {media?.type === 'video' && (
        <video
          src={media.url}
          muted
          playsInline
          preload="metadata"
          className="size-full object-cover"
        />
      )}
      {post.media.length > 1 && (
        <span className="absolute end-1 bottom-1 rounded-full bg-foreground/70 px-1.5 text-xs font-medium text-background tabular-nums">
          {post.media.length}
        </span>
      )}
    </div>
  );
};

const PostRow: FC<{ post: ManualPost; onOpen: () => void }> = ({
  post,
  onOpen,
}) => (
  <button
    type="button"
    onClick={onOpen}
    className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/50 active:bg-muted"
  >
    <Thumb post={post} />
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <WhenBadge post={post} />
      <p className="line-clamp-2 text-sm break-words text-muted-foreground">
        {post.caption}
      </p>
    </div>
    <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
  </button>
);

const ListSkeleton = () => (
  <div className="flex flex-col gap-4">
    {Array.from({ length: 2 }, (_, i) => (
      <Skeleton key={i} className="h-52 rounded-xl" />
    ))}
  </div>
);

const TAB_KEYS = ['tab'];

const ManualList: FC<{
  posts?: ManualPost[];
  failed: boolean;
  onOpen: (id: string) => void;
}> = ({ posts, failed, onOpen }) => {
  const t = useT();
  const { ready, params, setParams } = usePersistedFilters('manual', TAB_KEYS);
  const tab = params.get('tab') === 'posted' ? 'posted' : 'open';
  const open = useMemo(
    () => (posts || []).filter((post) => post.state === 'QUEUE'),
    [posts]
  );
  const posted = useMemo(
    () =>
      (posts || [])
        .filter((post) => post.state === 'PUBLISHED')
        .sort((a, b) => ((a.postedAt || '') < (b.postedAt || '') ? 1 : -1)),
    [posts]
  );
  const shown = tab === 'open' ? open : posted;

  // one card per account, in the order of its next post
  const channels = useMemo(() => {
    const byChannel = new Map<string, ManualPost[]>();
    for (const post of shown) {
      byChannel.set(post.channel.id, [
        ...(byChannel.get(post.channel.id) || []),
        post,
      ]);
    }
    return [...byChannel.values()];
  }, [shown]);

  return (
    <PageBody className="max-w-2xl">
      <PageHeader
        title={t('manual_posting')}
        description={t('manual_posting_description')}
      />
      <Tabs
        value={tab}
        onValueChange={(value) =>
          setParams({ tab: value === 'posted' ? 'posted' : null })
        }
      >
        <TabsList className="w-full group-data-horizontal/tabs:h-10">
          <TabsTrigger value="open">
            {t('manual_tab_open')}
            {posts && (
              <span className="text-muted-foreground tabular-nums">
                {open.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="posted">{t('manual_tab_posted')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {failed ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>{t('manual_load_failed')}</AlertTitle>
        </Alert>
      ) : !posts || !ready ? (
        <ListSkeleton />
      ) : !shown.length ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {tab === 'open' ? <InboxIcon /> : <SmartphoneIcon />}
            </EmptyMedia>
            <EmptyTitle>
              {tab === 'open'
                ? t('manual_nothing_open')
                : t('manual_nothing_posted')}
            </EmptyTitle>
            {tab === 'open' && (
              <EmptyDescription>
                {t('manual_nothing_open_hint')}
              </EmptyDescription>
            )}
          </EmptyHeader>
        </Empty>
      ) : (
        channels.map((channelPosts) => {
          const channel = channelPosts[0].channel;
          return (
            <Card key={channel.id} className="gap-0 pb-0">
              <CardHeader className="border-b">
                <CardTitle className="flex min-w-0 items-center gap-2.5">
                  <ChannelAvatar
                    picture={channel.picture}
                    identifier={channel.identifier}
                    name={channel.name}
                  />
                  <span className="truncate">{channel.name}</span>
                  <span className="ms-auto text-sm font-normal text-muted-foreground tabular-nums">
                    {channelPosts.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <div className="divide-y">
                {channelPosts.map((post) => (
                  <PostRow
                    key={post.id}
                    post={post}
                    onOpen={() => onOpen(post.id)}
                  />
                ))}
              </div>
            </Card>
          );
        })
      )}
    </PageBody>
  );
};

const Step: FC<{
  number: number;
  title: string;
  done?: boolean;
  children: ReactNode;
}> = ({ number, title, done, children }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2.5">
        <span
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
            done
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {done ? <CheckIcon className="size-3.5" /> : number}
        </span>
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-3">{children}</CardContent>
  </Card>
);

const Metrics: FC<{ postId: string }> = ({ postId }) => {
  const fetch = useFetch();
  const t = useT();
  const { data, isLoading } = useSWR<Metric[]>(
    `/manual/posts/${postId}/analytics`,
    async (url: string) => {
      const response = await fetch(url);
      return response.ok ? response.json() : [];
    },
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }
  if (!data?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('manual_metrics_pending')}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {data.map((metric) => (
        <div
          key={metric.label}
          className="flex flex-col gap-0.5 rounded-lg border p-3"
        >
          <span className="text-xs text-muted-foreground">{metric.label}</span>
          <span className="font-heading text-xl font-semibold tracking-tight tabular-nums">
            {numberFormat.format(
              metric.data.reduce((sum, p) => sum + Number(p.total), 0)
            )}
          </span>
        </div>
      ))}
    </div>
  );
};

const ManualPostView: FC<{
  post: ManualPost;
  onBack: () => void;
  onChange: (post: ManualPost) => void;
}> = ({ post, onBack, onChange }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const { loaded, ready, failed } = useManualMedia(post.id, post.media);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState('');
  const [saving, setSaving] = useState(false);
  const posted = post.state === 'PUBLISHED';
  const onlyVideo = post.media.length === 1 && post.media[0].type === 'video';

  const files = useMemo(() => loaded.map((media) => media.file), [loaded]);
  // phones hand the files to the share sheet, which saves them to Photos
  const canShare = useMemo(
    () =>
      ready &&
      !!files.length &&
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      !!navigator.canShare?.({ files }),
    [ready, files]
  );

  const download = useCallback(() => {
    loaded.forEach((media, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = media.url;
        a.download = media.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, i * 250);
    });
  }, [loaded]);

  // no await before share(): iOS only allows it directly inside the tap
  const save = useCallback(() => {
    if (!canShare) {
      download();
      setSaved(true);
      return;
    }
    navigator
      .share({ files })
      .then(() => setSaved(true))
      .catch((err: Error) => {
        if (err.name !== 'AbortError') {
          download();
          setSaved(true);
        }
      });
  }, [canShare, download, files]);

  const copyCaption = useCallback(() => {
    copy(post.caption);
    setCopied(true);
    toaster.show(t('manual_caption_copied'), 'success');
  }, [post.caption, t, toaster]);

  const request = useCallback(
    async (method: 'POST' | 'DELETE', url?: string) => {
      setSaving(true);
      const response = await fetch(`/manual/posts/${post.id}/posted`, {
        method,
        ...(method === 'POST' ? { body: JSON.stringify({ url }) } : {}),
      });
      setSaving(false);
      if (!response.ok) {
        toaster.show(
          (await responseMessage(response)) || t('manual_save_failed'),
          'warning'
        );
        return;
      }
      setLink('');
      onChange(await response.json());
    },
    [fetch, onChange, post.id, t, toaster]
  );

  // 16px text so iOS does not zoom into the field
  const linkInput = (
    <Input
      value={link}
      onChange={(e) => setLink(e.target.value)}
      placeholder={t('manual_link_placeholder')}
      type="url"
      inputMode="url"
      autoCapitalize="off"
      autoCorrect="off"
      className="h-11 text-base md:h-9 md:text-sm"
    />
  );

  return (
    <PageBody className="max-w-2xl">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-lg"
          className="-ms-2"
          onClick={onBack}
          aria-label={t('back')}
        >
          <ArrowLeftIcon />
        </Button>
        <ChannelAvatar
          picture={post.channel.picture}
          identifier={post.channel.identifier}
          name={post.channel.name}
        />
        <span className="min-w-0 flex-1 truncate font-medium">
          {post.channel.name}
        </span>
        <WhenBadge post={post} />
      </div>

      <div className="-mx-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 pb-1 sm:-mx-4 sm:px-4 md:mx-0 md:px-0">
        {post.media.map((media) => {
          const item = loaded.find((p) => p.index === media.index);
          return (
            <div
              key={media.index}
              className={cn(
                'relative aspect-[9/16] shrink-0 snap-center overflow-hidden rounded-xl bg-muted',
                post.media.length === 1
                  ? 'mx-auto w-full max-w-xs'
                  : 'w-3/5 max-w-64'
              )}
            >
              {item?.type === 'image' && (
                <img
                  src={item.url}
                  alt={media.name}
                  className="size-full object-contain"
                />
              )}
              {item?.type === 'video' && (
                <video
                  src={item.url}
                  controls
                  playsInline
                  className="size-full object-contain"
                />
              )}
              {!item && !failed && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Spinner className="size-6 text-muted-foreground" />
                </div>
              )}
              {post.media.length > 1 && (
                <Badge
                  variant="secondary"
                  className="absolute start-2 top-2 bg-background/80 tabular-nums backdrop-blur"
                >
                  {media.index + 1}/{post.media.length}
                </Badge>
              )}
            </div>
          );
        })}
      </div>
      {failed && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>{t('manual_media_failed')}</AlertTitle>
        </Alert>
      )}

      <Step
        number={1}
        title={onlyVideo ? t('manual_step_save_video') : t('manual_step_save')}
        done={saved || posted}
      >
        <Button
          size="lg"
          className="h-11 w-full"
          onClick={save}
          disabled={!ready}
        >
          {ready ? (
            <DownloadIcon data-icon="inline-start" />
          ) : (
            <Spinner data-icon="inline-start" />
          )}
          {!ready
            ? t('manual_loading_media', {
                loaded: loaded.length,
                total: post.media.length,
              })
            : canShare
            ? t('manual_save_to_photos')
            : t('manual_download')}
        </Button>
        <p className="text-sm text-muted-foreground">
          {canShare || !ready
            ? t('manual_save_hint', { count: post.media.length })
            : t('manual_download_hint')}
        </p>
      </Step>

      <Step number={2} title={t('manual_step_caption')} done={copied || posted}>
        <p className="max-h-44 overflow-y-auto rounded-lg bg-muted p-3 text-sm/relaxed break-words whitespace-pre-wrap">
          {post.caption || t('manual_no_caption')}
        </p>
        <Button
          variant="outline"
          size="lg"
          className="h-11 w-full"
          onClick={copyCaption}
          disabled={!post.caption}
        >
          {copied ? (
            <CheckIcon data-icon="inline-start" />
          ) : (
            <CopyIcon data-icon="inline-start" />
          )}
          {copied ? t('manual_caption_copied') : t('manual_copy_caption')}
        </Button>
      </Step>

      {!posted ? (
        <Step number={3} title={t('manual_step_post')}>
          <p className="text-sm text-muted-foreground">
            {t('manual_post_hint')}
          </p>
          {linkInput}
          <Button
            size="lg"
            className="h-11 w-full"
            onClick={() => request('POST', link)}
            disabled={saving}
          >
            {saving ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            {t('manual_mark_posted')}
          </Button>
        </Step>
      ) : (
        <Step number={3} title={t('manual_posted')} done={true}>
          {post.releaseURL && (
            <a
              href={post.releaseURL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm break-all underline underline-offset-4"
            >
              <ExternalLinkIcon className="size-3.5 shrink-0" />
              {post.releaseURL}
            </a>
          )}
          {post.linked ? (
            <Metrics postId={post.id} />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {t('manual_not_linked_hint')}
              </p>
              {linkInput}
              <Button
                variant="outline"
                size="lg"
                className="h-11 w-full md:h-9"
                onClick={() => request('POST', link)}
                disabled={saving || !link.trim()}
              >
                {saving && <Spinner data-icon="inline-start" />}
                {t('manual_save_link')}
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="self-start text-muted-foreground"
            onClick={() => request('DELETE')}
            disabled={saving}
          >
            {t('manual_undo_posted')}
          </Button>
        </Step>
      )}
    </PageBody>
  );
};

export const ManualPosting = () => {
  const fetch = useFetch();
  const router = useRouter();
  const postId = useSearchParams().get('post');

  const { data, error, mutate } = useSWR(
    '/manual/posts',
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(await responseMessage(response));
      }
      return (await response.json()).posts as ManualPost[];
    }
  );

  const update = useCallback(
    (post: ManualPost) =>
      mutate(
        (posts) => posts?.map((p) => (p.id === post.id ? post : p)),
        { revalidate: false }
      ),
    [mutate]
  );

  const post = postId && data?.find((p) => p.id === postId);
  if (post) {
    return (
      <ManualPostView
        key={post.id}
        post={post}
        onBack={() => router.push('/manual')}
        onChange={update}
      />
    );
  }

  return (
    <ManualList
      posts={data}
      failed={!!error}
      onOpen={(id) => router.push(`/manual?post=${id}`)}
    />
  );
};
