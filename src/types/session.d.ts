import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      username: string;
      full_name: string;
      role: 'superadmin' | 'staff';
    };
    success_msg?: string;
    error_msg?: string;
  }
}
