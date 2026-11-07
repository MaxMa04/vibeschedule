import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4'];

@ValidatorConstraint({ name: 'checkValidExtension', async: false })
export class ValidUrlExtension implements ValidatorConstraintInterface {
  validate(text: string) {
    const path = String(text || '')
      .split('?')[0]
      .toLowerCase();
    return EXTENSIONS.some((ext) => path.endsWith(ext));
  }

  defaultMessage() {
    return `Erlaubte Dateitypen: ${EXTENSIONS.join(', ')}`;
  }
}

// Post for Me fetches the media from these URLs, so it must be in our bucket
@ValidatorConstraint({ name: 'checkValidPath', async: false })
export class ValidUrlPath implements ValidatorConstraintInterface {
  validate(text: string) {
    return String(text || '').startsWith(
      `${process.env.CLOUDFLARE_BUCKET_URL}/`
    );
  }

  defaultMessage() {
    return 'Medien müssen über die Mediathek hochgeladen werden.';
  }
}
