export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, encryptDocument, errorResponse, successResponse } from '@/lib/api-utils';
import { validateBody, uploadDocumentSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const validation = await validateBody(request, uploadDocumentSchema);
    if (!validation.success) return validation.error;

    const { document_type, document_data } = validation.data;

    const encryptedData = encryptDocument(document_data);

    await prisma.user.update({
      where: { id: authResult.userId },
      data: {
        encryptedDocument: encryptedData,
        documentType: document_type,
        verificationStatus: 'pending',
        verificationSubmittedAt: new Date(),
      },
    });

    return successResponse({
      success: true,
      message: 'Документ загружен на проверку',
    });
  } catch (error) {
    console.error('POST /auth/upload-document Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
