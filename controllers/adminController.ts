import { Request, Response } from 'express';
import { db } from '../config/database.js';
import bcrypt from 'bcryptjs';

export const getLogin = (req: Request, res: Response) => {
  if (req.session.user) return res.redirect('/admin/dashboard');
  res.render('admin/login', { title: 'Admin Login', layout: false });
};

export const postLogin = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  
  try {
    const snap = await db.collection('users').where('username', '==', username).limit(1).get();
    
    if (snap.empty) {
      return res.render('admin/login', { title: 'Admin Login', layout: false, error: 'Invalid username or password' });
    }

    const user = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;

    if (bcrypt.compareSync(password, user.password_hash)) {
      req.session.user = { id: user.id, username: user.username, full_name: user.full_name, role: user.role };
      res.redirect('/admin/dashboard');
    } else {
      res.render('admin/login', { title: 'Admin Login', layout: false, error: 'Invalid username or password' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error during login');
  }
};

export const getLogout = (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
};

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      totalReportsSnap,
      pendingReportsSnap,
      reportsThisMonthSnap,
      activeBulletinsSnap,
      tipsReceivedSnap,
      resolvedCasesSnap,
      allReportsSnap,
      recentTipsSnap,
      recentLogsSnap
    ] = await Promise.all([
      db.collection('incident_reports').count().get(),
      db.collection('incident_reports').where('status', '==', 'Received').count().get(),
      db.collection('incident_reports').where('created_at', '>=', startOfMonth).count().get(),
      db.collection('bulletins').where('is_archived', '==', false).count().get(),
      db.collection('anonymous_tips').count().get(),
      db.collection('incident_reports').where('status', '==', 'Resolved').count().get(),
      db.collection('incident_reports').get(), // For grouping in memory
      db.collection('anonymous_tips').orderBy('created_at', 'desc').limit(5).get(),
      db.collection('audit_logs').orderBy('timestamp', 'desc').limit(5).get()
    ]);

    const stats = {
      totalReports: totalReportsSnap.data().count,
      pendingReports: pendingReportsSnap.data().count,
      reportsThisMonth: reportsThisMonthSnap.data().count,
      activeBulletins: activeBulletinsSnap.data().count,
      tipsReceived: tipsReceivedSnap.data().count,
      resolvedCases: resolvedCasesSnap.data().count,
    };

    // Grouping in memory for charts
    const reports = allReportsSnap.docs.map(doc => doc.data());
    
    const typeCounts: Record<string, number> = {};
    reports.forEach(r => {
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
    });
    const reportsByType = Object.entries(typeCounts).map(([type, count]) => ({ type, count }));

    const monthCounts: Record<string, number> = {};
    reports.forEach(r => {
      const month = r.created_at.substring(0, 7);
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });
    const reportsByMonth = Object.entries(monthCounts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 6)
      .reverse();

    const recentReports = allReportsSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => b.created_at.localeCompare(a.created_at))
      .slice(0, 5);

    const recentTips = recentTipsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // For audit logs, we need to fetch user names if they are not stored in the log
    // Assuming audit_logs store admin_name or we fetch them
    const recentLogs = await Promise.all(recentLogsSnap.docs.map(async doc => {
      const log = doc.data();
      const userDoc = await db.collection('users').doc(log.admin_id).get();
      return { id: doc.id, ...log, username: userDoc.exists ? (userDoc.data() as any).username : 'Unknown' };
    }));

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
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading dashboard');
  }
};

