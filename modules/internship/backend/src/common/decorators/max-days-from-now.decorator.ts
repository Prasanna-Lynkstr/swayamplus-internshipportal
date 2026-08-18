import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

/**
 * class-validator's built-in date decorators only check format/relative-to-now
 * at the type level, not "no further than N days out" — this is a thin
 * custom constraint for that, e.g. capping an internship's application
 * deadline to 90 days from whenever the request actually arrives.
 */
export function MaxDaysFromNow(maxDays: number, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'maxDaysFromNow',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [maxDays],
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          if (typeof value !== 'string') return false;
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) return false;

          const [max] = args.constraints as [number];
          const maxDate = new Date();
          maxDate.setDate(maxDate.getDate() + max);
          return date.getTime() <= maxDate.getTime();
        },
        defaultMessage(args: ValidationArguments): string {
          const [max] = args.constraints as [number];
          return `${args.property} must not be more than ${max} days from today.`;
        },
      },
    });
  };
}
