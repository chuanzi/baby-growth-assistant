import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 清除现有数据（仅在开发环境）
  if (process.env.NODE_ENV === 'development') {
    await prisma.babyMilestone.deleteMany();
    await prisma.milestone.deleteMany();
    console.log('Cleared existing milestone data');
  }

  // 创建里程碑数据
  const milestones = [
    // 0-2个月矫正年龄
    {
      ageRangeMin: 0,
      ageRangeMax: 60,
      title: '抬头能力发展',
      description: '能够短暂抬起头部，颈部肌肉开始发育',
      category: 'motor'
    },
    {
      ageRangeMin: 0,
      ageRangeMax: 60,
      title: '视觉追踪',
      description: '能够用眼睛跟踪缓慢移动的物体',
      category: 'cognitive'
    },
    {
      ageRangeMin: 0,
      ageRangeMax: 60,
      title: '微笑回应',
      description: '开始对熟悉的声音和面孔露出微笑',
      category: 'social'
    },
    {
      ageRangeMin: 30,
      ageRangeMax: 60,
      title: '发出咕咕声',
      description: '开始发出咕咕声和其他早期语音',
      category: 'language'
    },

    // 2-4个月矫正年龄
    {
      ageRangeMin: 60,
      ageRangeMax: 120,
      title: '俯卧抬头90度',
      description: '俯卧时能将头抬起90度并保持一段时间',
      category: 'motor'
    },
    {
      ageRangeMin: 60,
      ageRangeMax: 120,
      title: '翻身动作',
      description: '开始尝试从仰卧翻到侧卧',
      category: 'motor'
    },
    {
      ageRangeMin: 60,
      ageRangeMax: 120,
      title: '抓握反射消失',
      description: '原始抓握反射开始消失，主动抓握开始发展',
      category: 'cognitive'
    },
    {
      ageRangeMin: 60,
      ageRangeMax: 120,
      title: '笑声发展',
      description: '能发出清晰的笑声，对互动有积极回应',
      category: 'social'
    },
    {
      ageRangeMin: 60,
      ageRangeMax: 120,
      title: '咿呀学语',
      description: '开始发出更多样化的声音，如"啊啊"、"呜呜"',
      category: 'language'
    },

    // 4-6个月矫正年龄
    {
      ageRangeMin: 120,
      ageRangeMax: 180,
      title: '独立坐立准备',
      description: '能够在支撑下坐立，背部逐渐挺直',
      category: 'motor'
    },
    {
      ageRangeMin: 120,
      ageRangeMax: 180,
      title: '双手协调',
      description: '能够用双手一起抓取物品',
      category: 'motor'
    },
    {
      ageRangeMin: 120,
      ageRangeMax: 180,
      title: '翻身自如',
      description: '能够从仰卧翻到俯卧，再翻回来',
      category: 'motor'
    },
    {
      ageRangeMin: 120,
      ageRangeMax: 180,
      title: '物体恒存概念',
      description: '开始理解物体即使看不见也依然存在',
      category: 'cognitive'
    },
    {
      ageRangeMin: 120,
      ageRangeMax: 180,
      title: '认识熟悉面孔',
      description: '能够区分熟悉和陌生的面孔',
      category: 'social'
    },
    {
      ageRangeMin: 120,
      ageRangeMax: 180,
      title: '模仿声音',
      description: '开始模仿听到的声音和音调',
      category: 'language'
    },

    // 6-9个月矫正年龄
    {
      ageRangeMin: 180,
      ageRangeMax: 270,
      title: '独立坐立',
      description: '能够不依靠支撑独立坐立',
      category: 'motor'
    },
    {
      ageRangeMin: 180,
      ageRangeMax: 270,
      title: '爬行准备',
      description: '开始做出爬行的动作，可能还无法移动',
      category: 'motor'
    },
    {
      ageRangeMin: 180,
      ageRangeMax: 270,
      title: '精细运动发展',
      description: '能够用拇指和食指捏取小物品',
      category: 'motor'
    },
    {
      ageRangeMin: 180,
      ageRangeMax: 270,
      title: '因果关系理解',
      description: '开始理解行为和结果之间的关系',
      category: 'cognitive'
    },
    {
      ageRangeMin: 180,
      ageRangeMax: 270,
      title: '分离焦虑',
      description: '开始表现出对主要照顾者的依恋',
      category: 'social'
    },
    {
      ageRangeMin: 180,
      ageRangeMax: 270,
      title: '辅音发展',
      description: '开始发出"ba"、"da"、"ma"等辅音',
      category: 'language'
    },

    // 9-12个月矫正年龄
    {
      ageRangeMin: 270,
      ageRangeMax: 365,
      title: '拉站',
      description: '能够拉着物体从坐姿站立起来',
      category: 'motor'
    },
    {
      ageRangeMin: 270,
      ageRangeMax: 365,
      title: '爬行移动',
      description: '能够通过爬行在房间内移动',
      category: 'motor'
    },
    {
      ageRangeMin: 270,
      ageRangeMax: 365,
      title: '巡航行走',
      description: '扶着家具能够侧向行走',
      category: 'motor'
    },
    {
      ageRangeMin: 270,
      ageRangeMax: 365,
      title: '指向手势',
      description: '能够用手指指向想要的物品',
      category: 'cognitive'
    },
    {
      ageRangeMin: 270,
      ageRangeMax: 365,
      title: '简单指令理解',
      description: '能够理解简单的指令如"过来"、"再见"',
      category: 'cognitive'
    },
    {
      ageRangeMin: 270,
      ageRangeMax: 365,
      title: '挥手再见',
      description: '能够模仿挥手的动作表示再见',
      category: 'social'
    },
    {
      ageRangeMin: 270,
      ageRangeMax: 365,
      title: '叠音词',
      description: '开始说出"mama"、"dada"等叠音词',
      category: 'language'
    },

    // 12个月以上
    {
      ageRangeMin: 365,
      ageRangeMax: 547,
      title: '独立行走',
      description: '能够独立行走几步',
      category: 'motor'
    },
    {
      ageRangeMin: 365,
      ageRangeMax: 547,
      title: '第一个词汇',
      description: '说出除了"mama"、"dada"之外的第一个有意义词汇',
      category: 'language'
    },
    {
      ageRangeMin: 365,
      ageRangeMax: 547,
      title: '模仿游戏',
      description: '喜欢模仿大人的动作和声音',
      category: 'social'
    },
    {
      ageRangeMin: 365,
      ageRangeMax: 547,
      title: '简单解决问题',
      description: '能够解决简单的问题，如找到被遮盖的玩具',
      category: 'cognitive'
    }
  ];

  console.log('Creating milestones...');
  for (const milestone of milestones) {
    await prisma.milestone.create({
      data: milestone
    });
  }

  console.log(`Created ${milestones.length} milestones`);
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });