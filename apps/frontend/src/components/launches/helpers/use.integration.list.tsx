'use client';

import { useChannelList } from '@vibeschedule/frontend/lib/shared-data';

export const useIntegrationList = () => {
  const result = useChannelList();
  return { ...result, data: result.data ?? [] };
};
