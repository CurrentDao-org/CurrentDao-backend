import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsValidPriceRange(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidPriceRange',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          if (typeof value !== 'object' || value === null) return false;
          const valueObj = value as Record<string, unknown>;
          for (const [_key, range] of Object.entries(valueObj)) {
            if (typeof range !== 'object' || range === null) return false;
            const { min, max } = range as { min: number; max: number };
            if (
              typeof min !== 'number' ||
              typeof max !== 'number' ||
              min >= max ||
              min < 0 ||
              max < 0
            )
              return false;
          }
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return 'Each price range must have valid min and max numbers with min < max and >= 0';
        },
      },
    });
  };
}
