import { useIntegration } from '@vibeschedule/frontend/components/launches/helpers/use.integration';
import clsx from 'clsx';
import { VideoOrImage } from '@vibeschedule/react/helpers/video.or.image';
import { FC } from 'react';
import { textSlicer } from '@vibeschedule/helpers/utils/count.length';
import SafeImage from '@vibeschedule/react/helpers/safe.image';
import { useLaunchStore } from '@vibeschedule/frontend/components/new-launch/store';
import { stripHtmlValidation } from '@vibeschedule/helpers/utils/strip.html.validation';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';

// the post text as preview html, the part over the channel limit is marked
export const usePreviewHtml = (maximumCharacters?: number) => {
  const { value, integration } = useIntegration();
  const t = useT();
  const content = stripHtmlValidation('normal', value[0].content, true);
  const { start, end } = textSlicer(
    integration?.identifier || '',
    maximumCharacters || 10000,
    content
  );
  return (
    content.slice(start, end) +
    `<mark class="bg-error text-white" data-tooltip-id="tooltip" data-tooltip-content="${t(
      'text_will_be_cropped'
    )}">` +
    content.slice(end) +
    `</mark>`
  );
};

export const GeneralPreviewComponent: FC<{
  maximumCharacters?: number;
}> = (props) => {
  const { value, integration } = useIntegration();
  const current = useLaunchStore((state) => state.current);
  const t = useT();
  const post = value[0];
  const html = usePreviewHtml(props.maximumCharacters);

  return (
    <div className="w-full p-[15px]">
      <div className="flex gap-[8px] pb-[12px]">
        <div className="relative min-w-[40px] h-[40px] w-[40px]">
          <img
            src={
              current === 'global'
                ? '/no-picture.jpg'
                : integration?.picture || '/no-picture.jpg'
            }
            alt=""
            className="rounded-full"
          />
          {current !== 'global' && (
            <SafeImage
              src={`/icons/platforms/${integration?.identifier}.png`}
              className="min-w-[20px] min-h-[20px] rounded-full absolute z-10 -bottom-[5px] -end-[5px] border border-fifth"
              alt={integration!.identifier}
              width={20}
              height={20}
            />
          )}
        </div>
        <div className="flex-1 flex flex-col gap-[4px] min-w-0">
          <div className="flex gap-[4px]">
            <div className="h-[22px] text-[15px] font-[700]">
              {current === 'global' ? t('global_edit') : integration?.name}
            </div>
            {current !== 'global' && (
              <div className="text-[15px] text-ink-3">
                {integration?.display}
              </div>
            )}
          </div>
          <div
            dir="auto"
            className="text-wrap whitespace-pre preview"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {!!post.image?.length && (
            <div
              className={clsx(
                'w-full rounded-[16px] overflow-hidden mt-[12px]',
                post.image.length > 3
                  ? 'grid grid-cols-2 gap-[4px]'
                  : 'flex gap-[4px]'
              )}
            >
              {post.image.map((image, index) => (
                <a
                  key={`image_${index}`}
                  className="flex-1"
                  href={image.path}
                  target="_blank"
                  rel="noreferrer"
                >
                  <VideoOrImage autoplay={true} src={image.path} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
