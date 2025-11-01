import 'server-only';

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let appsInitialized = false;

const getServiceAccount = () => {
  if (
    !process.env.SERVICE_ACCOUNT_PROJECT_ID ||
    !process.env.SERVICE_ACCOUNT_CLIENT_EMAIL ||
    !process.env.SERVICE_ACCOUNT_PRIVATE_KEY
  ) {
    throw new Error(
      'Firebase Admin credentials are not set. Please configure SERVICE_ACCOUNT_* env vars.',
    );
  }

  return {
    projectId: process.env.SERVICE_ACCOUNT_PROJECT_ID,
    clientEmail: process.env.SERVICE_ACCOUNT_CLIENT_EMAIL,
    privateKey: process.env.SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
};

const ensureInitialized = () => {
  if (!appsInitialized) {
    const serviceAccount = getServiceAccount();
    if (getApps().length === 0) {
      initializeApp({
        credential: cert(serviceAccount),
      });
    }
    appsInitialized = true;
  }
};

export const getAdminAuth = async () => {
  ensureInitialized();
  return getAuth();
};

export const getAdminDb = async () => {
  ensureInitialized();
  return getFirestore();
};
