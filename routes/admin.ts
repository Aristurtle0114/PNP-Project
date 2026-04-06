import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { isAuthenticated, isSuperAdmin } from '../middleware/auth.js';

const router = Router();

// Public Admin Routes
router.get('/login', adminController.getLogin);
router.post('/login', adminController.postLogin);
router.get('/logout', adminController.getLogout);
router.get('/force-login', (req: any, res) => {
  req.session.user = { id: 'superadmin', username: 'superadmin', full_name: 'Super Administrator', role: 'superadmin' };
  req.session.save(() => res.redirect('/admin/dashboard'));
});

// Protected Admin Routes
router.use(isAuthenticated);

router.get('/dashboard', adminController.getDashboard);

// Reports
router.get('/reports', adminController.getReports);
router.get('/reports/:id', adminController.getReportDetail);
router.post('/reports/:id/update', adminController.updateReportStatus);

// Bulletins
router.get('/bulletins', adminController.getBulletins);
router.get('/bulletins/create', adminController.getCreateBulletin);
router.post('/bulletins/create', adminController.postCreateBulletin);
router.get('/bulletins/:id/edit', adminController.getEditBulletin);
router.post('/bulletins/:id/edit', adminController.postEditBulletin);
router.post('/bulletins/:id/delete', adminController.deleteBulletin);

// Tips
router.get('/tips', adminController.getTips);
router.post('/tips/:id/update', adminController.updateTip);

// Map
router.get('/map', adminController.getMap);
router.post('/map/add', adminController.postMapPoint);

// Hotlines
router.get('/hotlines', adminController.getHotlines);
router.post('/hotlines/add', adminController.postHotline);
router.post('/hotlines/:id/delete', adminController.deleteHotline);

// Superadmin Only
router.get('/users', isSuperAdmin, adminController.getUsers);
router.post('/users/add', isSuperAdmin, adminController.postUser);
router.get('/audit-log', isSuperAdmin, adminController.getAuditLog);

export default router;
