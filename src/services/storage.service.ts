import { Client as MinioClient } from 'minio';
import { env } from '../config/env';
import crypto from 'crypto';

function parseEndpoint(urlStr: string) {
  const u = new URL(urlStr);
  const useSSL = u.protocol === 'https:';
  const endPoint = u.hostname;
  const port = u.port ? parseInt(u.port, 10) : useSSL ? 443 : 80;
  return { endPoint, port, useSSL };
}

const { endPoint, port, useSSL } = parseEndpoint(env.STORAGE_ENDPOINT);

const client = new MinioClient({
  endPoint,
  port,
  useSSL,
  accessKey: env.STORAGE_ACCESS_KEY,
  secretKey: env.STORAGE_SECRET_KEY,
});

export async function generateObjectName(fileName: string) {
  const ext = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '';
  const key = crypto.randomUUID().replace(/-/g, '');
  const date = new Date().toISOString().slice(0, 10);
  return `uploads/${date}/${key}${ext}`;
}

export async function getPublicUrl(objectName: string) {
  return `${env.STORAGE_ENDPOINT}/${env.STORAGE_BUCKET}/${objectName}`;
}

export async function getPresignedPutUrl(objectName: string, expiresSeconds = 600) {
  const exp = parseInt(env.STORAGE_URL_EXPIRY, 10) || expiresSeconds;
  return client.presignedPutObject(env.STORAGE_BUCKET, objectName, exp);
}

export async function getPresignedGetUrl(objectName: string, expiresSeconds = 600) {
  const exp = parseInt(env.STORAGE_URL_EXPIRY, 10) || expiresSeconds;
  return client.presignedGetObject(env.STORAGE_BUCKET, objectName, exp);
}
