import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateUserDto } from './dto/user-create.dto';
import { UserLoginResponseDto } from './dto/user-login-response.dto';
import { UserDto } from './dto/user.dto';
import { UpdateUserDto } from './dto/user-update.dto';
import { AuthService } from '../auth/auth.service';
import { UserLoginRequestDto } from './dto/user-login-request.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { Pool } from 'pg';

@Injectable()
export class UsersService {
  private readonly pool: Pool;

  constructor(private authService: AuthService) {
    this.pool = new Pool();
  }

  async create(createUserDto: CreateUserDto): Promise<UserLoginResponseDto> {
    const user = {
      email: createUserDto.email.trim().toLowerCase(),
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      apiKey: this.authService.generateApiKey(),
      password: await this.authService.encryptPassword(createUserDto.password),
    };

    const query = `
      INSERT INTO "User" (email, firstName, lastName, apiKey, password)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [user.email, user.firstName, user.lastName, user.apiKey, user.password];

    const { rows } = await this.pool.query(query, values);
    const userData = rows[0];

    return new UserLoginResponseDto(userData, null);
  }

  async findOne(id: string): Promise<UserDto> {
    const query = `
      SELECT *
      FROM "User"
      WHERE id = $1
    `;
    const values = [id];

    const { rows } = await this.pool.query(query, values);
    const user = rows[0];

    return new UserDto(user);
  }

  async delete(id: string): Promise<UserDto> {
    const query = `
      DELETE FROM "User"
      WHERE id = $1
      RETURNING *
    `;
    const values = [id];

    const { rows } = await this.pool.query(query, values);
    const user = rows[0];

    return new UserDto(user);
  }

  async get(id: string): Promise<UserDto> {
    const user = await this.findOne(id);
    return new UserDto(user);
  }

  async assignRole(data: AssignRoleDto): Promise<UserDto> {
    const { id, role } = data;

    const query = `
      UPDATE "User"
      SET role = $1
      WHERE id = $2
      RETURNING *
    `;
    const values = [role, id];

    const { rows } = await this.pool.query(query, values);
    const user = rows[0];

    return new UserDto(user);
  }

  async update(id: string, userDto: UpdateUserDto): Promise<UserLoginResponseDto> {
    const query = `
      UPDATE "User"
      SET email = $1, firstName = $2, lastName = $3
      WHERE id = $4
      RETURNING *
    `;
    const values = [userDto.email, userDto.firstName, userDto.lastName, id];

    const { rows } = await this.pool.query(query, values);
    const user = rows[0];
    const token = this.authService.signToken(user);

    return new UserLoginResponseDto(user, token);
  }

  async  (user: User): Promise<string> {
    const newApiKey = this.authService.generateApiKey();

    const query = `
      UPDATE "User"
      SET apiKey = $1
      WHERE id = $2
    `;
    const values = [newApiKey, user.id];

    await this.pool.query(query, values);

    return newApiKey;
  }

  async changePassword(user: User, newPassword: string): Promise<boolean> {
    const query = `
      UPDATE "User"
      SET password = $1
      WHERE id = $2
    `;
    const values = [await this.authService.encryptPassword(newPassword), user.id];

    await this.pool.query(query, values);

    return true;
  }

  async login(userLoginRequestDto: UserLoginRequestDto) {
    const query = `
      SELECT *
      FROM "User"
      WHERE email = $1
    `;
    const values = [userLoginRequestDto.email];

    const { rows } = await this.pool.query(query, values);
    const user = rows[0];

    if (!user) {
      throw new HttpException('Invalid email or password.', HttpStatus.BAD_REQUEST);
    }

    const isMatch = await this.authService.compare(userLoginRequestDto.password, user.password);

    if (!isMatch) {
      throw new HttpException('Invalid email or password.', HttpStatus.BAD_REQUEST);
    }

    const token = this.authService.signToken(user);
    return new UserLoginResponseDto(user, token);
  }
}
