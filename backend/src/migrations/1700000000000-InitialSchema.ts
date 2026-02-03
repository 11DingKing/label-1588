import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * 初始化数据库结构迁移
 * 创建 users 表及相关索引
 */
export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建 users 表
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
            comment: '主键',
          },
          {
            name: 'username',
            type: 'varchar',
            length: '50',
            isNullable: false,
            isUnique: true,
            comment: '用户名',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '100',
            isNullable: false,
            isUnique: true,
            comment: '邮箱',
          },
          {
            name: 'password',
            type: 'varchar',
            length: '255',
            isNullable: false,
            comment: '密码（bcrypt加密）',
          },
          {
            name: 'status',
            type: 'tinyint',
            default: 1,
            isNullable: false,
            comment: '状态：0-禁用，1-启用',
          },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
            comment: '创建时间',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
            comment: '更新时间',
          },
        ],
      }),
      true,
    );

    // 创建状态索引
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_status',
        columnNames: ['status'],
      }),
    );

    // 创建创建时间索引
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除索引
    await queryRunner.dropIndex('users', 'idx_users_created_at');
    await queryRunner.dropIndex('users', 'idx_users_status');

    // 删除表
    await queryRunner.dropTable('users');
  }
}
