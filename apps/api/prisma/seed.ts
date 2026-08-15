import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import {
  DEFAULT_LEVELS,
  DEFAULT_TITLES,
  DEFAULT_XP_RULES,
} from '@task-guild/shared';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env['DATABASE_URL'],
  }),
});

async function main() {
  const adminPassword = process.env['ADMIN_INITIAL_PASSWORD'] || 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const devDept = await prisma.department.upsert({
    where: { name: '开发部' },
    update: {},
    create: { name: '开发部' },
  });
  const designDept = await prisma.department.upsert({
    where: { name: '设计部' },
    update: {},
    create: { name: '设计部' },
  });

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      nickname: '大管理员',
      roleMask: 7,
    },
  });

  const manager = await prisma.user.upsert({
    where: { username: 'guildmaster' },
    update: {},
    create: {
      username: 'guildmaster',
      passwordHash,
      nickname: '公会会长',
      roleMask: 3,
      departmentId: devDept.id,
    },
  });

  await prisma.user.upsert({
    where: { username: 'adventurer1' },
    update: {},
    create: {
      username: 'adventurer1',
      passwordHash,
      nickname: '冒险者一号',
      roleMask: 1,
      departmentId: devDept.id,
    },
  });

  await prisma.user.upsert({
    where: { username: 'adventurer2' },
    update: {},
    create: {
      username: 'adventurer2',
      passwordHash,
      nickname: '冒险者二号',
      roleMask: 1,
      departmentId: designDept.id,
    },
  });

  const categoryNames = ['开发', '设计', '运营', '行政', '其他'];
  for (const [index, name] of categoryNames.entries()) {
    await prisma.taskCategory.upsert({
      where: { name },
      update: {},
      create: { name, sort: index },
    });
  }

  for (const seed of DEFAULT_LEVELS) {
    await prisma.level.upsert({
      where: { level: seed.level },
      update: { name: seed.name, xpThreshold: seed.xpThreshold },
      create: {
        level: seed.level,
        name: seed.name,
        xpThreshold: seed.xpThreshold,
      },
    });
  }

  for (const seed of DEFAULT_TITLES) {
    await prisma.title.upsert({
      where: { code: seed.code },
      update: {},
      create: {
        code: seed.code,
        name: seed.name,
        description: seed.description,
        conditionType: seed.conditionType,
        conditionValue: seed.conditionValue,
      },
    });
  }

  await prisma.systemConfig.upsert({
    where: { key: 'xp_rules' },
    update: {},
    create: { key: 'xp_rules', value: DEFAULT_XP_RULES, updatedById: admin.id },
  });

  for (const statsUserId of [admin.id, manager.id]) {
    await prisma.userStats.upsert({
      where: { userId: statsUserId },
      update: {},
      create: { userId: statsUserId },
    });
  }

  console.log('Seed complete.');
  console.log(`admin / ${adminPassword}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
