import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { User, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  // 工厂函数创建 mock 用户数据
  const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: '$2a$10$hashedpassword',
    status: UserStatus.ENABLED,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    hashPassword: jest.fn(),
    comparePassword: jest.fn(),
    ...overrides,
  });

  beforeEach(async () => {
    mockUserRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
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

    it('should successfully create a new user', async () => {
      const mockUser = createMockUser();
      const savedUser = { ...mockUser, ...createUserDto, id: 2 };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(savedUser);
      mockUserRepository.save.mockResolvedValue(savedUser);

      const result = await userService.create(createUserDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(2);
      expect(mockUserRepository.create).toHaveBeenCalledWith(createUserDto);
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('username', createUserDto.username);
    });

    it('should throw ConflictException when username exists', async () => {
      const mockUser = createMockUser();
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser);

      await expect(userService.create(createUserDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when email exists', async () => {
      const mockUser = createMockUser();
      mockUserRepository.findOne
        .mockResolvedValueOnce(null) // 用户名检查
        .mockResolvedValueOnce(mockUser); // 邮箱检查

      await expect(userService.create(createUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const mockUser = createMockUser();
      const queryDto: QueryUserDto = {
        page: 1,
        pageSize: 10,
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
      };

      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as never);

      const result = await userService.findAll(queryDto);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('pageSize', 10);
      expect(result).toHaveProperty('totalPages', 1);
      expect(result.items).toHaveLength(1);
    });

    it('should filter by username', async () => {
      const mockUser = createMockUser();
      const queryDto: QueryUserDto = {
        username: 'test',
        page: 1,
        pageSize: 10,
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
      };

      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as never);

      await userService.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.username LIKE :username', {
        username: '%test%',
      });
    });

    it('should filter by status', async () => {
      const mockUser = createMockUser();
      const queryDto: QueryUserDto = {
        status: UserStatus.ENABLED,
        page: 1,
        pageSize: 10,
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
      };

      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as never);

      await userService.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.status = :status', {
        status: UserStatus.ENABLED,
      });
    });
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      const mockUser = createMockUser();
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await userService.findById(1);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(userService.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUsername', () => {
    it('should return a user by username with password', async () => {
      const mockUser = createMockUser();
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await userService.findByUsername('testuser');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        select: ['id', 'username', 'email', 'password', 'status', 'createdAt', 'updatedAt'],
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await userService.findByUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email with password', async () => {
      const mockUser = createMockUser();
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await userService.findByEmail('test@example.com');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: ['id', 'username', 'email', 'password', 'status', 'createdAt', 'updatedAt'],
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      email: 'updated@example.com',
    };

    it('should successfully update a user', async () => {
      const mockUser = createMockUser();
      const updatedUser = { ...mockUser, email: updateUserDto.email };

      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser) // 查找用户
        .mockResolvedValueOnce(null); // 检查邮箱是否存在
      mockUserRepository.save.mockResolvedValue(updatedUser);

      const result = await userService.update(1, updateUserDto);

      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('email', updateUserDto.email);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(userService.update(999, updateUserDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when email is taken', async () => {
      const mockUser = createMockUser();
      const anotherUser = createMockUser({ id: 2 });

      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser) // 查找用户
        .mockResolvedValueOnce(anotherUser); // 邮箱检查

      await expect(userService.update(1, updateUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should successfully remove a user', async () => {
      const mockUser = createMockUser();
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.remove.mockResolvedValue(mockUser);

      await userService.remove(1);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockUserRepository.remove).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(userService.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
