import {
  confirmSignUp,
  fetchUserAttributes,
  getCurrentUser,
  resendSignUpCode,
  signIn,
  signOut,
  signUp,
} from "aws-amplify/auth";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function registerUser(email: string, password: string) {
  const username = normalizeEmail(email);

  return signUp({
    username,
    password,
    options: {
      userAttributes: { email: username },
    },
  });
}

export function confirmUserRegistration(email: string, confirmationCode: string) {
  return confirmSignUp({
    username: normalizeEmail(email),
    confirmationCode: confirmationCode.trim(),
  });
}

export function resendRegistrationCode(email: string) {
  return resendSignUpCode({ username: normalizeEmail(email) });
}

export function loginUser(email: string, password: string) {
  return signIn({
    username: normalizeEmail(email),
    password,
  });
}

export async function getAuthenticatedUser() {
  const [user, attributes] = await Promise.all([
    getCurrentUser(),
    fetchUserAttributes(),
  ]);

  return {
    username: user.username,
    email: attributes.email,
  };
}

export function logoutUser() {
  return signOut();
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  AliasExistsException: "このメールアドレスはすでに使用されています。",
  CodeMismatchException: "確認コードが正しくありません。もう一度お試しください。",
  ExpiredCodeException: "確認コードの有効期限が切れています。コードを再送してください。",
  InvalidPasswordException: "パスワードが登録画面に記載された要件を満たしていません。",
  LimitExceededException: "試行回数の上限に達しました。しばらく待ってからお試しください。",
  NotAuthorizedException: "メールアドレスまたはパスワードが正しくありません。",
  PasswordResetRequiredException: "パスワードの再設定が必要です。",
  TooManyRequestsException: "リクエストが多すぎます。しばらく待ってからお試しください。",
  UserAlreadyAuthenticatedException: "すでにログインしています。",
  UsernameExistsException: "このメールアドレスはすでに登録されています。",
  UserNotConfirmedException: "メールアドレスの確認が完了していません。",
  UserNotFoundException: "メールアドレスまたはパスワードが正しくありません。",
};

export function getAuthErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return AUTH_ERROR_MESSAGES[error.name] ?? "認証処理に失敗しました。時間をおいてもう一度お試しください。";
  }

  return "認証処理に失敗しました。時間をおいてもう一度お試しください。";
}
