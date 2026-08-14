import { ApiProperty } from '@nestjs/swagger';
import { CONTACT_ROLES, CONTACT_TOPICS, type ContactRole, type ContactTopic } from '@repo/shared';
import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateContactInquiryDto {
  @ApiProperty({ example: 'Armen Petrosyan', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'you@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ enum: CONTACT_ROLES, example: 'guest' })
  @IsIn(CONTACT_ROLES)
  role!: ContactRole;

  @ApiProperty({ enum: CONTACT_TOPICS, example: 'booking' })
  @IsIn(CONTACT_TOPICS)
  topic!: ContactTopic;

  @ApiProperty({ minLength: 10, maxLength: 4000 })
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  message!: string;
}
