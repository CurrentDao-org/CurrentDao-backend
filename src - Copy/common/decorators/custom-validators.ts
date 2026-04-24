/**
 * Custom Validation Decorators
 * 
 * Provides custom validators for business logic and domain-specific validation.
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * IsGreaterThan decorator - validates that a number is greater than another field
 */
export function IsGreaterThan(property: string, validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'isGreaterThan',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: IsGreaterThanConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isGreaterThan' })
export class IsGreaterThanConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    
    if (relatedValue === undefined || relatedValue === null) {
      return true;
    }
    
    return typeof value === 'number' && typeof relatedValue === 'number' && value > relatedValue;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `$property must be greater than ${relatedPropertyName}`;
  }
}

/**
 * IsLessThan decorator - validates that a number is less than another field
 */
export function IsLessThan(property: string, validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'isLessThan',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: IsLessThanConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isLessThan' })
export class IsLessThanConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    
    if (relatedValue === undefined || relatedValue === null) {
      return true;
    }
    
    return typeof value === 'number' && typeof relatedValue === 'number' && value < relatedValue;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `$property must be less than ${relatedPropertyName}`;
  }
}

/**
 * IsValidEnergyPrice decorator - validates energy price is within acceptable range
 */
export function IsValidEnergyPrice(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'isValidEnergyPrice',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsValidEnergyPriceConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidEnergyPrice' })
export class IsValidEnergyPriceConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'number') {
      return false;
    }
    
    // Energy price must be between 0.01 and 1000
    return value >= 0.01 && value <= 1000;
  }

  defaultMessage() {
    return 'Energy price must be between 0.01 and 1000';
  }
}

/**
 * IsValidWalletAddress decorator - validates Stellar wallet address format
 */
export function IsValidWalletAddress(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'isValidWalletAddress',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsValidWalletAddressConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidWalletAddress' })
export class IsValidWalletAddressConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'string') {
      return false;
    }
    
    // Stellar public keys start with 'G' and are 56 characters long
    return value.startsWith('G') && value.length === 56;
  }

  defaultMessage() {
    return 'Invalid Stellar wallet address format';
  }
}

/**
 * IsValidTransactionHash decorator - validates Stellar transaction hash format
 */
export function IsValidTransactionHash(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'isValidTransactionHash',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsValidTransactionHashConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidTransactionHash' })
export class IsValidTransactionHashConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'string') {
      return false;
    }
    
    // Transaction hashes are 64 character hex strings
    return /^[a-f0-9]{64}$/.test(value);
  }

  defaultMessage() {
    return 'Invalid transaction hash format';
  }
}

/**
 * IsValidPercentage decorator - validates percentage value (0-100)
 */
export function IsValidPercentage(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'isValidPercentage',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsValidPercentageConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidPercentage' })
export class IsValidPercentageConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'number') {
      return false;
    }
    
    return value >= 0 && value <= 100;
  }

  defaultMessage() {
    return 'Percentage must be between 0 and 100';
  }
}

/**
 * Match decorator - validates that two fields match
 */
export function Match(property: string, validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'match',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: MatchConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'match' })
export class MatchConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    
    return value === relatedValue;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `Field does not match ${relatedPropertyName}`;
  }
}

/**
 * IsNotInFuture decorator - validates that date is not in the future
 */
export function IsNotInFuture(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'isNotInFuture',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsNotInFutureConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isNotInFuture' })
export class IsNotInFutureConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (!value) {
      return true;
    }
    
    const date = new Date(value);
    return date <= new Date();
  }

  defaultMessage() {
    return 'Date cannot be in the future';
  }
}

/**
 * IsNotInPast decorator - validates that date is not in the past
 */
export function IsNotInPast(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'isNotInPast',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsNotInPastConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isNotInPast' })
export class IsNotInPastConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (!value) {
      return true;
    }
    
    const date = new Date(value);
    return date >= new Date();
  }

  defaultMessage() {
    return 'Date cannot be in the past';
  }
}
/**
 * Custom Validation Decorators
 * 
 * Provides custom validators for business logic and domain-specific validation.
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  IsString,
  IsOptional,
} from 'class-validator';

/**
 * IsGreaterThan decorator - validates that a number is greater than another field
 */
