import { Transform } from 'class-transformer';
import { ClipperTaskKind } from '@prisma/client';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  CLIPPER_DEVICES,
  ClipperDevice,
  MAX_OFFER_ACCOUNTS,
} from '@vibeschedule/helpers/clippers/clipper.offer';
import {
  TASK_DESCRIPTION_MAX,
  TASK_TITLE_MAX,
} from '@vibeschedule/helpers/clippers/clipper.tasks';
import { MAX_CLIPPER_ACCOUNTS } from '@vibeschedule/nestjs-libraries/dtos/settings/add.team.member.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// the application on the public page /clipping
export class ApplyDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @Transform(trim)
  @IsEmail({}, { message: 'Gib eine gültige E-Mail-Adresse an' })
  @MaxLength(200)
  email: string;

  // WhatsApp, digits with an optional + and spaces
  @Transform(trim)
  @Matches(/^\+?[\d\s/()-]{6,30}$/, {
    message: 'Gib eine gültige WhatsApp-Nummer an',
  })
  phone: string;

  @IsInt()
  @Min(13)
  @Max(99)
  age: number;

  @IsIn(CLIPPER_DEVICES)
  device: ClipperDevice;

  @IsInt()
  @Min(1)
  @Max(MAX_OFFER_ACCOUNTS)
  accounts: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  experience?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  source?: string;

  @IsString()
  @MinLength(8, { message: 'Das Passwort braucht mindestens 8 Zeichen' })
  @MaxLength(200)
  password: string;

  @Equals(true, { message: 'Bitte stimm der Vereinbarung zu' })
  terms: boolean;

  // left empty by people, filled by bots
  @IsOptional()
  @IsString()
  website?: string;
}

export class AcceptApplicationDto {
  @IsInt()
  @Min(1)
  @Max(MAX_CLIPPER_ACCOUNTS)
  accounts: number;
}

// the profile we hand out for one account
export class ClipperProfileDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(30)
  name?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().replace(/^@+/, '') : value
  )
  @Matches(/^$|^[A-Za-z0-9._]{2,24}$/, {
    message: 'Der Username darf nur Buchstaben, Zahlen, Punkt und _ enthalten',
  })
  username?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  bio?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  topic?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  searchTerms?: string;
}

export class PayoutDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(50)
  iban: string;
}

export class FypDto {
  @IsIn([true, false])
  ok: boolean;
}

// a task for one account, PROFILE without a title gets the default one
export class ClipperTaskDto {
  @IsOptional()
  @IsIn(Object.values(ClipperTaskKind))
  kind?: ClipperTaskKind;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(TASK_TITLE_MAX)
  title?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(TASK_DESCRIPTION_MAX)
  description?: string;
}

export class ClipperTaskUpdateDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(TASK_TITLE_MAX)
  title?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(TASK_DESCRIPTION_MAX)
  description?: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;
}

export class TaskDoneDto {
  @IsBoolean()
  done: boolean;
}
