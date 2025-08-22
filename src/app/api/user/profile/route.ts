import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// 用户资料更新验证 schema
const updateProfileSchema = z.object({
  phone: z.string()
    .regex(/^1[3-9]\d{9}$/, '请输入正确的手机号格式')
    .optional(),
  email: z.string()
    .email('请输入正确的邮箱格式')
    .toLowerCase()
    .optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string()
    .min(8, '密码至少8位字符')
    .max(100, '密码不能超过100位字符')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密码需包含大小写字母和数字')
    .optional(),
  confirmNewPassword: z.string().optional(),
}).refine(
  (data) => {
    // 如果要修改密码，必须提供当前密码
    if (data.newPassword && !data.currentPassword) {
      return false;
    }
    // 新密码和确认密码必须一致
    if (data.newPassword && data.newPassword !== data.confirmNewPassword) {
      return false;
    }
    return true;
  },
  {
    message: '密码验证失败',
    path: ['newPassword'],
  }
);

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await requireAuth();
    
    // 查询用户信息
    const user = await prisma.user.findUnique({
      where: {
        id: session.userId as string,
      },
      select: {
        id: true,
        phone: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        babies: {
          select: {
            id: true,
            name: true,
            birthDate: true,
            gestationalWeeks: true,
            gestationalDays: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          error: '用户不存在',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // 计算用户统计信息
    const [totalRecords, totalMilestones] = await Promise.all([
      prisma.feedingRecord.count({
        where: {
          baby: {
            userId: session.userId as string,
          }
        }
      }) + await prisma.sleepRecord.count({
        where: {
          baby: {
            userId: session.userId as string,
          }
        }
      }),
      
      prisma.babyMilestone.count({
        where: {
          baby: {
            userId: session.userId as string,
          },
          achievedAt: {
            not: null,
          },
        }
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
          hasPassword: !!user.email, // 有邮箱就有密码
          authMethod: user.phone ? 'phone' : 'email',
        },
        babies: user.babies.map(baby => ({
          id: baby.id,
          name: baby.name,
          birthDate: baby.birthDate.toISOString(),
          gestationalWeeks: baby.gestationalWeeks,
          gestationalDays: baby.gestationalDays,
          createdAt: baby.createdAt.toISOString(),
        })),
        statistics: {
          totalBabies: user.babies.length,
          totalRecords: totalRecords,
          completedMilestones: totalMilestones,
          memberSince: user.createdAt.toISOString(),
        }
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { 
          success: false,
          error: '请先登录',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: '获取用户资料失败，请稍后重试',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await requireAuth();
    
    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);
    
    // 查询当前用户信息
    const currentUser = await prisma.user.findUnique({
      where: {
        id: session.userId as string,
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        { 
          success: false,
          error: '用户不存在',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // 验证当前密码（如果要修改密码）
    if (validatedData.newPassword && validatedData.currentPassword) {
      if (!currentUser.password) {
        return NextResponse.json(
          { 
            success: false,
            error: '账号未设置密码，无法修改密码',
            code: 'NO_PASSWORD_SET'
          },
          { status: 400 }
        );
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        validatedData.currentPassword,
        currentUser.password
      );

      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          { 
            success: false,
            error: '当前密码错误',
            code: 'INVALID_CURRENT_PASSWORD'
          },
          { status: 400 }
        );
      }
    }

    // 检查邮箱和手机号唯一性
    const conflicts = [];
    
    if (validatedData.email && validatedData.email !== currentUser.email) {
      const existingEmailUser = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });
      
      if (existingEmailUser) {
        conflicts.push('邮箱已被使用');
      }
    }

    if (validatedData.phone && validatedData.phone !== currentUser.phone) {
      const existingPhoneUser = await prisma.user.findUnique({
        where: { phone: validatedData.phone },
      });
      
      if (existingPhoneUser) {
        conflicts.push('手机号已被使用');
      }
    }

    if (conflicts.length > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: conflicts.join(', '),
          code: 'DUPLICATE_CREDENTIALS'
        },
        { status: 409 }
      );
    }

    // 构建更新数据
    const updateData: {
      phone?: string;
      email?: string;
      password?: string;
    } = {};
    
    if (validatedData.phone) {
      updateData.phone = validatedData.phone;
    }
    
    if (validatedData.email) {
      updateData.email = validatedData.email;
    }
    
    if (validatedData.newPassword) {
      updateData.password = await bcrypt.hash(validatedData.newPassword, 10);
    }

    // 如果没有要更新的数据
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: '没有要更新的数据',
          code: 'NO_UPDATE_DATA'
        },
        { status: 400 }
      );
    }

    // 更新用户信息
    const updatedUser = await prisma.user.update({
      where: {
        id: session.userId as string,
      },
      data: updateData,
      select: {
        id: true,
        phone: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: '用户资料更新成功',
      data: {
        user: {
          id: updatedUser.id,
          phone: updatedUser.phone,
          email: updatedUser.email,
          createdAt: updatedUser.createdAt.toISOString(),
          updatedAt: updatedUser.updatedAt.toISOString(),
          hasPassword: !!updatedUser.email,
          authMethod: updatedUser.phone ? 'phone' : 'email',
        }
      }
    });

  } catch (error) {
    console.error('Update user profile error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: error.issues[0]?.message || '参数验证失败',
          code: 'VALIDATION_ERROR',
          details: error.issues
        },
        { status: 400 }
      );
    }
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { 
          success: false,
          error: '请先登录',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: '更新用户资料失败，请稍后重试',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}