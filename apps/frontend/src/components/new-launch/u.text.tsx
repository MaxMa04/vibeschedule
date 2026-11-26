'use client';

import { FC } from 'react';
import { Editor } from '@tiptap/react';
import { UnderlineIcon } from 'lucide-react';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { ToolbarButton } from '@vibeschedule/frontend/components/new-launch/toolbar.button';

export const UText: FC<{ editor: Editor | null; disabled?: boolean }> = ({
  editor,
  disabled,
}) => {
  const t = useT();
  return (
    <ToolbarButton
      label={t('underline_text')}
      active={!!editor?.isActive('underline')}
      disabled={disabled}
      onClick={() =>
        editor?.chain().focus().unsetBold().toggleUnderline().run()
      }
    >
      <UnderlineIcon />
    </ToolbarButton>
  );
};
