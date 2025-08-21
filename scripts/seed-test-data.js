const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedTestData() {
  console.log('🌱 开始创建测试数据...');

  try {
    // 创建测试用户
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiNGmNV9vdAO', // password: test123456
      },
    });

    console.log('✅ 测试用户创建成功:', testUser.email);

    // 创建测试宝宝 (早产儿)
    const prematureBaby = await prisma.baby.upsert({
      where: { id: 'test-baby-premature' },
      update: {},
      create: {
        id: 'test-baby-premature',
        userId: testUser.id,
        name: '小豆豆',
        birthDate: new Date('2024-06-15'), // 2个月前出生
        gestationalWeeks: 32, // 早产儿 - 32周
        gestationalDays: 3,   // +3天
      },
    });

    console.log('✅ 早产儿测试宝宝创建成功:', prematureBaby.name);

    // 创建测试宝宝 (足月儿)
    const fullTermBaby = await prisma.baby.upsert({
      where: { id: 'test-baby-fullterm' },
      update: {},
      create: {
        id: 'test-baby-fullterm',
        userId: testUser.id,
        name: '小月月',
        birthDate: new Date('2024-04-15'), // 4个月前出生
        gestationalWeeks: 39, // 足月儿
        gestationalDays: 2,
      },
    });

    console.log('✅ 足月儿测试宝宝创建成功:', fullTermBaby.name);

    // 为早产儿添加喂养记录
    const feedingRecords = [];
    for (let i = 0; i < 15; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(8 + (i % 3) * 4); // 8点、12点、16点喂养

      feedingRecords.push({
        babyId: prematureBaby.id,
        type: i % 3 === 0 ? 'breast' : i % 3 === 1 ? 'formula' : 'solid',
        amountOrDuration: i % 3 === 0 ? '20分钟' : i % 3 === 1 ? '120ml' : '半碗米糊',
        timestamp: date,
        notes: i % 5 === 0 ? '宝宝今天胃口很好' : null,
      });
    }

    await prisma.feedingRecord.createMany({
      data: feedingRecords,
    });

    console.log('✅ 喂养记录创建成功:', feedingRecords.length, '条');

    // 为早产儿添加睡眠记录
    const sleepRecords = [];
    for (let i = 0; i < 10; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // 白天小憩
      const napStart = new Date(date);
      napStart.setHours(14, 0, 0, 0);
      const napEnd = new Date(napStart);
      napEnd.setHours(napStart.getHours() + 1 + Math.floor(Math.random() * 2)); // 1-3小时

      sleepRecords.push({
        babyId: prematureBaby.id,
        startTime: napStart,
        endTime: napEnd,
        durationMinutes: Math.floor((napEnd - napStart) / (1000 * 60)),
        timestamp: napStart,
        notes: i % 3 === 0 ? '睡得很安稳' : null,
      });

      // 夜间睡眠
      const nightStart = new Date(date);
      nightStart.setHours(20, 0, 0, 0);
      const nightEnd = new Date(nightStart);
      nightEnd.setDate(nightEnd.getDate() + 1);
      nightEnd.setHours(6 + Math.floor(Math.random() * 2), 0, 0, 0); // 6-8点醒来

      sleepRecords.push({
        babyId: prematureBaby.id,
        startTime: nightStart,
        endTime: nightEnd,
        durationMinutes: Math.floor((nightEnd - nightStart) / (1000 * 60)),
        timestamp: nightStart,
        notes: i % 4 === 0 ? '中途醒来2次' : null,
      });
    }

    await prisma.sleepRecord.createMany({
      data: sleepRecords,
    });

    console.log('✅ 睡眠记录创建成功:', sleepRecords.length, '条');

    // 为早产儿标记一些已完成的里程碑
    const completedMilestones = await prisma.milestone.findMany({
      where: {
        ageRangeMax: { lte: 60 }, // 2个月内的里程碑
      },
      take: 5,
    });

    for (const milestone of completedMilestones) {
      await prisma.babyMilestone.upsert({
        where: {
          babyId_milestoneId: {
            babyId: prematureBaby.id,
            milestoneId: milestone.id,
          },
        },
        update: {},
        create: {
          babyId: prematureBaby.id,
          milestoneId: milestone.id,
          achievedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // 过去30天内随机时间
          correctedAgeAtAchievement: Math.floor(Math.random() * 60), // 随机矫正月龄
        },
      });
    }

    console.log('✅ 里程碑记录创建成功:', completedMilestones.length, '个');

    console.log('\n🎉 测试数据创建完成！');
    console.log('\n📋 测试账号信息:');
    console.log('邮箱: test@example.com');
    console.log('密码: test123456');
    console.log('\n👶 测试宝宝:');
    console.log('1. 小豆豆 (早产儿, 32周+3天)');
    console.log('2. 小月月 (足月儿, 39周+2天)');
    console.log('\n📊 已创建数据:');
    console.log('- 15条喂养记录');
    console.log('- 20条睡眠记录');
    console.log('- 5个已完成里程碑');

  } catch (error) {
    console.error('❌ 创建测试数据时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestData();