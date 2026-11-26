'use client';

import { FC, useId, useState } from 'react';
import useSWR from 'swr';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import {
  BanknoteIcon,
  CalendarCheckIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  ExternalLinkIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  UserRoundIcon,
} from 'lucide-react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { useT } from '@vibeschedule/react/translation/get.transation.service.client';
import type { ClipperOffer } from '@vibeschedule/helpers/clippers/clipper.offer';
import { responseMessage } from '@vibeschedule/frontend/lib/response-message';
import { CLIPPER_TERMS_URL } from '@vibeschedule/frontend/components/clippers/clipper.guide';
import { Alert, AlertTitle } from '@vibeschedule/frontend/components/ui/alert';
import { Button } from '@vibeschedule/frontend/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@vibeschedule/frontend/components/ui/card';
import { Checkbox } from '@vibeschedule/frontend/components/ui/checkbox';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@vibeschedule/frontend/components/ui/field';
import { Input } from '@vibeschedule/frontend/components/ui/input';
import { Skeleton } from '@vibeschedule/frontend/components/ui/skeleton';
import { Spinner } from '@vibeschedule/frontend/components/ui/spinner';
import { Textarea } from '@vibeschedule/frontend/components/ui/textarea';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@vibeschedule/frontend/components/ui/toggle-group';

const euro = (cents: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);

type Inputs = {
  name: string;
  age: string;
  email: string;
  phone: string;
  device: 'iphone' | 'android' | '';
  accounts: number;
  experience: string;
  source: string;
  password: string;
  terms: boolean;
  website: string;
};

const Offer: FC<{ offer: ClipperOffer }> = ({ offer }) => {
  const t = useT();
  const points = [
    {
      icon: BanknoteIcon,
      title: t('clipping_offer_pay', { fee: euro(offer.feeCents) }),
      text: t('clipping_offer_pay_text', {
        max: offer.maxAccounts,
        total: euro(offer.feeCents * offer.maxAccounts),
      }),
    },
    {
      icon: CalendarCheckIcon,
      title: t('clipping_offer_posts', { count: offer.postsPerDay }),
      text: t('clipping_offer_posts_text', {
        free: offer.freeMissedPosts,
        penalty: euro(offer.missedPostPenaltyCents),
      }),
    },
    {
      icon: UserRoundIcon,
      title: t('clipping_offer_profiles'),
      text: t('clipping_offer_profiles_text', {
        days: offer.warmupDays,
        minutes: offer.warmupMinutes,
      }),
    },
    {
      icon: ShieldCheckIcon,
      title: t('clipping_offer_safe'),
      text: t('clipping_offer_safe_text'),
    },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('clipping_offer_title')}</CardTitle>
        <CardDescription>{t('clipping_offer_description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-4">
          {points.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="size-4" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium">{title}</span>
                <span className="text-sm text-muted-foreground">{text}</span>
              </span>
            </li>
          ))}
        </ul>
        <Button
          variant="outline"
          className="h-10 self-start md:h-9"
          nativeButton={false}
          render={
            <a href={CLIPPER_TERMS_URL} target="_blank" rel="noreferrer" />
          }
        >
          <ExternalLinkIcon data-icon="inline-start" />
          {t('clipping_terms_read')}
        </Button>
      </CardContent>
    </Card>
  );
};

