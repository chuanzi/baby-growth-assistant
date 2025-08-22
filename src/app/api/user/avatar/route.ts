import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await requireAuth();
    
    // 获取表单数据
    const formData = await request.formData();
    const file = formData.get('avatar') as File;
    
    if (!file) {
      return NextResponse.json(
        { 
          success: false,
          error: '请选择头像文件',
          code: 'NO_FILE_PROVIDED'
        },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { 
          success: false,
          error: '只支持 JPG、PNG、WebP 格式的图片',
          code: 'INVALID_FILE_TYPE'
        },
        { status: 400 }
      );
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          success: false,
          error: '文件大小不能超过5MB',
          code: 'FILE_TOO_LARGE'
        },
        { status: 400 }
      );
    }

    // 确保上传目录存在
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const fileExtension = path.extname(file.name) || '.jpg';
    const fileName = `${session.userId}_${timestamp}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    try {
      // 保存文件
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // 构建访问URL
      const avatarUrl = `/uploads/avatars/${fileName}`;

      // 注意: 这里我们简化了实现，实际项目中可能需要：
      // 1. 将头像URL保存到数据库
      // 2. 删除旧的头像文件
      // 3. 使用云存储服务（如阿里云OSS、腾讯云COS等）
      // 4. 图片压缩和裁剪处理

      return NextResponse.json({
        success: true,
        message: '头像上传成功',
        data: {
          avatarUrl: avatarUrl,
          fileName: fileName,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        }
      });

    } catch (fileError) {
      console.error('File save error:', fileError);
      return NextResponse.json(
        { 
          success: false,
          error: '保存文件失败',
          code: 'FILE_SAVE_ERROR'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Upload avatar error:', error);
    
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

    // 检查是否是文件大小超限错误
    if (error instanceof Error && error.message.includes('File too large')) {
      return NextResponse.json(
        { 
          success: false,
          error: '文件大小超出限制',
          code: 'FILE_TOO_LARGE'
        },
        { status: 413 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: '上传头像失败，请稍后重试',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await requireAuth();
    
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    
    if (!fileName) {
      return NextResponse.json(
        { 
          success: false,
          error: '缺少文件名参数',
          code: 'MISSING_FILENAME'
        },
        { status: 400 }
      );
    }

    // 验证文件名格式（确保是当前用户的文件）
    if (!fileName.startsWith(`${session.userId}_`)) {
      return NextResponse.json(
        { 
          success: false,
          error: '无权限删除此文件',
          code: 'PERMISSION_DENIED'
        },
        { status: 403 }
      );
    }

    const filePath = path.join(UPLOAD_DIR, fileName);
    
    try {
      // 检查文件是否存在
      if (!existsSync(filePath)) {
        return NextResponse.json(
          { 
            success: false,
            error: '文件不存在',
            code: 'FILE_NOT_FOUND'
          },
          { status: 404 }
        );
      }

      // 删除文件
      await unlink(filePath);

      return NextResponse.json({
        success: true,
        message: '头像删除成功',
        data: {
          deletedFile: fileName,
          deletedAt: new Date().toISOString(),
        }
      });

    } catch (fileError) {
      console.error('File delete error:', fileError);
      return NextResponse.json(
        { 
          success: false,
          error: '删除文件失败',
          code: 'FILE_DELETE_ERROR'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Delete avatar error:', error);
    
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
        error: '删除头像失败，请稍后重试',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}