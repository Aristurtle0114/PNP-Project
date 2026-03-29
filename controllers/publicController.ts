import { Request, Response } from 'express';
import db from '../config/db.ts';
import { v4 as uuidv4 } from 'uuid';

export const getHome = (req: Request, res: Response) => {
  const hotlines = db.prepare('SELECT * FROM hotlines LIMIT 5').all();
  const stats = {
    totalReports: db.prepare("SELECT COUNT(*) as count FROM incident_reports WHERE strftime('%m', created_at) = strftime('%m', 'now')").get().count,
    activeBulletins: db.prepare("SELECT COUNT(*) as count FROM bulletins WHERE is_archived = 0").get().count,
    resolvedCases: db.prepare("SELECT COUNT(*) as count FROM incident_reports WHERE status = 'Resolved'").get().count
  };
  res.render('public/home', { title: 'Home', hotlines, stats });
};

export const getReport = (req: Request, res: Response) => {
  res.render('public/report', { title: 'Report Incident' });
};

export const postReport = (req: Request, res: Response) => {
  const { type, incident_date, location_text, lat, lng, description, contact_info } = req.body;
  
  // Server-side Geofencing Validation (Santa Cruz, Laguna Bounding Box)
  const nLat = parseFloat(lat);
  const nLng = parseFloat(lng);
  
  const minLat = 14.24;
  const maxLat = 14.33;
  const minLng = 121.38;
  const maxLng = 121.46;

  if (nLat < minLat || nLat > maxLat || nLng < minLng || nLng > maxLng) {
    return res.status(400).send('Incident location must be within Santa Cruz, Laguna.');
  }

  const tracking_number = `STC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  
  const insert = db.prepare(`
    INSERT INTO incident_reports (tracking_number, type, incident_date, location_text, lat, lng, description, contact_info)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  try {
    insert.run(tracking_number, type, incident_date, location_text, lat, lng, description, contact_info);
    res.render('public/report_success', { title: 'Success', tracking_number });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error submitting report');
  }
};

export const getTrack = (req: Request, res: Response) => {
  const { tracking_number } = req.query;
  let report = null;
  let error = null;

  if (tracking_number) {
    report = db.prepare('SELECT * FROM incident_reports WHERE tracking_number = ?').get(tracking_number);
    if (!report) error = 'Tracking number not found.';
  }

  res.render('public/track', { title: 'Track Report', report, error, tracking_number });
};

export const getMap = (req: Request, res: Response) => {
  res.render('public/map', { title: 'Crime Map' });
};

export const getMapPoints = (req: Request, res: Response) => {
  const { type, range } = req.query;
  let query = 'SELECT * FROM map_points WHERE 1=1';
  const params: any[] = [];

  if (type) {
    query += ' AND incident_type = ?';
    params.push(type);
  }

  if (range) {
    const now = new Date();
    let dateLimit;
    if (range === '7days') dateLimit = new Date(now.setDate(now.getDate() - 7));
    else if (range === '30days') dateLimit = new Date(now.setDate(now.getDate() - 30));
    else if (range === '6months') dateLimit = new Date(now.setMonth(now.getMonth() - 6));
    
    if (dateLimit) {
      query += ' AND incident_date >= ?';
      params.push(dateLimit.toISOString());
    }
  }

  const points = db.prepare(query).all(...params);
  res.json(points);
};

export const getBulletins = (req: Request, res: Response) => {
  const { category, search, page = 1 } = req.query;
  const limit = 10;
  const offset = (Number(page) - 1) * limit;

  let query = 'SELECT * FROM bulletins WHERE is_archived = 0';
  const params: any[] = [];

  if (category && category !== 'All') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (title LIKE ? OR body LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const bulletins = db.prepare(query).all(...params);
  res.render('public/bulletins', { title: 'Bulletins', bulletins, category, search, page: Number(page) });
};

export const getBulletinDetail = (req: Request, res: Response) => {
  const bulletin = db.prepare('SELECT * FROM bulletins WHERE id = ?').get(req.params.id);
  if (!bulletin) return res.status(404).send('Bulletin not found');
  res.render('public/bulletin_detail', { title: bulletin.title, bulletin });
};

export const getTip = (req: Request, res: Response) => {
  res.render('public/tip', { title: 'Submit Anonymous Tip' });
};

export const postTip = (req: Request, res: Response) => {
  const { concern_type, location_text, description } = req.body;
  const tip_id = `TIP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  
  const insert = db.prepare(`
    INSERT INTO anonymous_tips (tip_id, concern_type, location_text, description)
    VALUES (?, ?, ?, ?)
  `);
  
  try {
    insert.run(tip_id, concern_type, location_text, description);
    res.render('public/tip_success', { title: 'Success', tip_id });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error submitting tip');
  }
};

export const getAbout = (req: Request, res: Response) => {
  res.render('public/about', { title: 'About' });
};

export const getHotlines = (req: Request, res: Response) => {
  const hotlines = db.prepare('SELECT * FROM hotlines ORDER BY category').all();
  res.render('public/hotlines', { title: 'Emergency Hotlines', hotlines });
};
