import type { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

const hasDatabase = Boolean(process.env['TEST_DATABASE_URL']);

if (hasDatabase) {
  process.env['DATABASE_URL'] = process.env['TEST_DATABASE_URL'];
}

const describeBlock = hasDatabase ? describe : describe.skip;

describeBlock('Task Guild e2e（需要 TEST_DATABASE_URL）', () => {
  let app: INestApplication;
  let adminToken = '';
  let taskId = '';

  beforeAll(async () => {
    const { AppModule } = await import('../src/app.module');
    const { AllExceptionsFilter } = await import('../src/common/http-exception.filter');
    const { ValidationPipe: Vp } = await import('@nestjs/common');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new Vp({ whitelist: true, transform: true }) as ValidationPipe,
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: process.env['ADMIN_INITIAL_PASSWORD'] || 'ChangeMe123!' })
      .expect(201);
    adminToken = login.body.accessToken as string;
    expect(adminToken).toBeTruthy();
  });

  afterAll(async () => {
    await app.close();
  });

  it('健康检查可用', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
  });

  it('未登录访问任务列表返回 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/tasks').expect(401);
  });

  it('完整闭环：发布 → 接取 → 进度 → 提交 → 审核 → 完成 → 经验入账', async () => {
    const deadline = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const created = await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'e2e 测试委托',
        description: '验证完整闭环',
        difficulty: 'B',
        deadlineAt: deadline,
        acceptMode: 'bounty',
        maxMembers: 1,
        needReview: true,
        status: 'open',
      })
      .expect(201);
    taskId = created.body.id as string;

    const memberLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        username: 'adventurer1',
        password: process.env['ADMIN_INITIAL_PASSWORD'] || 'ChangeMe123!',
      })
      .expect(201);
    const memberToken = memberLogin.body.accessToken as string;

    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/accept`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/progress`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ percent: 80, content: '完成 80%' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/submissions/me`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({})
      .expect(201);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const assignment = (detail.body.assignments as { userId: string }[])[0];
    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/submissions/${assignment.userId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'approved' })
      .expect(201);

    const stats = await request(app.getHttpServer())
      .get('/api/v1/stats/me')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(stats.body.completedCount as number).toBeGreaterThanOrEqual(1);
    expect(stats.body.totalXp as number).toBeGreaterThan(0);
  });
});
