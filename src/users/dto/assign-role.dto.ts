import { IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from 'src/common/enums/enums';

export class AssignRoleDto {
  @ApiProperty()
  @IsUUID()
  readonly id: string;

  @ApiProperty(
    {
      enum: Role,
      enumName: 'Role',
    },
  )
  @IsEnum(Role)
  readonly role: Role;
}
