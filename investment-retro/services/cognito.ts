import { APP_CONFIG } from '@/config/env';

const COGNITO_ENDPOINT = `https://cognito-idp.${APP_CONFIG.cognitoRegion}.amazonaws.com/`;

export type AuthSession = {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresAt: number;
  username: string;
};

export type NewPasswordChallenge = {
  type: 'NEW_PASSWORD_REQUIRED';
  username: string;
  session: string;
};

export type SignInResult =
  | { type: 'AUTHENTICATED'; session: AuthSession }
  | NewPasswordChallenge;

type CognitoAuthenticationResult = {
  AccessToken?: string;
  IdToken?: string;
  RefreshToken?: string;
  ExpiresIn?: number;
};

type CognitoAuthResponse = {
  AuthenticationResult?: CognitoAuthenticationResult;
  ChallengeName?: string;
  Session?: string;
  message?: string;
  __type?: string;
};

export class CognitoError extends Error {
  readonly code: string;

  constructor(message: string, code = 'CognitoError') {
    super(message);
    this.name = 'CognitoError';
    this.code = code;
  }
}

function friendlyMessage(code: string, fallback: string) {
  switch (code) {
    case 'NotAuthorizedException':
      return 'Email 或密碼不正確。';
    case 'UserNotFoundException':
      return '找不到這個帳號。';
    case 'UserNotConfirmedException':
      return '這個帳號尚未完成驗證。';
    case 'PasswordResetRequiredException':
      return '這個帳號需要先重設密碼。';
    case 'TooManyRequestsException':
      return '嘗試次數太多，請稍後再試。';
    case 'InvalidParameterException':
      return '登入資料格式不正確。';
    case 'UsernameExistsException':
      return '這個 Email 已經被註冊了。';
    case 'InvalidPasswordException':
      return '密碼格式不符合要求（至少 8 個字元，包含大小寫和數字）。';
    case 'CodeMismatchException':
      return '驗證碼不正確，請再試一次。';
    case 'ExpiredCodeException':
      return '驗證碼已過期，請重新發送。';
    case 'LimitExceededException':
      return '嘗試次數過多，請稍後再試。';
    default:
      return fallback || 'Cognito 驗證失敗。';
  }
}

async function cognitoRequest(
  target: 'InitiateAuth' | 'RespondToAuthChallenge' | 'SignUp' | 'ConfirmSignUp' | 'ResendConfirmationCode',
  body: Record<string, unknown>
): Promise<CognitoAuthResponse> {
  const response = await fetch(COGNITO_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-amz-json-1.1',
      'x-amz-target': `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as CognitoAuthResponse) : {};

  if (!response.ok) {
    const code = (data.__type ?? 'CognitoError').split('#').pop() ?? 'CognitoError';
    throw new CognitoError(friendlyMessage(code, data.message ?? ''), code);
  }

  return data;
}

function toSession(
  result: CognitoAuthenticationResult,
  username: string,
  existingRefreshToken?: string
): AuthSession {
  if (!result.AccessToken) {
    throw new CognitoError('Cognito 沒有回傳 Access Token。');
  }

  return {
    accessToken: result.AccessToken,
    idToken: result.IdToken,
    refreshToken: result.RefreshToken ?? existingRefreshToken,
    expiresAt: Date.now() + (result.ExpiresIn ?? 3600) * 1000,
    username,
  };
}

export async function signInWithPassword(
  username: string,
  password: string
): Promise<SignInResult> {
  const data = await cognitoRequest('InitiateAuth', {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: APP_CONFIG.cognitoClientId,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  });

  if (data.AuthenticationResult) {
    return {
      type: 'AUTHENTICATED',
      session: toSession(data.AuthenticationResult, username),
    };
  }

  if (data.ChallengeName === 'NEW_PASSWORD_REQUIRED' && data.Session) {
    return {
      type: 'NEW_PASSWORD_REQUIRED',
      username,
      session: data.Session,
    };
  }

  throw new CognitoError(`尚未支援的登入挑戰：${data.ChallengeName ?? 'unknown'}`);
}

export async function completeNewPassword(
  challenge: NewPasswordChallenge,
  newPassword: string
): Promise<AuthSession> {
  const data = await cognitoRequest('RespondToAuthChallenge', {
    ChallengeName: 'NEW_PASSWORD_REQUIRED',
    ClientId: APP_CONFIG.cognitoClientId,
    Session: challenge.session,
    ChallengeResponses: {
      USERNAME: challenge.username,
      NEW_PASSWORD: newPassword,
    },
  });

  if (!data.AuthenticationResult) {
    throw new CognitoError('新密碼設定完成，但沒有取得登入 Token。');
  }

  return toSession(data.AuthenticationResult, challenge.username);
}

export async function refreshAuthSession(session: AuthSession): Promise<AuthSession> {
  if (!session.refreshToken) {
    throw new CognitoError('登入已過期，請重新登入。', 'MissingRefreshToken');
  }

  const data = await cognitoRequest('InitiateAuth', {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    ClientId: APP_CONFIG.cognitoClientId,
    AuthParameters: {
      REFRESH_TOKEN: session.refreshToken,
    },
  });

  if (!data.AuthenticationResult) {
    throw new CognitoError('無法更新登入狀態，請重新登入。');
  }

  return toSession(data.AuthenticationResult, session.username, session.refreshToken);
}

// === Sign Up ===

/**
 * Sign up a new user.
 * Since the User Pool uses email as username, the caller should pass
 * a valid email format (can be fake like "user@inv.local").
 * Auto-confirms the user via admin API workaround since email verification is disabled.
 */
export async function signUp(
  username: string,
  password: string
): Promise<{ userConfirmed: boolean; username: string }> {
  // Ensure username looks like an email (Cognito requirement)
  const email = username.includes('@') ? username : `${username}@inv.local`;

  const response = await fetch(COGNITO_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-amz-json-1.1',
      'x-amz-target': 'AWSCognitoIdentityProviderService.SignUp',
    },
    body: JSON.stringify({
      ClientId: APP_CONFIG.cognitoClientId,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
      ],
    }),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const code = (data.__type ?? 'CognitoError').split('#').pop() ?? 'CognitoError';
    throw new CognitoError(friendlyMessage(code, data.message ?? ''), code);
  }

  return {
    userConfirmed: data.UserConfirmed ?? false,
    username: email,
  };
}

export async function confirmSignUp(
  email: string,
  code: string
): Promise<void> {
  const response = await fetch(COGNITO_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-amz-json-1.1',
      'x-amz-target': 'AWSCognitoIdentityProviderService.ConfirmSignUp',
    },
    body: JSON.stringify({
      ClientId: APP_CONFIG.cognitoClientId,
      Username: email,
      ConfirmationCode: code,
    }),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const errCode = (data.__type ?? 'CognitoError').split('#').pop() ?? 'CognitoError';
    throw new CognitoError(friendlyMessage(errCode, data.message ?? ''), errCode);
  }
}

export async function resendConfirmationCode(email: string): Promise<void> {
  const response = await fetch(COGNITO_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-amz-json-1.1',
      'x-amz-target': 'AWSCognitoIdentityProviderService.ResendConfirmationCode',
    },
    body: JSON.stringify({
      ClientId: APP_CONFIG.cognitoClientId,
      Username: email,
    }),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const errCode = (data.__type ?? 'CognitoError').split('#').pop() ?? 'CognitoError';
    throw new CognitoError(friendlyMessage(errCode, data.message ?? ''), errCode);
  }
}
