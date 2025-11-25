import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const { gameId, customerId, winningId, prizeName, isRealPrize, useStockControl } = await req.json();

    if (!gameId || !customerId || !winningId) {
      return NextResponse.json({ success: false, message: 'Faltan parámetros obligatorios.' }, { status: 400 });
    }

    const db = await getAdminDb();
    const gameRef = db.collection('games').doc(String(gameId));
    const customerRef = gameRef.collection('customers').doc(String(customerId));

    await db.runTransaction(async (tx) => {
      const gameSnap = await tx.get(gameRef);
      if (!gameSnap.exists) {
        throw new Error('Juego no encontrado.');
      }

      const gameData = gameSnap.data() || {};
      const segments = Array.isArray(gameData.segments) ? [...gameData.segments] : [];

      const updates: Record<string, any> = {
        spinRequest: {
          timestamp: FieldValue.serverTimestamp(),
          customerId,
          winningId,
        },
        plays: FieldValue.increment(1),
      };

      if (isRealPrize) {
        updates.prizesAwarded = FieldValue.increment(1);
        if (useStockControl) {
          const idx = segments.findIndex((s: any) => s && s.id === winningId);
          if (idx !== -1) {
            const current = segments[idx];
            const qty = typeof current.quantity === 'number' ? current.quantity : 0;
            segments[idx] = { ...current, quantity: Math.max(0, qty - 1) };
            updates.segments = segments;
          }
        }
      }

      tx.update(gameRef, updates);

      const customerUpdate: Record<string, any> = { hasPlayed: true };
      if (isRealPrize && prizeName) {
        customerUpdate.prizeWonName = prizeName;
        customerUpdate.prizeWonAt = FieldValue.serverTimestamp();
      }
      tx.set(customerRef, customerUpdate, { merge: true });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in /api/spin:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Error inesperado.' }, { status: 500 });
  }
}
