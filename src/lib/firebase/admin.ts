import 'server-only';

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let appsInitialized = false;

const getServiceAccount = () => {
  const requiredKeys = [
    'SERVICE_ACCOUNT_PROJECT_ID',
    'SERVICE_ACCOUNT_CLIENT_EMAIL',
    'SERVICE_ACCOUNT_PRIVATE_KEY',
  ] as const;

  const missing = requiredKeys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Firebase Admin credentials are not set. Faltan: ${missing.join(
        ', ',
      )}. Configura SERVICE_ACCOUNT_* en tus variables de entorno.`,
    );
  }

  return {
    projectId: process.env.SERVICE_ACCOUNT_PROJECT_ID as string,
    clientEmail: process.env.SERVICE_ACCOUNT_CLIENT_EMAIL as string,
    privateKey: (process.env.SERVICE_ACCOUNT_PRIVATE_KEY as string).replace(/\\n/g, '\n'),
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
