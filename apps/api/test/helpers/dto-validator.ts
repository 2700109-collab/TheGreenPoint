import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';

/**
 * Validate DTO and return errors. Uses class-transformer to instantiate.
 */
export async function validateDto<T extends object>(
  DtoClass: new () => T,
  data: Partial<Record<string, unknown>>,
): Promise<ValidationError[]> {
  const instance = plainToInstance(DtoClass, data);
  return validate(instance, { whitelist: true, forbidNonWhitelisted: false });
}

/**
 * Assert that a DTO payload is valid (no errors).
 */
export async function expectValid<T extends object>(
  DtoClass: new () => T,
  data: Partial<Record<string, unknown>>,
): Promise<void> {
  const errors = await validateDto(DtoClass, data);
  if (errors.length > 0) {
    const msgs = errors.map((e) => `${e.property}: ${JSON.stringify(e.constraints)}`);
    throw new Error(`Expected valid DTO but got errors:\n${msgs.join('\n')}`);
  }
}

/**
 * Assert that a DTO payload is invalid and the specified properties have errors.
 */
export async function expectInvalid<T extends object>(
  DtoClass: new () => T,
  data: Partial<Record<string, unknown>>,
  expectedProperties?: string[],
): Promise<ValidationError[]> {
  const errors = await validateDto(DtoClass, data);
  if (errors.length === 0) {
    throw new Error('Expected invalid DTO but got no errors');
  }
  if (expectedProperties) {
    const errorProperties = errors.map((e) => e.property);
    for (const prop of expectedProperties) {
      if (!errorProperties.includes(prop)) {
        throw new Error(
          `Expected error on property "${prop}" but errors were on: ${errorProperties.join(', ')}`,
        );
      }
    }
  }
  return errors;
}
