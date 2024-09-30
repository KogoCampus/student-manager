import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminDeleteUserCommand,
  AdminInitiateAuthCommand,
  GetUserCommand,
  AuthenticationResultType,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';

function getCognitoClient(): { client: CognitoIdentityProviderClient; userPoolId: string } {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID environment variable is not set');
  }

  const region = userPoolId.split('_')[0];
  if (!region) {
    throw new Error('Could not extract region from Cognito User Pool ID');
  }

  const client = new CognitoIdentityProviderClient({ region });

  return { client, userPoolId };
}

export async function createUserInCognito(
  email: string,
  username: string,
  password: string,
  schoolKey: string,
): Promise<AuthenticationResultType> {
  const { client, userPoolId } = getCognitoClient();
  const clientId = process.env.COGNITO_CLIENT_ID; // The client ID for your Cognito app client

  // Create the user in Cognito (without sending a temporary password email)
  const createUserCommand = new AdminCreateUserCommand({
    UserPoolId: userPoolId,
    Username: username,
    MessageAction: 'SUPPRESS',
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'email_verified', Value: 'true' },
      { Name: 'custom:schoolKey', Value: schoolKey },
    ],
  });

  try {
    await client.send(createUserCommand);

    // Set the password to permanent
    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: username,
      Password: password,
      Permanent: true,
    });

    await client.send(setPasswordCommand);

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

    const authResponse = await client.send(authCommand);

    if (authResponse.AuthenticationResult) {
      const { AccessToken, IdToken, RefreshToken } = authResponse.AuthenticationResult;
      return { AccessToken, IdToken, RefreshToken };
    } else {
      throw new Error('Failed to authenticate the newly created user');
    }
  } catch (error) {
    // If an error occurs, delete the user to clean up
    if (error instanceof Error) {
      console.error(`Failed to set password for user ${username}: ${error.message}`);

      const deleteUserCommand = new AdminDeleteUserCommand({
        UserPoolId: userPoolId,
        Username: username,
      });
      try {
        await client.send(deleteUserCommand);
        console.log(`User ${username} deleted due to error.`);
      } catch (deleteError) {
        console.error(`Failed to delete user ${username}: ${deleteError}`);
      }
    }

    throw new Error(`Failed to create user in Cognito: ${error}`);
  }
}

export async function authenticateUser(username: string, password: string): Promise<AuthenticationResultType> {
  const { client, userPoolId } = getCognitoClient();
  const clientId = process.env.COGNITO_CLIENT_ID; // The client ID for your Cognito app client

  const authCommand = new AdminInitiateAuthCommand({
    UserPoolId: userPoolId,
    ClientId: clientId,
    AuthFlow: 'ADMIN_NO_SRP_AUTH',
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  });

  try {
    const authResponse = await client.send(authCommand);

    if (authResponse.AuthenticationResult) {
      const { AccessToken, IdToken, RefreshToken } = authResponse.AuthenticationResult;
      return { AccessToken, IdToken, RefreshToken };
    } else {
      throw new Error('Authentication failed');
    }
  } catch (error) {
    console.error(`Failed to authenticate user ${username}: ${error}`);
    throw new Error('Authentication failed');
  }
}

export async function getUserDetailsFromAccessToken(accessToken: string): Promise<{ username: string; email: string; schoolKey: string }> {
  const { client } = getCognitoClient();

  try {
    const getUserCommand = new GetUserCommand({
      AccessToken: accessToken,
    });

    const response = await client.send(getUserCommand);

    if (response && response.Username && response.UserAttributes) {
      const email = response.UserAttributes.find(attr => attr.Name === 'email')?.Value;
      const schoolKey = response.UserAttributes.find(attr => attr.Name === 'custom:schoolKey')?.Value;

      return {
        username: response.Username,
        email: email || '',
        schoolKey: schoolKey || '',
      };
    } else {
      throw new Error('Failed to retrieve user details');
    }
  } catch (error) {
    console.error('Error fetching user details:', error);
    throw new Error('Invalid or expired access token');
  }
}

export async function doesUserExistByEmail(email: string): Promise<boolean> {
  const { client, userPoolId } = getCognitoClient();
  try {
    const listUsersCommand = new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${email}"`,
    });
    const response = await client.send(listUsersCommand);
    return (response.Users && response.Users.length > 0) || false;
  } catch (error) {
    console.error('Error checking if user exists:', error);
    throw new Error('Failed to verify if user exists.');
  }
}

export async function resetUserPassword(username: string, newPassword: string): Promise<void> {
  const { client, userPoolId } = getCognitoClient();

  try {
    const command = new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: username,
      Password: newPassword,
      Permanent: true,
    });

    await client.send(command);
  } catch (error) {
    console.error('Error resetting password:', error);
    throw new Error('Failed to reset user password.');
  }
}
