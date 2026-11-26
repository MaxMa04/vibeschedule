'use client';

import { FC } from 'react';
import { Editor } from '@tiptap/react';
import { BoldIcon } from 'lucide-react';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import { ToolbarButton } from '@vibeschedule/frontend/components/new-launch/toolbar.button';

// bold and underline are exclusive, the backend turns each into its own
// unicode letters
export const BoldText: FC<{ editor: Editor | null; disabled?: boolean }> = ({
  editor,
  disabled,
}) => {
  const t = useT();
  return (
    <ToolbarButton
      label={t('bold_text')}
      active={!!editor?.isActive('bold')}
      disabled={disabled}
      onClick={() =>
        editor?.chain().focus().unsetUnderline().toggleBold().run()
      }
    >
      <BoldIcon />
    </ToolbarButton>
  );
};
