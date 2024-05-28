import { ApiProperty } from '@nestjs/swagger';
import { Role } from 'src/common/enums/enums';
import { User } from 'src/common/interfaces/user.interface';

export class UserDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly email: string;

  @ApiProperty()
  readonly firstName: string;

  @ApiProperty()
  readonly lastName: string;

  @ApiProperty()
  readonly apiKey: string;

  @ApiProperty(
    {
      enum: Role,
      enumName: 'Role',
    },
  )
  readonly role: Role;

  constructor(user: User) {
    this.id = user.id;
    this.email = user.email;
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.apiKey = user.apiKey;
    this.role = user.role;
  }
}
