import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { PaginatedData } from '../../common/dto/api-response.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 创建用户
   */
  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    this.logger.log(`Creating user: ${createUserDto.username}`);

    // 检查用户名是否存在
    const existingUsername = await this.userRepository.findOne({
      where: { username: createUserDto.username },
    });
    if (existingUsername) {
      throw new ConflictException('用户名已存在');
    }

    // 检查邮箱是否存在
    const existingEmail = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existingEmail) {
      throw new ConflictException('邮箱已被注册');
    }

    const user = this.userRepository.create(createUserDto);
    const savedUser = await this.userRepository.save(user);

    this.logger.log(`User created successfully: ${savedUser.id}`);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = savedUser;
    return result as Omit<User, 'password'>;
  }

  /**
   * 分页查询用户列表
   */
  async findAll(queryDto: QueryUserDto): Promise<PaginatedData<Omit<User, 'password'>>> {
    const { username, email, status, page = 1, pageSize = 10 } = queryDto;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (username) {
      queryBuilder.andWhere('user.username LIKE :username', { username: `%${username}%` });
    }

    if (email) {
      queryBuilder.andWhere('user.email LIKE :email', { email: `%${email}%` });
    }

    if (status !== undefined) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    const [items, total] = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    // 去除每个用户的 password 字段
    const safeItems = items.map((user) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result as Omit<User, 'password'>;
    });

    return {
      items: safeItems,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 根据 ID 查询用户
   */
  async findById(id: number): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`用户 ID ${id} 不存在`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result as Omit<User, 'password'>;
  }

  /**
   * 根据用户名查询用户（包含密码，用于登录验证）
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username },
      select: ['id', 'username', 'email', 'password', 'status', 'createdAt', 'updatedAt'],
    });
  }

  /**
   * 根据邮箱查询用户（包含密码，用于登录验证）
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      select: ['id', 'username', 'email', 'password', 'status', 'createdAt', 'updatedAt'],
    });
  }

  /**
   * 更新用户信息
   */
  async update(id: number, updateUserDto: UpdateUserDto): Promise<Omit<User, 'password'>> {
    this.logger.log(`Updating user: ${id}`);

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`用户 ID ${id} 不存在`);
    }

    // 如果更新邮箱，检查是否与其他用户冲突
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingEmail = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingEmail) {
        throw new ConflictException('邮箱已被其他用户使用');
      }
    }

    Object.assign(user, updateUserDto);
    const updatedUser = await this.userRepository.save(user);

    this.logger.log(`User updated successfully: ${id}`);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = updatedUser;
    return result as Omit<User, 'password'>;
  }

  /**
   * 删除用户
   */
  async remove(id: number): Promise<void> {
    this.logger.log(`Deleting user: ${id}`);

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`用户 ID ${id} 不存在`);
    }

    await this.userRepository.remove(user);

    this.logger.log(`User deleted successfully: ${id}`);
  }
}
