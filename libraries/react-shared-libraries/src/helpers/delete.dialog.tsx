import i18next from '@vibeschedule/react/translation/i18next';
import { areYouSure } from '@vibeschedule/frontend/components/layout/new-modal';

export const deleteDialog = async (
  message: string,
  confirmButton?: string,
  title?: string,
  cancelButton?: string,
  destructive?: boolean
) => {
  return areYouSure({
    title: title || i18next.t('are_you_sure'),
    description: message,
    approveLabel: confirmButton || i18next.t('yes_delete_it'),
    cancelLabel: cancelButton || i18next.t('no_cancel'),
    destructive,
  });
};