const Steps: FC = () => {
  const t = useT();
  const steps = [1, 2, 3, 4].map((n) => ({
    title: t(`clipping_step_${n}`),
    text: t(`clipping_step_${n}_text`),
  }));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('clipping_steps_title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-4">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-medium tabular-nums">
                {i + 1}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium">{step.title}</span>
                <span className="text-sm text-muted-foreground">
                  {step.text}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
};

const ApplyForm: FC<{ offer: ClipperOffer; onDone: () => void }> = ({
  offer,
  onDone,
}) => {
  const t = useT();
  const id = useId();
  const fetch = useFetch();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Inputs>({
    defaultValues: {
      name: '',
      age: '',
      email: '',
      phone: '',
      device: '',
      accounts: offer.maxAccounts,
      experience: '',
      source: '',
      password: '',
      terms: false,
      website: '',
    },
  });

  const submit: SubmitHandler<Inputs> = async (data) => {
    setError(null);
    const response = await fetch('/clipping/apply', {
      method: 'POST',
      body: JSON.stringify({ ...data, age: Number(data.age) }),
    });
    if (!response.ok) {
      setError(
        response.status === 429
          ? t('clipping_too_many')
          : (await responseMessage(response)) || t('clipping_failed')
      );
      return;
    }
    onDone();
  };

  const field = (name: keyof Inputs) => ({
    id: `${id}-${name}`,
    'aria-invalid': !!errors[name] || undefined,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('clipping_form_title')}</CardTitle>
        <CardDescription>{t('clipping_form_description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(submit)} noValidate>
          <FieldGroup className="gap-5">
            <div className="grid gap-5 sm:grid-cols-[1fr_7rem]">
              <Field data-invalid={!!errors.name || undefined}>
                <FieldLabel htmlFor={`${id}-name`}>
                  {t('clipping_name')}
                </FieldLabel>
                <Input
                  {...field('name')}
                  autoComplete="name"
                  className="h-10"
                  {...register('name', { required: true, minLength: 2 })}
                />
                {errors.name && (
                  <FieldError>{t('clipping_name_required')}</FieldError>
                )}
              </Field>
              <Field data-invalid={!!errors.age || undefined}>
                <FieldLabel htmlFor={`${id}-age`}>
                  {t('clipping_age')}
                </FieldLabel>
                <Input
                  {...field('age')}
                  inputMode="numeric"
                  className="h-10"
                  {...register('age', {
                    required: true,
                    validate: (v) => Number(v) >= 13 && Number(v) <= 99,
                  })}
                />
                {errors.age && (
                  <FieldError>{t('clipping_age_invalid')}</FieldError>
                )}
              </Field>
            </div>
            <Field data-invalid={!!errors.email || undefined}>
              <FieldLabel htmlFor={`${id}-email`}>
                {t('label_email')}
              </FieldLabel>
              <Input
                {...field('email')}
                type="email"
                autoComplete="email"
                className="h-10"
                {...register('email', {
                  required: true,
                  pattern: /\S+@\S+\.\S+/,
                })}
              />
              <FieldDescription>{t('clipping_email_hint')}</FieldDescription>
              {errors.email && (
                <FieldError>{t('clipping_email_invalid')}</FieldError>
              )}
            </Field>
            <Field data-invalid={!!errors.phone || undefined}>
              <FieldLabel htmlFor={`${id}-phone`}>
                {t('clipping_phone')}
              </FieldLabel>
              <Input
                {...field('phone')}
                type="tel"
                autoComplete="tel"
                placeholder="+49 151 …"
                className="h-10"
                {...register('phone', {
                  required: true,
                  pattern: /^\+?[\d\s/()-]{6,30}$/,
                })}
              />
              {errors.phone && (
                <FieldError>{t('clipping_phone_invalid')}</FieldError>
              )}
            </Field>
            <Field data-invalid={!!errors.device || undefined}>
              <FieldLabel>{t('clipping_device')}</FieldLabel>
              <Controller
                control={control}
                name="device"
                rules={{ required: true }}
                render={({ field: { value, onChange } }) => (
                  <ToggleGroup
                    value={value ? [value] : []}
                    onValueChange={(v) => v.length && onChange(v[0])}
                    variant="outline"
                    className="w-full"
                  >
                    <ToggleGroupItem value="iphone" className="h-10 flex-1">
                      <SmartphoneIcon />
                      iPhone
                    </ToggleGroupItem>
                    <ToggleGroupItem value="android" className="h-10 flex-1">
                      <SmartphoneIcon />
                      Android
                    </ToggleGroupItem>
                  </ToggleGroup>
                )}
              />
              {errors.device && (
                <FieldError>{t('clipping_device_required')}</FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel>{t('clipping_accounts')}</FieldLabel>
              <Controller
                control={control}
                name="accounts"
                render={({ field: { value, onChange } }) => (
                  <ToggleGroup
                    value={[String(value)]}
                    onValueChange={(v) => v.length && onChange(Number(v[0]))}
                    variant="outline"
                    className="w-full"
                  >
                    {Array.from(
                      { length: offer.maxAccounts },
                      (_, i) => i + 1
                    ).map((n) => (
                      <ToggleGroupItem
                        key={n}
                        value={String(n)}
                        className="h-10 flex-1 tabular-nums"
                      >
                        {n}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                )}
              />
              <FieldDescription>{t('clipping_accounts_hint')}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-experience`}>
                {t('clipping_experience')}
              </FieldLabel>
              <Textarea
                id={`${id}-experience`}
                rows={3}
                placeholder={t('clipping_experience_placeholder')}
                {...register('experience')}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-source`}>
                {t('clipping_source')}
              </FieldLabel>
              <Input
                id={`${id}-source`}
                className="h-10"
                {...register('source')}
              />
            </Field>
            <Field data-invalid={!!errors.password || undefined}>
              <FieldLabel htmlFor={`${id}-password`}>
                {t('clipping_password')}
              </FieldLabel>
              <Input
                {...field('password')}
                type="password"
                autoComplete="new-password"
                className="h-10"
                {...register('password', { required: true, minLength: 8 })}
              />
              <FieldDescription>{t('clipping_password_hint')}</FieldDescription>
              {errors.password && (
                <FieldError>{t('clipping_password_invalid')}</FieldError>
              )}
            </Field>
            {/* left empty by people, bots fill it */}
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="hidden"
              {...register('website')}
            />
            <Field
              orientation="horizontal"
              data-invalid={!!errors.terms || undefined}
            >
              <Controller
                control={control}
                name="terms"
                rules={{ validate: (v) => v }}
                render={({ field: { value, onChange } }) => (
                  <Checkbox
                    id={`${id}-terms`}
                    checked={value}
                    onCheckedChange={(checked) => onChange(!!checked)}
                    aria-invalid={!!errors.terms || undefined}
                  />
                )}
              />
              <FieldLabel htmlFor={`${id}-terms`} className="font-normal">
                <span>
                  {t('clipping_terms_accept')}{' '}
                  <a
                    href={CLIPPER_TERMS_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4"
                  >
                    {t('clipping_terms_link')}
                  </a>{' '}
                  {t('clipping_terms_accept_end')}
                </span>
              </FieldLabel>
            </Field>
            {errors.terms && (
              <FieldError>{t('clipping_terms_required')}</FieldError>
            )}
            {error && (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertTitle>{error}</AlertTitle>
              </Alert>
            )}
            <Button
              type="submit"
              className="h-11 w-full"
              disabled={isSubmitting}
            >
              {isSubmitting && <Spinner data-icon="inline-start" />}
              {t('clipping_submit')}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};

// The public page /clipping: what we offer, how it works and the application
export const ClippingApply: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const [sent, setSent] = useState(false);
  const { data: offer, error } = useSWR(
    '/clipping/offer',
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error();
      }
      return (await response.json()) as ClipperOffer;
    }
  );

  return (
    <div className="min-h-dvh bg-muted/40">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-8 md:py-12">
        <div className="flex items-center gap-2.5">
          <img
            src="/brand/mark-light.png"
            alt=""
            width={32}
            height={32}
            className="size-8 rounded-lg dark:hidden"
          />
          <img
            src="/brand/mark-dark.png"
            alt=""
            width={32}
            height={32}
            className="hidden size-8 rounded-lg dark:block"
          />
          <span className="font-heading text-lg font-semibold tracking-tight">
            VibeLabs Clipping
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance md:text-3xl">
            {offer
              ? t('clipping_title', {
                  total: euro(offer.feeCents * offer.maxAccounts),
                })
              : t('clipping_title_plain')}
          </h1>
          <p className="text-muted-foreground text-pretty">
            {t('clipping_intro')}
          </p>
        </div>

        {error ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>{t('clipping_load_failed')}</AlertTitle>
          </Alert>
        ) : !offer ? (
          <Skeleton className="h-96 w-full" />
        ) : sent ? (
          <Card>
            <CardHeader className="items-center text-center">
              <CircleCheckIcon className="mx-auto size-10 text-primary" />
              <CardTitle className="text-lg">
                {t('clipping_sent_title')}
              </CardTitle>
              <CardDescription>{t('clipping_sent_text')}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <Offer offer={offer} />
            <Steps />
            <ApplyForm offer={offer} onDone={() => setSent(true)} />
          </>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {t('clipping_have_login')}{' '}
          <a
            href="/auth/login"
            className="font-medium text-foreground underline underline-offset-4"
          >
            {t('sign_in_1')}
          </a>
        </p>
      </div>
    </div>
  );
};
