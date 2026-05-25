import dotenv from 'dotenv';
dotenv.config();

const optional = (key: string, fallback: string): string =>
  process.env[key] ?? fallback;

export const env = {
  port: parseInt(optional('PORT', '5000'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),
  isDev: optional('NODE_ENV', 'development') === 'development',

  mongoUri: (() => {
    const v = process.env.MONGODB_URI;
    if (!v) throw new Error('Missing required env var: MONGODB_URI');
    return v;
  })(),

  jwtSecret: (() => {
    const v = process.env.JWT_SECRET;
    if (!v || v.length < 32) throw new Error('JWT_SECRET missing or too short (min 32 chars)');
    return v;
  })(),
  jwtExpiresIn: optional('JWT_EXPIRES_IN', '15m'),
  jwtRefreshSecret: (() => {
    const v = process.env.JWT_REFRESH_SECRET;
    if (!v || v.length < 32) throw new Error('JWT_REFRESH_SECRET missing or too short (min 32 chars)');
    return v;
  })(),
  jwtRefreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN', '7d'),

  awsRegion: optional('AWS_REGION', 'ap-southeast-1'),
  awsAccessKeyId: optional('AWS_ACCESS_KEY_ID', ''),
  awsSecretAccessKey: optional('AWS_SECRET_ACCESS_KEY', ''),
  awsS3Bucket: optional('AWS_S3_BUCKET', 'edustack-uploads'),
  s3Enabled: optional('AWS_ACCESS_KEY_ID', '') !== '',

  frontendUrl: optional('FRONTEND_URL', 'http://localhost:5173'),
  baseDomain: optional('BASE_DOMAIN', 'edustack.pk'),
  vercelPreviewUrl: optional('VERCEL_PREVIEW_URL', ''),
};

