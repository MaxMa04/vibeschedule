import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import striptags from 'striptags';

// A post needs text or at least one image
@ValidatorConstraint({ name: 'validateContent', async: false })
export class ValidContent implements ValidatorConstraintInterface {
  validate(contentRaw: string, args: ValidationArguments) {
    const { image } = args.object as { image?: unknown[] };
    return (
      (Array.isArray(image) && image.length > 0) ||
      striptags(contentRaw || '').trim() !== ''
    );
  }

  defaultMessage() {
    return 'Der Beitrag braucht Text oder mindestens ein Bild.';
  }
}
