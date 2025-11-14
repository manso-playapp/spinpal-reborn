import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;

function getServiceAccountConfig() {
  const projectId = process.env.SERVICE_ACCOUNT_PROJECT_ID;
  const clientEmail = process.env.SERVICE_ACCOUNT_CLIENT_EMAIL;
  const privateKey = process.env.SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin credentials are not set. Please configure SERVICE_ACCOUNT_* env vars.');
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

function initAdminApp() {
  if (adminApp) {
    return adminApp;
  }

  if (!getApps().length) {
    const serviceAccount = getServiceAccountConfig();
    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    adminApp = getApps()[0]!;
  }

  return adminApp;
}

export function getAdminAuth() {
  return getAuth(initAdminApp());
}

export function getAdminDb() {
  return getFirestore(initAdminApp());
}
