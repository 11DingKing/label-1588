import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  const testUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'Test123456',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // 应用全局配置
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/auth/register (POST)', () => {
    it('should register a new user successfully', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body.code).toBe(200);
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('tokenType', 'Bearer');
          expect(res.body.data).toHaveProperty('expiresIn');
          expect(res.body.data.user).toHaveProperty('username', testUser.username);
          expect(res.body.data.user).toHaveProperty('email', testUser.email);
          expect(res.body.data.user).not.toHaveProperty('password');
        });
    });

    it('should fail with duplicate username', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(409)
        .expect((res) => {
          expect(res.body.code).toBe(409);
          expect(res.body.message).toContain('用户名已存在');
        });
    });

    it('should fail with invalid email format', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'invalid-email',
          password: 'Test123456',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.code).toBe(400);
          expect(res.body.message).toContain('邮箱格式不正确');
        });
    });

    it('should fail with short password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'newuser2',
          email: 'new2@example.com',
          password: '123',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.code).toBe(400);
          expect(res.body.message).toContain('密码至少6个字符');
        });
    });

    it('should fail with invalid username characters', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'user@name!',
          email: 'new3@example.com',
          password: 'Test123456',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.code).toBe(400);
          expect(res.body.message).toContain('用户名只能包含字母、数字和下划线');
        });
    });
  });

  describe('/api/auth/login (POST)', () => {
    it('should login with username successfully', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          account: testUser.username,
          password: testUser.password,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.code).toBe(200);
          expect(res.body.data).toHaveProperty('accessToken');
          accessToken = res.body.data.accessToken;
        });
    });

    it('should login with email successfully', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          account: testUser.email,
          password: testUser.password,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.code).toBe(200);
          expect(res.body.data).toHaveProperty('accessToken');
        });
    });

    it('should fail with wrong password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          account: testUser.username,
          password: 'wrongpassword',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.code).toBe(401);
          expect(res.body.message).toContain('用户名/邮箱或密码错误');
        });
    });

    it('should fail with non-existent user', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          account: 'nonexistent',
          password: 'Test123456',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.code).toBe(401);
          expect(res.body.message).toContain('用户名/邮箱或密码错误');
        });
    });

    it('should fail with empty account', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          account: '',
          password: 'Test123456',
        })
        .expect(400);
    });
  });

  describe('/api/auth/profile (GET)', () => {
    it('should get profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(200);
          expect(res.body.data).toHaveProperty('username', testUser.username);
          expect(res.body.data).toHaveProperty('email', testUser.email);
          expect(res.body.data).not.toHaveProperty('password');
        });
    });

    it('should fail without token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/profile')
        .expect(401)
        .expect((res) => {
          expect(res.body.code).toBe(401);
          expect(res.body.message).toContain('请先登录');
        });
    });

    it('should fail with invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)
        .expect((res) => {
          expect(res.body.code).toBe(401);
          expect(res.body.message).toContain('无效的 Token');
        });
    });

    it('should fail with malformed authorization header', () => {
      return request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });
  });

  describe('/api/auth/refresh (POST)', () => {
    it('should refresh token successfully', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body.code).toBe(200);
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data.accessToken).not.toBe(accessToken);
        });
    });

    it('should fail without token', () => {
      return request(app.getHttpServer()).post('/api/auth/refresh').expect(401);
    });
  });

  describe('/api/health (GET)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(200);
          expect(res.body.data).toHaveProperty('status', 'ok');
          expect(res.body.data).toHaveProperty('timestamp');
        });
    });
  });
});
