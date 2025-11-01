'use server';

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let appInitialized = false;

const getServiceAccount = () => {
  if (
    !process.env.SERVICE_ACCOUNT_PROJECT_ID ||
    !process.env.SERVICE_ACCOUNT_CLIENT_EMAIL ||
    !process.env.SERVICE_ACCOUNT_PRIVATE_KEY
  ) {
    throw new Error('Firebase Admin credentials are not set. Please configure SERVICE_ACCOUNT_* env vars.');
  }

  return {
    projectId: process.env.SERVICE_ACCOUNT_PROJECT_ID,
    clientEmail: process.env.SERVICE_ACCOUNT_CLIENT_EMAIL,
    privateKey: process.env.SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
};

const ensureInitialized = () => {
  if (!appInitialized) {
    const serviceAccount = getServiceAccount();
    if (getApps().length === 0) {
      initializeApp({
        credential: cert(serviceAccount),
      });
    }
    appInitialized = true;
  }
};

export const getAdminAuth = () => {
  ensureInitialized();

  return getAuth();
};

export const getAdminDb = () => {
  ensureInitialized();
  return getFirestore();
};
