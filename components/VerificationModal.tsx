'use client';
import { useState, useRef, ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Upload, X, Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import type { User } from '@/types';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSuccess: () => void;
}

type DocumentType = 'passport' | 'driver_license' | 'other';

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  passport: 'Паспорт',
  driver_license: 'Водительское удостоверение',
  other: 'Другой документ',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function VerificationModal({ isOpen, onClose, currentUser, onSuccess }: VerificationModalProps) {
  const [documentType, setDocumentType] = useState<DocumentType | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setDocumentType('');
    setFile(null);
    setPreview(null);
    setError(null);
    setSuccess(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith('image/')) {
      setError('Можно загружать только изображения (JPG, PNG, WebP)');
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setError('Максимальный размер файла — 10 МБ');
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const removeFile = () => {
    setFile(null);
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!documentType) {
      setError('Выберите тип документа');
      return;
    }
    if (!file) {
      setError('Загрузите фото документа');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Ошибка чтения файла'));
        reader.readAsDataURL(file);
      });

      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/auth/upload-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          document_type: documentType,
          document_data: base64,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка отправки документа');
      }

      setSuccess(true);
      onSuccess();

      // Auto-close after delay
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      console.error('Verification submit error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка отправки документа');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            Верификация личности
          </DialogTitle>
          <DialogDescription>
            Загрузите фото документа, удостоверяющего личность. После проверки модератором вы сможете стать арендодателем.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-lg font-medium text-green-700">Документ отправлен!</p>
            <p className="text-sm text-gray-500 text-center">
              Ваша заявка будет рассмотрена модератором. Мы уведомим вас о результате.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Document type select */}
            <div className="space-y-2">
              <Label>Тип документа</Label>
              <Select
                value={documentType}
                onValueChange={(val) => setDocumentType(val as DocumentType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип документа" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passport">Паспорт</SelectItem>
                  <SelectItem value="driver_license">Водительское удостоверение</SelectItem>
                  <SelectItem value="other">Другой документ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* File upload */}
            <div className="space-y-2">
              <Label>Фото документа</Label>
              {!file ? (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Нажмите для выбора файла</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG или WebP, до 10 МБ</p>
                </div>
              ) : (
                <div className="relative border rounded-lg overflow-hidden">
                  {preview && (
                    <img
                      src={preview}
                      alt="Превью документа"
                      className="w-full max-h-48 object-contain bg-gray-50"
                    />
                  )}
                  <div className="flex items-center justify-between p-2 bg-gray-50 border-t">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                      <span className="text-sm text-gray-600 truncate">{file.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                      disabled={isSubmitting}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Submit button */}
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={isSubmitting || !documentType || !file}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Отправка...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Отправить на проверку
                </>
              )}
            </Button>

            <p className="text-xs text-gray-400 text-center">
              Документ будет проверен модератором. Обычно это занимает несколько часов.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
