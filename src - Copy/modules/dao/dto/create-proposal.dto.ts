import { IsNumber, IsString, Min } from 'class-validator';

export class CreateProposalDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  location: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  proposerId: string;
}
