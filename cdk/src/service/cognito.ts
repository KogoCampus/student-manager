import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminInitiateAuthCommand,
  GetUserCommand,
  AuthenticationResultType,
  ListUsersCommand,
  GetUserCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import { settings } from '../settings';

function getCognitoClient(): { cognito: CognitoIdentityProviderClient; clientId: string; userPoolId: string } {
  const userPoolId = settings.cognito.userPoolId;
  const clientId = settings.cognito.clientId;

  const region = userPoolId.split('_')[0];
  if (!region) {
    throw new Error('Could not extract region from Cognito User Pool ID');
  }
  const cognito = new CognitoIdentityProviderClient({ region });

  return { cognito, clientId, userPoolId };
}

export async function createUserInCognito(email: string, password: string): Promise<AuthenticationResultType> {
  const { cognito, clientId, userPoolId } = getCognitoClient();

  const createUserCommand = new AdminCreateUserCommand({
    UserPoolId: userPoolId,
    Username: email,
    MessageAction: 'SUPPRESS',
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'email_verified', Value: 'true' },
    ],
  });

  const setPasswordCommand = new AdminSetUserPasswordCommand({
    UserPoolId: userPoolId,
    Username: email,
    Password: password,
    Permanent: true,
  });

  // Initiate authentication to get tokens (access, ID, refresh)
  const authCommand = new AdminInitiateAuthCommand({
    UserPoolId: userPoolId,
    ClientId: clientId,
    AuthFlow: 'ADMIN_NO_SRP_AUTH',
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });

  await cognito.send(createUserCommand);
  await cognito.send(setPasswordCommand);

  const authResponse = await cognito.send(authCommand);

  if (authResponse.AuthenticationResult) {
    const { AccessToken, IdToken, RefreshToken } = authResponse.AuthenticationResult;
    return { AccessToken, IdToken, RefreshToken };
  } else {
    throw new Error('Failed to authenticate the newly created user');
  }
}

export async function authenticateUser(email: string, password: string): Promise<AuthenticationResultType> {
  const { cognito, clientId, userPoolId } = getCognitoClient();

  const authCommand = new AdminInitiateAuthCommand({
    UserPoolId: userPoolId,
    ClientId: clientId,
    AuthFlow: 'ADMIN_NO_SRP_AUTH',
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });

  const authResponse = await cognito.send(authCommand);

  if (authResponse.AuthenticationResult) {
    const { AccessToken, IdToken, RefreshToken } = authResponse.AuthenticationResult;
    return { AccessToken, IdToken, RefreshToken };
  } else {
    throw new Error('Authentication failed');
  }
}

export async function getUserDetailsFromAccessToken(accessToken: string): Promise<{ username: string; email: string }> {
  const { cognito } = getCognitoClient();

  const getUserCommand = new GetUserCommand({
    AccessToken: accessToken,
  });

  let response: GetUserCommandOutput;
  try {
    response = await cognito.send(getUserCommand);
  } catch {
    throw new Error('Access token is invalid or expired.');
  }

  if (response && response.Username && response.UserAttributes) {
    const email = response.UserAttributes.find(attr => attr.Name === 'email')?.Value;

    return {
      username: response.Username,
      email: email || '',
    };
  } else {
    throw new Error('Failed to retrieve user details');
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const { cognito, clientId, userPoolId } = getCognitoClient();

  const command = new AdminInitiateAuthCommand({
    UserPoolId: userPoolId,
    ClientId: clientId,
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  });

  let response;
  try {
    response = await cognito.send(command);
  } catch {
    throw new Error('Refresh token is invalid or expired.');
  }

  if (response.AuthenticationResult && response.AuthenticationResult.AccessToken) {
    return response.AuthenticationResult.AccessToken;
  } else {
    throw new Error('Failed to refresh access token.');
  }
}

export async function doesUserExistByEmail(email: string): Promise<boolean> {
  const { cognito, userPoolId } = getCognitoClient();

  const listUsersCommand = new ListUsersCommand({
    UserPoolId: userPoolId,
    Filter: `email = "${email}"`,
  });
  const response = await cognito.send(listUsersCommand);
  return (response.Users && response.Users.length > 0) || false;
}

export async function resetUserPassword(email: string, newPassword: string): Promise<void> {
  const { cognito, userPoolId } = getCognitoClient();

  const command = new AdminSetUserPasswordCommand({
    UserPoolId: userPoolId,
    Username: email,
    Password: newPassword,
    Permanent: true,
  });

  await cognito.send(command);
}
