import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

/**
 * Same shape as MaxDaysFromNow but also rejects a past date — for fields
 * where "today or later, but not too far out" both need enforcing (e.g. a
 * student's available-from date: today through +60 days). Compares by
 * calendar day, not exact timestamp, so "today" always passes regardless of
 * what time the request arrives.
 */
export function IsDateWithinDays(maxDays: number, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDateWithinDays',
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
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const maxDate = new Date();
          maxDate.setHours(0, 0, 0, 0);
          maxDate.setDate(maxDate.getDate() + max);

          return date.getTime() >= today.getTime() && date.getTime() <= maxDate.getTime();
        },
        defaultMessage(args: ValidationArguments): string {
          const [max] = args.constraints as [number];
          return `${args.property} must be today or within the next ${max} days.`;
        },
      },
    });
  };
}
