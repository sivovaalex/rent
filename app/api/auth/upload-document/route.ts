export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, errorResponse, successResponse } from '@/lib/api-utils';
import { validateBody, uploadDocumentSchema } from '@/lib/validations';
import { uploadBase64File, BUCKETS, generateFilePath } from '@/lib/supabase/storage';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const validation = await validateBody(request, uploadDocumentSchema);
    if (!validation.success) return validation.error;

    const { document_type, document_data, owner_type, company_name, inn, ogrn } = validation.data;

    // Determine content type from base64 data
    let contentType = 'image/jpeg';
    if (document_data.includes('data:image/png')) {
      contentType = 'image/png';
    } else if (document_data.includes('data:image/webp')) {
      contentType = 'image/webp';
    }

    // Upload to Supabase Storage
    const filePath = generateFilePath('verification', authResult.userId);
    const uploadResult = await uploadBase64File(BUCKETS.DOCUMENTS, filePath, document_data, contentType);

    if (!uploadResult.success) {
      return errorResponse('Ошибка загрузки документа', 500);
    }

    const isBusinessType = owner_type === 'ip' || owner_type === 'legal_entity';

    await prisma.user.update({
      where: { id: authResult.userId },
      data: {
        documentPath: uploadResult.url,
        documentType: document_type,
        verificationStatus: 'pending',
        verificationSubmittedAt: new Date(),
        ownerType: owner_type || 'individual',
        companyName: isBusinessType ? (company_name || null) : null,
        inn: isBusinessType ? (inn || null) : null,
        ogrn: isBusinessType ? (ogrn || null) : null,
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
