const required = (name: string, fallback?: string) => {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`缺少環境變數：${name}`);
  }

  return value;
};

export const APP_CONFIG = {
  apiBaseUrl: required(
    'EXPO_PUBLIC_API_BASE_URL',
    'https://p9qp37v2vb.execute-api.us-east-1.amazonaws.com'
  ).replace(/\/$/, ''),
  cognitoRegion: required('EXPO_PUBLIC_COGNITO_REGION', 'us-east-1'),
  cognitoUserPoolId: required(
    'EXPO_PUBLIC_COGNITO_USER_POOL_ID',
    'us-east-1_n10QbdFwk'
  ),
  cognitoClientId: required(
    'EXPO_PUBLIC_COGNITO_CLIENT_ID',
    '7hkhtohqd42ii21h874uqblq4s'
  ),
};
