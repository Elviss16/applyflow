#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/736ed4d12d7e59e2831e31100c62f92153d62875d1c28e65db19bd47825b29ea/contract';
import startContract from '../../snapshots/736ed4d12d7e59e2831e31100c62f92153d62875d1c28e65db19bd47825b29ea/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/9c71b1f365930fef69de1e8b94550baf16e4883c85b5c33157f13acbc3106d77/contract';
import endContract from '../../snapshots/9c71b1f365930fef69de1e8b94550baf16e4883c85b5c33157f13acbc3106d77/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  placeholder,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'user',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'application',
        column: col('userId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.dataTransform(endContract, 'backfill-application-userId', {
        check: () => placeholder('backfill-application-userId:check'),
        run: () => placeholder('backfill-application-userId:run'),
      }),
      this.setNotNull({ schema: 'public', table: 'application', column: 'userId' }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_email_key',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'application',
        index: 'application_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'application',
        foreignKey: {
          name: 'application_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
