'use client';

import useSWR from 'swr';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import type { OnboardingState } from '@vibeschedule/frontend/components/clippers/clipper.types';

export const ONBOARDING_KEY = '/onboarding';

export const useOnboarding = () => {
  const fetch = useFetch();
  return useSWR(ONBOARDING_KEY, async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error();
    }
    return (await response.json()) as OnboardingState | null;
  });
};

/** steps done and all steps, the payout included */
export const onboardingProgress = (state: OnboardingState) => {
  const tasks = state.accounts.flatMap((a) =>
    a.plan.tasks.filter((task) => task.key !== 'post')
  );
  return {
    done:
      tasks.filter((task) => task.state === 'done').length +
      (state.payout.done ? 1 : 0),
    total: tasks.length + 1,
  };
};
