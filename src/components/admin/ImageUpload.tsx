
'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
  fieldName: string;
}

export function ImageUpload({ fieldName }: ImageUploadProps) {
  const { watch, setValue } = useFormContext();
  const { toast } = useToast();
  const imageUrl = watch(fieldName);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [inputValue, setInputValue] = useState(imageUrl || '');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setInputValue(imageUrl || '');
  }, [imageUrl]);

  const inferFolder = () => {
    if (fieldName.includes('border')) return 'border';
    if (fieldName.includes('center')) return 'center';
    if (fieldName.includes('mobile')) return 'mobile';
    if (fieldName.includes('background')) return 'background';
    return 'raw';
  };

  const validateAndSetImage = async (url: string) => {
    // Si la URL está vacía, simplemente limpiamos el campo sin mostrar error
    if (!url || url.trim() === '') {
      setValue(fieldName, '', { shouldDirty: true, shouldValidate: true });
      return;
    }

    try {
      setIsValidating(true);
      // Validar que es una URL válida
      new URL(url);
      
      // Intentar cargar la imagen
      await new Promise((resolve, reject) => {
        const img = document.createElement('img');
        img.onload = resolve;
        img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
        img.src = url;
      });

      setValue(fieldName, url, { shouldDirty: true, shouldValidate: true });
    } catch (error) {
      // Solo mostrar el error si había una URL ingresada
      if (url.trim() !== '') {
        console.error('Error validando la imagen:', error instanceof Error ? error.message : 'URL inválida');
        toast({
          variant: "destructive",
          title: "URL no válida",
          description: "Por favor, introduce una URL de imagen válida o deja el campo vacío.",
        });
      }
      setValue(fieldName, '', { shouldDirty: true, shouldValidate: true });
    } finally {
      setIsValidating(false);
    }
  };

  const clearImage = () => {
    setValue(fieldName, '', { shouldDirty: true, shouldValidate: true });
  };

  const handleFileUpload = async (file: File) => {
    const maxSizeMB = 8;
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Archivo no válido', description: 'Solo se permiten imágenes (png, jpg, webp, svg).' });
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Archivo muy grande', description: `Máximo ${maxSizeMB} MB.` });
      return;
    }

    setIsUploading(true);
    const fileNameSafe = file.name.replace(/\s+/g, '-').toLowerCase();
    const contentType = file.type || 'application/octet-stream';
    const folder = inferFolder();

    try {
      const res = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: fileNameSafe, contentType, folder }),
      });

      if (!res.ok) {
        throw new Error('No se pudo generar la URL de carga');
      }

      const { signedUrl, publicUrl } = await res.json();
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Falló la subida a Supabase');
      }

      setValue(fieldName, publicUrl, { shouldDirty: true, shouldValidate: true });
      toast({ title: 'Imagen subida', description: 'Se guardó la URL pública.' });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ variant: 'destructive', title: 'No se pudo subir la imagen', description: error?.message || 'Intenta nuevamente.' });
    } finally {
      setIsUploading(false);
    }
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => validateAndSetImage(inputValue)}
          placeholder="Pega una URL externa de imagen"
          disabled={isValidating || isUploading}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? 'Subiendo...' : 'Subir'}
        </Button>
      </div>
      {imageUrl && (
        <div className="relative group w-48 h-48 border rounded-md p-2 bg-muted/50 flex items-center justify-center">
            <div className="relative w-full h-full">
              <Image
                  src={imageUrl}
                  alt="Vista previa"
                  fill
                  className="object-contain rounded-sm"
                  unoptimized
                  onError={() => {
                      console.warn('Error al cargar la imagen:', imageUrl);
                      toast({
                          variant: "destructive",
                          title: "Error de imagen",
                          description: "No se puede cargar la imagen. Verifica que la URL sea correcta.",
                      });
                  }}
              />
            </div>
            <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={clearImage}
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
      )}
      {!imageUrl && (
        <div className="w-48 h-48 border border-dashed rounded-md p-2 bg-muted/20 flex flex-col items-center justify-center text-muted-foreground text-sm">
            <ImageIcon className="h-8 w-8 mb-2" />
            <span>Sin imagen</span>
        </div>
      )}
    </div>
  );
}
