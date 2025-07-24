
'use client';

import { useState, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { storage } from '@/lib/firebase/config';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import NextImage from 'next/image';

interface ImageUploadProps {
  fieldName: string;
  gameId: string;
}

export function ImageUpload({ fieldName, gameId }: ImageUploadProps) {
  const { watch, setValue } = useFormContext();
  const imageUrl = watch(fieldName);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUpload = (file: File) => {
    if (!storage) {
      toast({
        variant: 'destructive',
        title: 'Error de Configuración',
        description: 'Firebase Storage no está configurado. Revisa tus variables de entorno.',
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
        toast({
            variant: "destructive",
            title: "Archivo no válido",
            description: "Por favor, selecciona un archivo de imagen.",
        });
        return;
    }

    const storageRef = ref(storage, `games/${gameId}/${fieldName}-${Date.now()}-${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        setUploadProgress(null);
        toast({
          variant: 'destructive',
          title: 'Error al subir',
          description: `Hubo un problema al subir la imagen: ${error.message}`,
        });
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          setValue(fieldName, downloadURL, { shouldDirty: true, shouldValidate: true });
          setUploadProgress(null);
          toast({
            title: '¡Imagen Subida!',
            description: 'La URL de la imagen se ha actualizado.',
          });
        });
      }
    );
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const clearImage = () => {
    setValue(fieldName, '', { shouldDirty: true, shouldValidate: true });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={imageUrl || ''}
          onChange={(e) => setValue(fieldName, e.target.value, { shouldDirty: true, shouldValidate: true })}
          placeholder="Pega una URL o sube una imagen"
          disabled={uploadProgress !== null}
        />
        <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadProgress !== null}
            aria-label="Subir imagen"
            >
            <Upload className="h-4 w-4" />
        </Button>
         <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
        />
      </div>
      {uploadProgress !== null && (
        <div className="flex items-center gap-2">
            <Progress value={uploadProgress} className="w-full h-2" />
            <span className="text-xs font-mono">{Math.round(uploadProgress)}%</span>
        </div>
      )}
      {imageUrl && (
        <div className="relative group w-48 h-48 border rounded-md p-2 bg-muted/50 flex items-center justify-center">
            <NextImage
                src={imageUrl}
                alt="Vista previa"
                width={192}
                height={192}
                className="object-contain w-full h-full rounded-sm"
                unoptimized
            />
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
