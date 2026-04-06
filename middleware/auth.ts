import { Request, Response, NextFunction } from 'express';

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  console.log('Checking authentication for:', req.originalUrl);
  console.log('Session ID:', req.sessionID);
  console.log('Cookies received:', req.cookies);
  console.log('User in session:', req.session ? req.session.user : 'No session');
  
  if (req.session && req.session.user) {
    console.log('Authenticated user:', req.session.user.username);
    return next();
  }
  console.log('Unauthenticated access attempt to:', req.originalUrl);
  res.redirect('/admin/login');
};

export const isSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  console.log('Checking superadmin role for user:', req.session?.user?.username);
  if (req.session && req.session.user && req.session.user.role === 'superadmin') {
    return next();
  }
  console.log('Access denied: Not a superadmin');
  req.session.error_msg = 'Access denied. Superadmin only.';
  res.redirect('/admin/dashboard');
};
