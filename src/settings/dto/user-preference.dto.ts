import { IsString, IsObject, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { UserPreferences } from '../entities/user-preference.entity';

export class CreateUserPreferenceDto {
  @IsString()
  userId: string;

  @IsObject()
  preferences: UserPreferences;

  @IsString()
  @IsOptional()
  createdBy?: string;
}

export class UpdateUserPreferenceDto extends PartialType(
  CreateUserPreferenceDto,
) {}