export const getReports = async (req: Request, res: Response) => {
  const { status, type, page = 1 } = req.query;
  const limit = 10;
  
  try {
    let query: any = db.collection('incident_reports');

    if (status) query = query.where('status', '==', status);
    if (type) query = query.where('type', '==', type);

    const snap = await query.orderBy('created_at', 'desc').get();
    let reports = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    const offset = (Number(page) - 1) * limit;
    reports = reports.slice(offset, offset + limit);

    res.render('admin/reports', { title: 'Incident Reports', reports, status, type, page: Number(page), layout: 'layouts/admin' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading reports');
  }
};

export const getReportDetail = async (req: Request, res: Response) => {
  try {
    const doc = await db.collection('incident_reports').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).send('Report not found');
    const report = { id: doc.id, ...doc.data() };
    res.render('admin/report_detail', { title: 'Report Detail', report, layout: 'layouts/admin' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading report detail');
  }
};

export const updateReportStatus = async (req: Request, res: Response) => {
  const { status, internal_notes } = req.body;
  
  try {
    await db.collection('incident_reports').doc(req.params.id).update({
      status,
      internal_notes,
      updated_at: new Date().toISOString()
    });
    
    // Audit Log
    await db.collection('audit_logs').add({
      admin_id: req.session.user.id,
      action: `Updated status to ${status}`,
      target_table: 'incident_reports',
      target_id: req.params.id,
      timestamp: new Date().toISOString()
    });

    res.redirect(`/admin/reports/${req.params.id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating report status');
  }
};

export const getBulletins = async (req: Request, res: Response) => {
  try {
    const snap = await db.collection('bulletins').orderBy('created_at', 'desc').get();
    const bulletins = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.render('admin/bulletins', { title: 'Manage Bulletins', bulletins, layout: 'layouts/admin' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading bulletins');
  }
};

export const getCreateBulletin = (req: Request, res: Response) => {
  res.render('admin/bulletin_form', { title: 'New Bulletin', bulletin: null, layout: 'layouts/admin' });
};

export const postCreateBulletin = async (req: Request, res: Response) => {
  const { title, category, body } = req.body;
  try {
    await db.collection('bulletins').add({
      title,
      category,
      body,
      posted_by: req.session.user.id,
      is_archived: false,
      created_at: new Date().toISOString()
    });
    res.redirect('/admin/bulletins');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating bulletin');
  }
};

export const getEditBulletin = async (req: Request, res: Response) => {
  try {
    const doc = await db.collection('bulletins').doc(req.params.id).get();
    const bulletin = { id: doc.id, ...doc.data() };
    res.render('admin/bulletin_form', { title: 'Edit Bulletin', bulletin, layout: 'layouts/admin' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading bulletin');
  }
};

export const postEditBulletin = async (req: Request, res: Response) => {
  const { title, category, body, is_archived } = req.body;
  try {
    await db.collection('bulletins').doc(req.params.id).update({
      title,
      category,
      body,
      is_archived: is_archived === 'on' || is_archived === true,
      updated_at: new Date().toISOString()
    });
    res.redirect('/admin/bulletins');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating bulletin');
  }
};

export const deleteBulletin = async (req: Request, res: Response) => {
  try {
    await db.collection('bulletins').doc(req.params.id).delete();
    res.redirect('/admin/bulletins');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting bulletin');
  }
};

export const getTips = async (req: Request, res: Response) => {
  try {
    const snap = await db.collection('anonymous_tips').orderBy('created_at', 'desc').get();
    const tips = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.render('admin/tips', { title: 'Anonymous Tips', tips, layout: 'layouts/admin' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading tips');
  }
};

export const updateTip = async (req: Request, res: Response) => {
  const { is_flagged, admin_notes } = req.body;
  try {
    await db.collection('anonymous_tips').doc(req.params.id).update({
      is_flagged: is_flagged === 'on' || is_flagged === true,
      admin_notes,
      updated_at: new Date().toISOString()
    });
    res.redirect('/admin/tips');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating tip');
  }
};

export const getMap = async (req: Request, res: Response) => {
  try {
    const snap = await db.collection('map_points').get();
    const points = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.render('admin/map', { title: 'Map Management', points, layout: 'layouts/admin' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading map points');
  }
};

export const postMapPoint = async (req: Request, res: Response) => {
  const { lat, lng, incident_type, incident_date } = req.body;
  try {
    await db.collection('map_points').add({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      incident_type,
      incident_date,
      created_at: new Date().toISOString()
    });
    res.redirect('/admin/map');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error adding map point');
  }
};

export const getHotlines = async (req: Request, res: Response) => {
  try {
    const snap = await db.collection('hotlines').orderBy('category').get();
    const hotlines = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.render('admin/hotlines', { title: 'Manage Hotlines', hotlines, layout: 'layouts/admin' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading hotlines');
  }
};

export const postHotline = async (req: Request, res: Response) => {
  const { name, number, category } = req.body;
  try {
    await db.collection('hotlines').add({
      name,
      number,
      category,
      updated_at: new Date().toISOString()
    });
    res.redirect('/admin/hotlines');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error adding hotline');
  }
};

export const deleteHotline = async (req: Request, res: Response) => {
  try {
    await db.collection('hotlines').doc(req.params.id).delete();
    res.redirect('/admin/hotlines');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting hotline');
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const snap = await db.collection('users').get();
    const users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.render('admin/users', { title: 'User Management', users, layout: 'layouts/admin' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading users');
  }
};

export const postUser = async (req: Request, res: Response) => {
  const { username, full_name, password, role } = req.body;
  const hash = bcrypt.hashSync(password, 10);
  try {
    await db.collection('users').add({
      username,
      full_name,
      password_hash: hash,
      role,
      created_at: new Date().toISOString()
    });
    res.redirect('/admin/users');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating user');
  }
};

export const getAuditLog = async (req: Request, res: Response) => {
  try {
    const snap = await db.collection('audit_logs').orderBy('timestamp', 'desc').get();
    const logs = await Promise.all(snap.docs.map(async doc => {
      const log = doc.data();
      const userDoc = await db.collection('users').doc(log.admin_id).get();
      return { id: doc.id, ...log, admin_name: userDoc.exists ? (userDoc.data() as any).full_name : 'Unknown' };
    }));
    res.render('admin/audit_log', { title: 'Audit Log', logs, layout: 'layouts/admin' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading audit logs');
  }
};