export function IsGreaterThan(property: string, validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'isGreaterThan',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: IsGreaterThanConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isGreaterThan' })
export class IsGreaterThanConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    
    if (relatedValue === undefined || relatedValue === null) {
      return true;
    }
    
    return typeof value === 'number' && typeof relatedValue === 'number' && value > relatedValue;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `$property must be greater than ${relatedPropertyName}`;
  }
}

/**
 * IsLessThan decorator - validates that a number is less than another field
 */
export function IsLessThan(property: string, validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'isLessThan',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: IsLessThanConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isLessThan' })
export class IsLessThanConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    
    if (relatedValue === undefined || relatedValue === null) {
      return true;
    }
    
    return typeof value === 'number' && typeof relatedValue === 'number' && value < relatedValue;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `$property must be less than ${relatedPropertyName}`;
  }
}

/**
 * IsValidEnergyPrice decorator - validates energy price is within acceptable range
 */
export function IsValidEnergyPrice(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'isValidEnergyPrice',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsValidEnergyPriceConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidEnergyPrice' })
export class IsValidEnergyPriceConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'number') {
      return false;
    }
    
    // Energy price must be between 0.01 and 1000
    return value >= 0.01 && value <= 1000;
  }

  defaultMessage() {
    return 'Energy price must be between 0.01 and 1000';
  }
}

/**
 * IsValidWalletAddress decorator - validates Stellar wallet address format
 */
export function IsValidWalletAddress(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'isValidWalletAddress',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsValidWalletAddressConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidWalletAddress' })
export class IsValidWalletAddressConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'string') {
      return false;
    }
    
    // Stellar public keys start with 'G' and are 56 characters long
    return value.startsWith('G') && value.length === 56;
  }

  defaultMessage() {
    return 'Invalid Stellar wallet address format';
  }
}

/**
 * IsValidTransactionHash decorator - validates Stellar transaction hash format
 */
export function IsValidTransactionHash(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'isValidTransactionHash',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsValidTransactionHashConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidTransactionHash' })
export class IsValidTransactionHashConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'string') {
      return false;
    }
    
    // Transaction hashes are 64 character hex strings
    return /^[a-f0-9]{64}$/.test(value);
  }

  defaultMessage() {
    return 'Invalid transaction hash format';
  }
}

/**
 * IsValidPercentage decorator - validates percentage value (0-100)
 */
export function IsValidPercentage(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'isValidPercentage',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsValidPercentageConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidPercentage' })
export class IsValidPercentageConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'number') {
      return false;
    }
    
    return value >= 0 && value <= 100;
  }

  defaultMessage() {
    return 'Percentage must be between 0 and 100';
  }
}

/**
 * IsValidCurrency decorator - validates currency code (ISO 4217)
 */
export function IsValidCurrency(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'isValidCurrency',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsValidCurrencyConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidCurrency' })
export class IsValidCurrencyConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'string') {
      return false;
    }
    
    // Common currency codes
    const validCurrencies = [
      'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD', 'CAD', 'CHF', 'HKD', 'SGD',
      'SEK', 'KRW', 'NOK', 'NZD', 'INR', 'MXN', 'TWD', 'ZAR', 'BRL', 'DKK',
      'PLN', 'THB', 'IDR', 'HUF', 'CZK', 'ILS', 'CLP', 'PHP', 'AED', 'SAR',
    ];
    
    return validCurrencies.includes(value.toUpperCase());
  }

  defaultMessage() {
    return 'Invalid currency code';
  }
}

/**
 * Match decorator - validates that two fields match
 */
export function Match(property: string, validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'match',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: MatchConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'match' })
export class MatchConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    
    return value === relatedValue;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `Field does not match ${relatedPropertyName}`;
  }
}

/**
 * IsNotInFuture decorator - validates that date is not in the future
 */
export function IsNotInFuture(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'isNotInFuture',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsNotInFutureConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isNotInFuture' })
export class IsNotInFutureConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (!value) {
      return true;
    }
    
    const date = new Date(value);
    return date <= new Date();
  }

  defaultMessage() {
    return 'Date cannot be in the future';
  }
}

/**
 * IsNotInPast decorator - validates that date is not in the past
 */
export function IsNotInPast(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'isNotInPast',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsNotInPastConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isNotInPast' })
export class IsNotInPastConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (!value) {
      return true;
    }
    
    const date = new Date(value);
    return date >= new Date();
  }

  defaultMessage() {
    return 'Date cannot be in the past';
  }
}
