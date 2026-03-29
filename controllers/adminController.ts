import { Request, Response } from 'express';
import db from '../config/db.ts';
import bcrypt from 'bcryptjs';

export const getLogin = (req: Request, res: Response) => {
  if (req.session.user) return res.redirect('/admin/dashboard');
  res.render('admin/login', { title: 'Admin Login', layout: false });
};

export const postLogin = (req: Request, res: Response) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (user && bcrypt.compareSync(password, user.password_hash)) {
    req.session.user = { id: user.id, username: user.username, full_name: user.full_name, role: user.role };
    res.redirect('/admin/dashboard');
  } else {
    res.render('admin/login', { title: 'Admin Login', layout: false, error: 'Invalid username or password' });
  }
};

export const getLogout = (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
};

export const getDashboard = (req: Request, res: Response) => {
  const stats = {
    totalReports: db.prepare('SELECT COUNT(*) as count FROM incident_reports').get().count,
    pendingReports: db.prepare("SELECT COUNT(*) as count FROM incident_reports WHERE status = 'Received'").get().count,
    reportsThisMonth: db.prepare("SELECT COUNT(*) as count FROM incident_reports WHERE strftime('%m', created_at) = strftime('%m', 'now')").get().count,
    activeBulletins: db.prepare('SELECT COUNT(*) as count FROM bulletins WHERE is_archived = 0').get().count,
    tipsReceived: db.prepare('SELECT COUNT(*) as count FROM anonymous_tips').get().count,
    resolvedCases: db.prepare("SELECT COUNT(*) as count FROM incident_reports WHERE status = 'Resolved'").get().count,
  };

  // Data for charts
  const reportsByType = db.prepare(`
    SELECT type, COUNT(*) as count 
    FROM incident_reports 
    GROUP BY type
  `).all();

  const reportsByMonth = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count 
    FROM incident_reports 
    GROUP BY month 
    ORDER BY month DESC 
    LIMIT 6
  `).all().reverse();

  const recentReports = db.prepare('SELECT * FROM incident_reports ORDER BY created_at DESC LIMIT 5').all();
  const recentTips = db.prepare('SELECT * FROM anonymous_tips ORDER BY created_at DESC LIMIT 5').all();
  const recentLogs = db.prepare(`
    SELECT audit_logs.*, users.username 
    FROM audit_logs 
    JOIN users ON audit_logs.admin_id = users.id 
    ORDER BY timestamp DESC 
    LIMIT 5
  `).all();

  res.render('admin/dashboard', { 
    title: 'Dashboard', 
    stats, 
    reportsByType, 
    reportsByMonth, 
    recentReports, 
    recentTips, 
    recentLogs,
    layout: 'layouts/admin' 
  });
};

export const getReports = (req: Request, res: Response) => {
  const { status, type, page = 1 } = req.query;
  const limit = 10;
  const offset = (Number(page) - 1) * limit;

  let query = 'SELECT * FROM incident_reports WHERE 1=1';
  const params: any[] = [];

  if (status) { query += ' AND status = ?'; params.push(status); }
  if (type) { query += ' AND type = ?'; params.push(type); }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const reports = db.prepare(query).all(...params);
  res.render('admin/reports', { title: 'Incident Reports', reports, status, type, page: Number(page), layout: 'layouts/admin' });
};

export const getReportDetail = (req: Request, res: Response) => {
  const report = db.prepare('SELECT * FROM incident_reports WHERE id = ?').get(req.params.id);
  if (!report) return res.status(404).send('Report not found');
  res.render('admin/report_detail', { title: 'Report Detail', report, layout: 'layouts/admin' });
};

export const updateReportStatus = (req: Request, res: Response) => {
  const { status, internal_notes } = req.body;
  const update = db.prepare('UPDATE incident_reports SET status = ?, internal_notes = ? WHERE id = ?');
  update.run(status, internal_notes, req.params.id);
  
  // Audit Log
  const insertAudit = db.prepare('INSERT INTO audit_logs (admin_id, action, target_table, target_id) VALUES (?, ?, ?, ?)');
  insertAudit.run(req.session.user.id, `Updated status to ${status}`, 'incident_reports', req.params.id);

  res.redirect(`/admin/reports/${req.params.id}`);
};

export const getBulletins = (req: Request, res: Response) => {
  const bulletins = db.prepare('SELECT * FROM bulletins ORDER BY created_at DESC').all();
  res.render('admin/bulletins', { title: 'Manage Bulletins', bulletins, layout: 'layouts/admin' });
};

export const getCreateBulletin = (req: Request, res: Response) => {
  res.render('admin/bulletin_form', { title: 'New Bulletin', bulletin: null, layout: 'layouts/admin' });
};

export const postCreateBulletin = (req: Request, res: Response) => {
  const { title, category, body } = req.body;
  const insert = db.prepare('INSERT INTO bulletins (title, category, body, posted_by) VALUES (?, ?, ?, ?)');
  insert.run(title, category, body, req.session.user.id);
  res.redirect('/admin/bulletins');
};

export const getEditBulletin = (req: Request, res: Response) => {
  const bulletin = db.prepare('SELECT * FROM bulletins WHERE id = ?').get(req.params.id);
  res.render('admin/bulletin_form', { title: 'Edit Bulletin', bulletin, layout: 'layouts/admin' });
};

export const postEditBulletin = (req: Request, res: Response) => {
  const { title, category, body, is_archived } = req.body;
  const update = db.prepare('UPDATE bulletins SET title = ?, category = ?, body = ?, is_archived = ? WHERE id = ?');
  update.run(title, category, body, is_archived ? 1 : 0, req.params.id);
  res.redirect('/admin/bulletins');
};

export const deleteBulletin = (req: Request, res: Response) => {
  db.prepare('DELETE FROM bulletins WHERE id = ?').run(req.params.id);
  res.redirect('/admin/bulletins');
};

export const getTips = (req: Request, res: Response) => {
  const tips = db.prepare('SELECT * FROM anonymous_tips ORDER BY created_at DESC').all();
  res.render('admin/tips', { title: 'Anonymous Tips', tips, layout: 'layouts/admin' });
};

export const updateTip = (req: Request, res: Response) => {
  const { is_flagged, admin_notes } = req.body;
  db.prepare('UPDATE anonymous_tips SET is_flagged = ?, admin_notes = ? WHERE id = ?').run(is_flagged ? 1 : 0, admin_notes, req.params.id);
  res.redirect('/admin/tips');
};

export const getMap = (req: Request, res: Response) => {
  const points = db.prepare('SELECT * FROM map_points').all();
  res.render('admin/map', { title: 'Map Management', points, layout: 'layouts/admin' });
};

export const postMapPoint = (req: Request, res: Response) => {
  const { lat, lng, incident_type, incident_date } = req.body;
  db.prepare('INSERT INTO map_points (lat, lng, incident_type, incident_date) VALUES (?, ?, ?, ?)').run(lat, lng, incident_type, incident_date);
  res.redirect('/admin/map');
};

export const getHotlines = (req: Request, res: Response) => {
  const hotlines = db.prepare('SELECT * FROM hotlines ORDER BY category').all();
  res.render('admin/hotlines', { title: 'Manage Hotlines', hotlines, layout: 'layouts/admin' });
};

export const postHotline = (req: Request, res: Response) => {
  const { name, number, category } = req.body;
  db.prepare('INSERT INTO hotlines (name, number, category) VALUES (?, ?, ?)').run(name, number, category);
  res.redirect('/admin/hotlines');
};

export const deleteHotline = (req: Request, res: Response) => {
  db.prepare('DELETE FROM hotlines WHERE id = ?').run(req.params.id);
  res.redirect('/admin/hotlines');
};

export const getUsers = (req: Request, res: Response) => {
  const users = db.prepare('SELECT * FROM users').all();
  res.render('admin/users', { title: 'User Management', users, layout: 'layouts/admin' });
};

export const postUser = (req: Request, res: Response) => {
  const { username, full_name, password, role } = req.body;
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (username, full_name, password_hash, role) VALUES (?, ?, ?, ?)').run(username, full_name, hash, role);
  res.redirect('/admin/users');
};

export const getAuditLog = (req: Request, res: Response) => {
  const logs = db.prepare(`
    SELECT audit_logs.*, users.full_name as admin_name 
    FROM audit_logs 
    JOIN users ON audit_logs.admin_id = users.id 
    ORDER BY timestamp DESC
  `).all();
  res.render('admin/audit_log', { title: 'Audit Log', logs, layout: 'layouts/admin' });
};
