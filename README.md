# NestJS 用户认证系统

基于 NestJS 框架构建的用户认证系统，包含完整的登录注册功能、统一异常处理和请求日志记录。

---

## How to Run

### 一键启动

```bash
docker-compose up --build -d
```

启动成功后可访问：
- **API 地址**: http://localhost:8081/api
- **Swagger 文档**: http://localhost:8081/api/docs
- **健康检查**: http://localhost:8081/api/health

### 常用命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f backend

# 停止服务
docker-compose down
```

### 方式二：本地开发

```bash
# 1. 启动 MySQL（确保已安装 MySQL 8.0）
# 创建数据库 nestjs_auth

# 2. 进入后端目录
cd backend

# 3. 安装依赖
npm install

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接信息和 JWT_SECRET

# 5. 运行数据库迁移
npm run migration:run

# 6. 启动开发服务器
npm run start:dev
```

### 数据库迁移命令

```bash
# 运行所有待执行的迁移
npm run migration:run

# 回滚最近一次迁移
npm run migration:revert

# 查看迁移状态
npm run migration:show

# 生成新的迁移文件（基于实体变更）
npm run migration:generate src/migrations/MigrationName

# 创建空白迁移文件
npm run migration:create src/migrations/MigrationName
```

---

## Services

| 服务 | 端口 | 说明 |
|------|------|------|
| Backend API | 8081 | NestJS 后端服务 |
| MySQL | 3306 | 数据库服务 |

### API 访问地址

- **后端 API**: http://localhost:8081/api
- **Swagger 文档**: http://localhost:8081/api/docs
- **健康检查**: http://localhost:8081/api/health
- **存活检查**: http://localhost:8081/api/health/liveness
- **就绪检查**: http://localhost:8081/api/health/readiness

---

## 测试账号

> 首次启动后需要通过注册接口创建账号

### 注册新用户

```bash
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "123456"
  }'
```

### 登录获取 Token

```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "account": "admin",
    "password": "123456"
  }'
```

---

## 题目内容

初始化一个基于 NestJS 的项目，并封装好用户的登录注册逻辑，统一拦截错误处理和日志打印。

---

## 质量验收指南（QA Testing Guide）

### 自动化质检

项目提供了自动化质检脚本，可一键验证所有功能：

```bash
# 1. 确保 Docker 服务已启动
docker-compose up -d

# 2. 等待服务就绪（约 30 秒）
docker-compose ps  # 确认所有服务状态为 healthy

# 3. 运行质检脚本
./scripts/qa-test.sh
```

**质检脚本覆盖项（39 项测试）：**

| 模块 | 测试项 |
|------|--------|
| 健康检查 | 接口可用性、响应格式 |
| 用户注册 | 正常注册、重复用户名、无效邮箱、密码校验 |
| 用户登录 | 用户名登录、邮箱登录、错误密码、不存在用户 |
| JWT 认证 | 有效Token、无Token、无效Token、密码隐藏 |
| Token 刷新 | 刷新功能、新Token生成 |
| 用户管理 | 列表查询、分页、权限控制 |
| 响应格式 | 成功响应、错误响应、追踪ID |

### 手动质检清单

#### 1. 基础功能验证

```bash
# 健康检查
curl http://localhost:8081/api/health

# 预期响应：
# {"code":200,"message":"success","data":{"status":"ok","timestamp":"..."},"timestamp":"..."}
```

#### 2. 用户注册验证

```bash
# 正常注册
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Test123456"}'

# 预期：返回 accessToken 和用户信息

# 重复注册（应失败）
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test2@example.com","password":"Test123456"}'

# 预期：返回 409 状态码，提示"用户名已存在"
```

#### 3. 登录验证

```bash
# 用户名登录
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"account":"testuser","password":"Test123456"}'

# 邮箱登录
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"account":"test@example.com","password":"Test123456"}'

# 错误密码（应失败）
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"account":"testuser","password":"wrongpassword"}'

# 预期：返回 401 状态码
```

#### 4. JWT 认证验证

```bash
# 获取 Token（从登录响应中提取）
TOKEN="your-jwt-token-here"

# 使用 Token 访问受保护接口
curl -X GET http://localhost:8081/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"

# 无 Token 访问（应失败）
curl -X GET http://localhost:8081/api/auth/profile

# 预期：返回 401 状态码，提示"请先登录"
```

#### 5. 日志验证

```bash
# 查看后端日志，确认包含：
# - 请求追踪 ID（如 [abc12345]）
# - 请求方法和路径
# - 响应状态码和耗时
docker-compose logs backend | tail -50
```

#### 6. 错误响应格式验证

所有错误响应应包含以下字段：
- `code`: HTTP 状态码
- `message`: 错误描述
- `error`: 错误类型
- `traceId`: 请求追踪 ID
- `timestamp`: 时间戳
- `path`: 请求路径
- `method`: 请求方法

### 单元测试

```bash
cd backend

# 运行所有单元测试（70 个测试用例）
npm run test

# 运行测试并查看覆盖率
npm run test:cov

# 监听模式运行测试
npm run test:watch
```

### 代码规范检查

```bash
cd backend

# ESLint 检查
npm run lint

