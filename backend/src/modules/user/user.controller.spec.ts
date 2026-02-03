import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { User, UserStatus } from './entities/user.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;

  // Mock 用户数据
  const mockUser: Partial<User> = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    status: UserStatus.ENABLED,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  // Mock 分页响应
  const mockPaginatedResponse = {
    items: [mockUser],
    total: 1,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    })
      // Mock JwtAuthGuard 以绕过认证
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService) as jest.Mocked<UserService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'password123',
    };

    it('should create a new user', async () => {
      const createdUser = { ...mockUser, ...createUserDto, id: 2 };
      userService.create.mockResolvedValue(createdUser as User);

      const result = await controller.create(createUserDto);

      expect(userService.create).toHaveBeenCalledWith(createUserDto);
      expect(userService.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(createdUser);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const queryDto: QueryUserDto = { page: 1, pageSize: 10 };
      userService.findAll.mockResolvedValue(mockPaginatedResponse as never);

      const result = await controller.findAll(queryDto);

      expect(userService.findAll).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(mockPaginatedResponse);
      expect(result.items).toHaveLength(1);
    });

    it('should pass query parameters correctly', async () => {
      const queryDto: QueryUserDto = {
        username: 'test',
        status: UserStatus.ENABLED,
        page: 2,
        pageSize: 5,
      };
      userService.findAll.mockResolvedValue(mockPaginatedResponse as never);

      await controller.findAll(queryDto);

      expect(userService.findAll).toHaveBeenCalledWith({
        username: 'test',
        status: UserStatus.ENABLED,
        page: 2,
        pageSize: 5,
      });
    });

    it('should use default pagination when not provided', async () => {
      const queryDto: QueryUserDto = {};
      userService.findAll.mockResolvedValue(mockPaginatedResponse as never);

      await controller.findAll(queryDto);

      expect(userService.findAll).toHaveBeenCalledWith({});
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      userService.findById.mockResolvedValue(mockUser as User);

      const result = await controller.findOne(1);

      expect(userService.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUser);
    });

    it('should pass numeric id to service', async () => {
      userService.findById.mockResolvedValue(mockUser as User);

      await controller.findOne(123);

      expect(userService.findById).toHaveBeenCalledWith(123);
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      email: 'updated@example.com',
    };

    it('should update user and return updated data', async () => {
      const updatedUser = { ...mockUser, email: 'updated@example.com' };
      userService.update.mockResolvedValue(updatedUser as User);

      const result = await controller.update(1, updateUserDto);

      expect(userService.update).toHaveBeenCalledWith(1, updateUserDto);
      expect(result).toEqual(updatedUser);
      expect(result.email).toBe('updated@example.com');
    });

    it('should pass correct parameters', async () => {
      const dto: UpdateUserDto = {
        email: 'new@test.com',
        status: UserStatus.DISABLED,
      };
      userService.update.mockResolvedValue(mockUser as User);

      await controller.update(5, dto);

      expect(userService.update).toHaveBeenCalledWith(5, {
        email: 'new@test.com',
        status: UserStatus.DISABLED,
      });
    });
  });

  describe('remove', () => {
    it('should remove user by id', async () => {
      userService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(1);

      expect(userService.remove).toHaveBeenCalledWith(1);
      expect(result).toBeUndefined();
    });

    it('should call service with correct id', async () => {
      userService.remove.mockResolvedValue(undefined);

      await controller.remove(999);

      expect(userService.remove).toHaveBeenCalledWith(999);
      expect(userService.remove).toHaveBeenCalledTimes(1);
    });
  });
});
