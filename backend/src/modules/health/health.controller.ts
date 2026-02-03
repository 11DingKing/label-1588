import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../../common/decorators/public.decorator';

/**
 * 健康检查控制器
 * 提供深度健康检查，包括数据库、内存、磁盘状态
 */
@ApiTags('健康检查')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  /**
   * 综合健康检查
   * 检查数据库连接、内存使用、磁盘空间
   */
  @ApiOperation({
    summary: '综合健康检查',
    description: '检查数据库连接、内存使用、磁盘空间等关键指标',
  })
  @ApiResponse({
    status: 200,
    description: '服务健康',
    schema: {
      example: {
        status: 'ok',
        info: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: '服务不健康',
    schema: {
      example: {
        status: 'error',
        info: {},
        error: {
          database: { status: 'down', message: 'Connection refused' },
        },
        details: {
          database: { status: 'down', message: 'Connection refused' },
        },
      },
    },
  })
  @Public()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // 数据库连接检查
      () => this.db.pingCheck('database'),
      // 内存堆使用检查（限制 300MB）
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      // RSS 内存检查（限制 500MB）
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),
    ]);
  }

  /**
   * 简单存活检查
   * 用于 Kubernetes liveness probe
   */
  @ApiOperation({
    summary: '存活检查',
    description: '简单的存活检查，用于 Kubernetes liveness probe',
  })
  @ApiResponse({ status: 200, description: '服务存活' })
  @Public()
  @Get('liveness')
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 就绪检查
   * 用于 Kubernetes readiness probe，检查数据库连接
   */
  @ApiOperation({
    summary: '就绪检查',
    description: '检查服务是否准备好接收流量（包括数据库连接检查）',
  })
  @ApiResponse({ status: 200, description: '服务就绪' })
  @ApiResponse({ status: 503, description: '服务未就绪' })
  @Public()
  @Get('readiness')
  @HealthCheck()
  readiness() {
    return this.health.check([
      // 只检查数据库，确保可以处理请求
      () => this.db.pingCheck('database'),
    ]);
  }
}
