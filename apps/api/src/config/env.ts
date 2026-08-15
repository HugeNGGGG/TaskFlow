function read(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

export const env = {
  port: Number(read('PORT', '3000')),
  databaseUrl: read('DATABASE_URL'),
  jwtAccessSecret: read('JWT_ACCESS_SECRET', 'dev-access-secret'),
  jwtRefreshSecret: read('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
  jwtAccessTtl: read('JWT_ACCESS_TTL', '900'),
  jwtAccessTtlSeconds: Number(read('JWT_ACCESS_TTL', '900')),
  jwtRefreshTtlDays: Number(read('JWT_REFRESH_TTL_DAYS', '30')),
  wxAppId: read('WX_APPID'),
  wxSecret: read('WX_SECRET'),
  cosSecretId: read('COS_SECRET_ID'),
  cosSecretKey: read('COS_SECRET_KEY'),
  cosBucket: read('COS_BUCKET'),
  cosRegion: read('COS_REGION', 'ap-guangzhou'),
  publicBaseUrl: read('PUBLIC_BASE_URL', 'http://localhost:3000'),
  corsOrigins: read('CORS_ORIGINS', 'http://localhost:5173,http://localhost:8080')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  wxSubscribeTemplates: read('WX_SUBSCRIBE_TEMPLATES', '{}'),
  localStorageDir: read('LOCAL_STORAGE_DIR', ''),
};
