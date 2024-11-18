import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminInitiateAuthCommand,
  GetUserCommand,
  AuthenticationResultType,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';

function getCognitoClient(): { cognito: CognitoIdentityProviderClient; clientId: string; userPoolId: string } {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;
  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID environment variable is not set');
  }
  if (!clientId) {
    throw new Error('COGNITO_CLIENT_ID environment variable is not set');
  }

  const region = userPoolId.split('_')[0];
  if (!region) {
    throw new Error('Could not extract region from Cognito User Pool ID');
  }
  const cognito = new CognitoIdentityProviderClient({ region });

  return { cognito, clientId, userPoolId };
}

export async function createUserInCognito(email: string, username: string, password: string): Promise<AuthenticationResultType> {
  const { cognito, clientId, userPoolId } = getCognitoClient();

  const createUserCommand = new AdminCreateUserCommand({
    UserPoolId: userPoolId,
    Username: username,
    MessageAction: 'SUPPRESS',
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'email_verified', Value: 'true' },
    ],
  });

  const setPasswordCommand = new AdminSetUserPasswordCommand({
    UserPoolId: userPoolId,
    Username: username,
    Password: password,
    Permanent: true,
  });

  // Initiate authentication to get tokens (access, ID, refresh)
  const authCommand = new AdminInitiateAuthCommand({
    UserPoolId: userPoolId,
    ClientId: clientId,
    AuthFlow: 'ADMIN_NO_SRP_AUTH',
    AuthParameters: {
      USERNAME: username,
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

export async function authenticateUser(username: string, password: string): Promise<AuthenticationResultType> {
  const { cognito, clientId, userPoolId } = getCognitoClient();

  const authCommand = new AdminInitiateAuthCommand({
    UserPoolId: userPoolId,
    ClientId: clientId,
    AuthFlow: 'ADMIN_NO_SRP_AUTH',
    AuthParameters: {
      USERNAME: username,
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

  const response = await cognito.send(getUserCommand);

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

export async function decodeIdToken(idToken: string): Promise<{ username: string; email: string }> {
  try {
    // Decode the Base64 string
    const decodedString = Buffer.from(idToken, 'base64').toString('utf-8');

    // Split the decoded string into username and email
    const [username, email] = decodedString.split(':');

    if (!username || !email) {
      throw new Error('Invalid token format. Expected "username:email".');
    }

    return { username, email };
  } catch (error) {
    throw new Error(`Failed to decode ID token: ${error.message}`);
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

  const response = await cognito.send(command);

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

export async function resetUserPassword(username: string, newPassword: string): Promise<void> {
  const { cognito, userPoolId } = getCognitoClient();

  const command = new AdminSetUserPasswordCommand({
    UserPoolId: userPoolId,
    Username: username,
    Password: newPassword,
    Permanent: true,
  });

  await cognito.send(command);
}
