import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

type UploadUrlRequest = {
  fileName?: string;
  contentType?: string;
  folder?: string;
};

// Genera una URL firmada de subida directa a Supabase Storage.
export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase admin client not configured' }, { status: 500 });
  }

  let body: UploadUrlRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { fileName, contentType, folder = 'raw' } = body;

  if (!fileName || !contentType) {
    return NextResponse.json({ error: 'fileName and contentType are required' }, { status: 400 });
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'spinpal-assets';
  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '') || 'raw';
  const path = `${safeFolder}/${Date.now()}-${fileName}`;

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(path, 60); // 60s para usarla

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Failed to create signed upload URL' }, { status: 500 });
  }

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;

  return NextResponse.json({ ...data, path, publicUrl });
}
