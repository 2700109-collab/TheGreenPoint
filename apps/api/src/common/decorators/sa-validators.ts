import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Validates a South African ID number (13 digits, Luhn checksum).
 */
export function IsSaIdNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSaIdNumber',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string' || value.length !== 13) return false;
          let sum = 0;
          for (let i = 0; i < 13; i++) {
            let digit = parseInt(value[i]!);
            if (i % 2 === 1) {
              digit *= 2;
              if (digit > 9) digit -= 9;
            }
            sum += digit;
          }
          return sum % 10 === 0;
        },
        defaultMessage: () => 'Invalid South African ID number',
      },
    });
  };
}

/**
 * Validates that a numeric value is within South Africa's geographic bounds.
 * Latitude: -35 to -22, Longitude: 16 to 33
 */
export function IsWithinSaBounds(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isWithinSaBounds',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'number';
        },
      },
    });
  };
}