# 代码格式化
npm run format
```

---

## 项目特性

### ✅ 用户认证模块
- 用户注册（用户名/邮箱/密码）
- 用户登录（支持用户名或邮箱登录）
- JWT Token 认证
- Token 刷新机制
- 获取当前用户信息

### ✅ 统一异常处理
- 全局异常过滤器（GlobalExceptionFilter）
- 统一响应格式
- HTTP 异常和系统异常分别处理
- 数据库异常友好提示
- 生产环境隐藏敏感错误信息

### ✅ 请求日志记录
- 日志拦截器（LoggingInterceptor）
- 记录请求方法、URL、耗时
- 请求参数脱敏处理
- 链路追踪 ID（X-Trace-Id）
- 慢请求警告（>3秒）

### ✅ 工程化特性
- TypeORM 数据库访问
- **数据库迁移机制**（Migrations，支持版本管理）
- **Swagger/OpenAPI 自动化文档**（/api/docs）
- 参数校验（class-validator）
- 响应数据转换
- Docker 容器化部署
- **深度健康检查**（@nestjs/terminus，含数据库/内存检测）
- 完整的单元测试覆盖（92 个测试用例，含 Controller 层）
- 自动化质检脚本（39 项测试）

### ✅ 日志系统
- **结构化 JSON 日志**（Winston，便于 ELK/EFK 采集）
- 请求追踪 ID（traceId）
- 敏感数据自动脱敏
- 按日期轮转日志文件（生产环境）
- 分级日志（error/warn/info/http/debug）

### ✅ 安全特性
- JWT Token 认证
- 密码 bcrypt 加密存储
- **生产环境强制配置 JWT_SECRET**（缺失则阻止启动）
- 敏感数据脱敏（日志中隐藏密码等）
- 请求追踪 ID（便于问题排查）

---

## API 文档

### 认证接口 `/api/auth`

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/register` | 用户注册 | 否 |
| POST | `/login` | 用户登录 | 否 |
| GET | `/profile` | 获取当前用户信息 | JWT |
| POST | `/refresh` | 刷新 Token | JWT |

### 用户接口 `/api/users`

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/` | 获取用户列表 | JWT |
| GET | `/:id` | 获取用户详情 | JWT |
| PATCH | `/:id` | 更新用户信息 | JWT |
| DELETE | `/:id` | 删除用户 | JWT |

### 响应格式

**成功响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**错误响应：**
```json
{
  "code": 400,
  "message": "错误描述",
  "error": "Bad Request",
  "data": null,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/auth/login",
  "method": "POST",
  "traceId": "abc12345"
}
```

---

## 项目结构

```
├── backend/                    # NestJS 后端项目
│   ├── src/
│   │   ├── common/             # 公共模块
│   │   │   ├── decorators/     # 自定义装饰器
│   │   │   ├── dto/            # 公共 DTO
│   │   │   ├── filters/        # 异常过滤器
│   │   │   ├── guards/         # 守卫
│   │   │   ├── interceptors/   # 拦截器
│   │   │   └── services/       # 公共服务
│   │   ├── config/             # 配置文件
│   │   ├── modules/            # 业务模块
│   │   │   ├── auth/           # 认证模块
│   │   │   ├── health/         # 健康检查
│   │   │   └── user/           # 用户模块
│   │   ├── app.module.ts       # 根模块
│   │   └── main.ts             # 入口文件
│   ├── test/                   # E2E 测试
│   ├── Dockerfile
│   └── package.json
├── scripts/
│   └── qa-test.sh              # 自动化质检脚本
├── docs/                       # 文档目录
│   └── project_design.md       # 项目设计文档
├── docker-compose.yml          # Docker 编排文件
├── schema.sql                  # 数据库初始化脚本
├── .gitignore
└── README.md
```

---

## 技术栈

- **运行时**: Node.js 20
- **框架**: NestJS 10
- **语言**: TypeScript 5
- **数据库**: MySQL 8.0
- **ORM**: TypeORM
- **认证**: JWT + Passport
- **校验**: class-validator
- **测试**: Jest
- **容器**: Docker + Docker Compose

---

## 环境变量

| 变量名 | 描述 | 默认值 | 必填 |
|--------|------|--------|------|
| `PORT` | 服务端口 | 3000 | 否 |
| `NODE_ENV` | 环境（development/production） | development | 否 |
| `DB_HOST` | 数据库主机 | localhost | 否 |
| `DB_PORT` | 数据库端口 | 3306 | 否 |
| `DB_USERNAME` | 数据库用户名 | root | 否 |
| `DB_PASSWORD` | 数据库密码 | - | 是 |
| `DB_DATABASE` | 数据库名称 | nestjs_auth | 否 |
| `DB_SYNCHRONIZE` | 自动同步表结构（仅开发环境） | false | 否 |
| `JWT_SECRET` | JWT密钥（**生产环境必填，建议≥32位**） | - | 生产必填 |
| `JWT_EXPIRES_IN` | Token过期时间 | 24h | 否 |
| `LOG_LEVEL` | 日志级别（ERROR/WARN/LOG/DEBUG） | DEBUG | 否 |

### 安全配置说明

- **JWT_SECRET**: 
  - 开发环境：可不配置，会使用开发专用密钥并输出警告
  - 生产环境：**必须配置**，否则应用将拒绝启动
  - 推荐使用 32 位以上的随机字符串

- **DB_SYNCHRONIZE**:
  - 生产环境：**禁止设为 true**，应使用迁移管理数据库结构
  - 开发环境：可按需设置，但建议使用迁移以保持一致性

---

## License

MIT
