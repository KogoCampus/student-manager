export class CustomPasswordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomPasswordError';
  }
}

export async function checkPasswordPolicy(password: string): Promise<void> {
  if (password.length < 8) {
    throw new CustomPasswordError('Password must be at least 8 characters');
  }

  if (password.length > 20) {
    throw new CustomPasswordError('Password cannot exceed 20 characters');
  }

  if (!/[A-Z]/.test(password)) {
    throw new CustomPasswordError('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    throw new CustomPasswordError('Password must contain at least one lowercase letter');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    throw new CustomPasswordError('Password must contain at least one special character');
  }

  if (!/[0-9]/.test(password)) {
    throw new CustomPasswordError('Password must contain at least one number');
  }
}
