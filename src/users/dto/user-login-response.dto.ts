import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from './user.dto';
import { User } from 'src/common/interfaces/user.interface';

export class UserLoginResponseDto extends UserDto {
  @ApiProperty()
  token: string;

  constructor(user: User, token?: string) {
    super(user);
    this.token = token;
  }
}
