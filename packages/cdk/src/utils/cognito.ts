import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminDeleteUserCommand,
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

export async function createUserInCognito(email: string, username: string, password: string): Promise<void> {
  const { client, userPoolId } = getCognitoClient();

  // Create the user in Cognito (without setting a temporary password)
  const createUserCommand = new AdminCreateUserCommand({
    UserPoolId: userPoolId,
    Username: username,
    MessageAction: 'SUPPRESS',
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'email_verified', Value: 'true' },
    ],
  });

  try {
    await client.send(createUserCommand);

    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: username,
      Password: password,
      Permanent: true,
    });

    await client.send(setPasswordCommand);
  } catch (error) {
    // If setting the password fails, delete the created user
    if (error instanceof Error) {
      console.error(`Failed to set password for user ${username}: ${error.message}`);

      const deleteUserCommand = new AdminDeleteUserCommand({
        UserPoolId: userPoolId,
        Username: username,
      });
      try {
        await client.send(deleteUserCommand);
        console.log(`User ${username} deleted due to password set command failure.`);
      } catch (deleteError) {
        console.error(`Failed to undo creation of user ${username}: ${deleteError}`);
      }
    }

    throw new Error(`Failed to create user in Cognito: ${error}`);
  }
}
