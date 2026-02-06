import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, safeUser, errorResponse, successResponse } from '@/lib/api-utils';
import { validateBody, updateProfileSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    return successResponse({ user: safeUser(authResult.user) });
  } catch (error) {
    console.error('GET /profile Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const validation = await validateBody(request, updateProfileSchema);
    if (!validation.success) return validation.error;

    const data = validation.data;
    const updateData: any = {};

    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.avatar !== undefined) updateData.photo = data.avatar;
    if (data.address) updateData.address = data.address;
    if (data.bio) updateData.bio = data.bio;
    if (data.defaultApprovalMode) updateData.defaultApprovalMode = data.defaultApprovalMode;
    if (data.defaultApprovalThreshold !== undefined) updateData.defaultApprovalThreshold = data.defaultApprovalThreshold;

    const updatedUser = await prisma.user.update({
      where: { id: authResult.userId },
      data: updateData,
    });

    return successResponse({
      success: true,
      user: safeUser(updatedUser),
    });
  } catch (error) {
    console.error('PATCH /profile Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
