'use client';

import { FC, ReactNode, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';
import copy from 'copy-to-clipboard';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { useToaster } from '@vibeschedule/react/toaster/toaster';
import { Button } from '@vibeschedule/react/form/button';
import ImageWithFallback from '@vibeschedule/react/helpers/image.with.fallback';
import Spinner, {
  LoadingComponent,
} from '@vibeschedule/frontend/components/layout/loading';
import {
  fromUtc,
  newDayjs,
} from '@vibeschedule/frontend/components/layout/set.timezone';
import {
  CheckmarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@vibeschedule/frontend/components/ui/icons';
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

const ChannelName: FC<{ channel: ManualPost['channel']; size?: number }> = ({
  channel,
  size = 28,
}) => (
  <div className="flex items-center gap-[8px] min-w-0">
    <ImageWithFallback
      fallbackSrc={`/icons/platforms/${channel.identifier}.png`}
      src={channel.picture || `/icons/platforms/${channel.identifier}.png`}
      className="rounded-full shrink-0"
      alt={channel.identifier}
      width={size}
      height={size}
    />
    <div className="truncate font-[600]">{channel.name}</div>
  </div>
);

const WhenBadge: FC<{ post: ManualPost }> = ({ post }) => {
  const t = useT();
  const when = useWhen()(post);
  if (post.state === 'PUBLISHED') {
    return (
      <span className="inline-flex items-center gap-[4px] text-[12px] font-[600] text-teal">
        <CheckmarkIcon width={12} height={12} />
        {t('manual_posted_on', {
          date: fromUtc(post.postedAt || post.publishDate).format(
            'DD.MM., HH:mm'
          ),
        })}
      </span>
    );
  }
  return (
    <span
      className={clsx(
        'inline-flex items-center h-[22px] px-[8px] rounded-full text-[12px] font-[600] whitespace-nowrap',
        when.overdue
          ? 'bg-error text-white'
          : when.today
          ? 'bg-ink text-surface'
          : 'bg-btnSimple text-btnText'
      )}
    >
      {when.overdue ? `${t('manual_overdue')} · ${when.label}` : when.label}
    </span>
  );
};

// the first slide of a post, the list does not need the others
const Thumb: FC<{ post: ManualPost }> = ({ post }) => {
  const first = useMemo(() => post.media.slice(0, 1), [post.id]);
  const { loaded } = useManualMedia(post.id, first);
  const media = loaded[0];
  return (
    <div className="relative w-[56px] h-[84px] shrink-0 rounded-[8px] overflow-hidden bg-btnSimple">
      {media?.type === 'image' && (
        <img src={media.url} alt="" className="w-full h-full object-cover" />
      )}
      {media?.type === 'video' && (
        <video
          src={media.url}
          muted
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
        />
      )}
      {post.media.length > 1 && (
        <div className="absolute bottom-[4px] end-[4px] px-[5px] h-[16px] rounded-full bg-black/60 text-white text-[10px] font-[600] flex items-center">
          {post.media.length}
        </div>
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
    className="w-full flex items-center gap-[12px] p-[12px] text-start rounded-[16px] border border-newBorder bg-newBgColorInner hover:bg-boxHover transition-colors"
  >
    <Thumb post={post} />
    <div className="flex-1 min-w-0 flex flex-col gap-[6px]">
      <div>
        <WhenBadge post={post} />
      </div>
      <div className="text-[14px] leading-[1.35] line-clamp-2 break-words">
        {post.caption}
      </div>
    </div>
    <ChevronRightIcon size={20} className="shrink-0 text-textItemBlur" />
  </button>
);

const ManualList: FC<{
  posts: ManualPost[];
  onOpen: (id: string) => void;
}> = ({ posts, onOpen }) => {
  const t = useT();
  const [tab, setTab] = useState<'open' | 'posted'>('open');
  const open = posts.filter((post) => post.state === 'QUEUE');
  const posted = posts
    .filter((post) => post.state === 'PUBLISHED')
    .sort((a, b) => (a.postedAt! < b.postedAt! ? 1 : -1));
  const shown = tab === 'open' ? open : posted;

  // one block per account, in the order of its next post
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
    <div className="flex-1 bg-newBgColorInner p-[20px] mobile:p-[12px]">
      <div className="mx-auto w-full max-w-[560px] flex flex-col gap-[16px]">
        <div className="grid grid-cols-2 p-[4px] rounded-[12px] bg-btnSimple text-[14px] font-[600]">
          {(
            [
              ['open', `${t('manual_tab_open')} (${open.length})`],
              ['posted', t('manual_tab_posted')],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={clsx(
                'h-[36px] rounded-[9px] transition-colors',
                tab === key
                  ? 'bg-newBgColorInner text-newTextColor shadow-sm'
                  : 'text-textItemBlur'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {!shown.length && (
          <div className="py-[48px] text-center text-textItemBlur text-[15px]">
            {tab === 'open' ? t('manual_nothing_open') : t('manual_nothing_posted')}
          </div>
        )}
        {channels.map((channelPosts) => (
          <div key={channelPosts[0].channel.id} className="flex flex-col gap-[8px]">
            <div className="text-[15px] pt-[4px]">
              <ChannelName channel={channelPosts[0].channel} />
            </div>
            {channelPosts.map((post) => (
              <PostRow
                key={post.id}
                post={post}
                onOpen={() => onOpen(post.id)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const Step: FC<{
  number: number;
  title: string;
  done?: boolean;
  children: ReactNode;
}> = ({ number, title, done, children }) => (
  <div className="flex flex-col gap-[12px] p-[16px] rounded-[16px] border border-newBorder">
    <div className="flex items-center gap-[10px]">
      <div
        className={clsx(
          'w-[24px] h-[24px] rounded-full flex items-center justify-center text-[13px] font-[700] shrink-0',
          done ? 'bg-teal text-white' : 'bg-btnSimple text-btnText'
        )}
      >
        {done ? <CheckmarkIcon width={12} height={12} /> : number}
      </div>
      <div className="text-[16px] font-[600]">{title}</div>
    </div>
    {children}
  </div>
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
    return <div className="text-[14px] text-textItemBlur">{t('loading')}</div>;
  }
  if (!data?.length) {
    return (
      <div className="text-[14px] text-textItemBlur">
        {t('manual_metrics_pending')}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-[8px]">
      {data.map((metric) => (
        <div
          key={metric.label}
          className="p-[12px] rounded-[12px] bg-btnSimple flex flex-col gap-[2px]"
        >
          <div className="text-[12px] text-textItemBlur">{metric.label}</div>
          <div className="text-[22px] font-display font-bold tracking-tight">
            {new Intl.NumberFormat('de-DE').format(
              metric.data.reduce((sum, p) => sum + Number(p.total), 0)
            )}
          </div>
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
    toaster.show(t('manual_caption_copied'));
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

  const linkInput = (
    <input
      value={link}
      onChange={(e) => setLink(e.target.value)}
      placeholder={t('manual_link_placeholder')}
      inputMode="url"
      autoCapitalize="off"
      autoCorrect="off"
      className="w-full h-[44px] px-[14px] rounded-[10px] border border-newTableBorder bg-newBgColorInner text-[16px] outline-none focus:border-teal"
    />
  );

  return (
    <div className="flex-1 bg-newBgColorInner p-[20px] mobile:p-[12px]">
      <div className="mx-auto w-full max-w-[560px] flex flex-col gap-[16px]">
        <div className="flex items-center gap-[8px]">
          <button
            type="button"
            onClick={onBack}
            aria-label={t('back')}
            className="w-[40px] h-[40px] -ms-[8px] flex items-center justify-center rounded-[12px] text-textItemBlur hover:bg-boxHover"
          >
            <ChevronLeftIcon strokeWidth={1.5} />
          </button>
          <div className="flex-1 min-w-0 text-[15px]">
            <ChannelName channel={post.channel} />
          </div>
          <WhenBadge post={post} />
        </div>

        <div className="flex gap-[8px] overflow-x-auto snap-x snap-mandatory -mx-[12px] px-[12px] pb-[4px] scrollbar-none">
          {post.media.map((media) => {
            const item = loaded.find((p) => p.index === media.index);
            return (
              <div
                key={media.index}
                className={clsx(
                  'relative shrink-0 snap-center rounded-[12px] overflow-hidden bg-btnSimple aspect-[9/16]',
                  post.media.length === 1 ? 'w-full max-w-[320px] mx-auto' : 'w-[62%] max-w-[280px]'
                )}
              >
                {item?.type === 'image' && (
                  <img
                    src={item.url}
                    alt={media.name}
                    className="w-full h-full object-contain"
                  />
                )}
                {item?.type === 'video' && (
                  <video
                    src={item.url}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                )}
                {!item && !failed && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Spinner width={32} height={32} />
                  </div>
                )}
                {post.media.length > 1 && (
                  <div className="absolute top-[8px] start-[8px] px-[8px] h-[22px] rounded-full bg-black/60 text-white text-[12px] font-[600] flex items-center">
                    {media.index + 1}/{post.media.length}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {failed && (
          <div className="text-[14px] text-error">{t('manual_media_failed')}</div>
        )}

        <Step
          number={1}
          title={onlyVideo ? t('manual_step_save_video') : t('manual_step_save')}
          done={saved || posted}
        >
          <Button onClick={save} disabled={!ready} className="!h-[48px] w-full">
            {!ready
              ? t('manual_loading_media', {
                  loaded: loaded.length,
                  total: post.media.length,
                })
              : canShare
              ? t('manual_save_to_photos')
              : t('manual_download')}
          </Button>
          <div className="text-[13px] text-textItemBlur">
            {canShare || !ready
              ? t('manual_save_hint', { count: post.media.length })
              : t('manual_download_hint')}
          </div>
        </Step>

        <Step number={2} title={t('manual_step_caption')} done={copied || posted}>
          <div className="text-[14px] leading-[1.45] whitespace-pre-wrap break-words max-h-[180px] overflow-y-auto p-[12px] rounded-[10px] bg-btnSimple">
            {post.caption || t('manual_no_caption')}
          </div>
          <Button
            secondary={true}
            onClick={copyCaption}
            disabled={!post.caption}
            className="!h-[48px] w-full"
          >
            {copied ? t('manual_caption_copied') : t('manual_copy_caption')}
          </Button>
        </Step>

        {!posted ? (
          <Step number={3} title={t('manual_step_post')}>
            <div className="text-[13px] text-textItemBlur">
              {t('manual_post_hint')}
            </div>
            {linkInput}
            <Button
              onClick={() => request('POST', link)}
              loading={saving}
              className="!h-[48px] w-full !bg-teal !text-white"
            >
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
                className="text-[14px] text-teal underline break-all"
              >
                {post.releaseURL}
              </a>
            )}
            {post.linked ? (
              <Metrics postId={post.id} />
            ) : (
              <>
                <div className="text-[13px] text-textItemBlur">
                  {t('manual_not_linked_hint')}
                </div>
                {linkInput}
                <Button
                  secondary={true}
                  onClick={() => request('POST', link)}
                  loading={saving}
                  disabled={!link.trim()}
                  className="!h-[44px] w-full"
                >
                  {t('manual_save_link')}
                </Button>
              </>
            )}
            <button
              type="button"
              onClick={() => request('DELETE')}
              disabled={saving}
              className="self-start text-[13px] text-textItemBlur underline"
            >
              {t('manual_undo_posted')}
            </button>
          </Step>
        )}
      </div>
    </div>
  );
};

export const ManualPosting = () => {
  const fetch = useFetch();
  const t = useT();
  const router = useRouter();
  const postId = useSearchParams().get('post');

  const { data, isLoading, error, mutate } = useSWR(
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

  if (isLoading || error) {
    return (
      <div className="flex-1 bg-newBgColorInner flex items-center justify-center p-[20px] text-textItemBlur">
        {isLoading ? <LoadingComponent /> : t('manual_load_failed')}
      </div>
    );
  }

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
      posts={data || []}
      onOpen={(id) => router.push(`/manual?post=${id}`)}
    />
  );
};
