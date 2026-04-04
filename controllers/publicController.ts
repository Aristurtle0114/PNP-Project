import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { v4 as uuidv4 } from 'uuid';

export const getHome = async (req: Request, res: Response) => {
  try {
    const hotlinesSnap = await db.collection('hotlines').limit(5).get();
    const hotlines = hotlinesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const totalReportsSnap = await db.collection('incident_reports')
      .where('created_at', '>=', startOfMonth)
      .count().get();
    
    const activeBulletinsSnap = await db.collection('bulletins')
      .where('is_archived', '==', false)
      .count().get();
    
    const resolvedCasesSnap = await db.collection('incident_reports')
      .where('status', '==', 'Resolved')
      .count().get();

    const stats = {
      totalReports: totalReportsSnap.data().count,
      activeBulletins: activeBulletinsSnap.data().count,
      resolvedCases: resolvedCasesSnap.data().count
    };

    res.render('public/home', { title: 'Home', hotlines, stats });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading home page');
  }
};

export const getReport = (req: Request, res: Response) => {
  res.render('public/report', { title: 'Report Incident' });
};

export const postReport = async (req: Request, res: Response) => {
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
  
  try {
    await db.collection('incident_reports').add({
      tracking_number,
      type,
      incident_date,
      location_text,
      lat: nLat,
      lng: nLng,
      description,
      contact_info,
      status: 'Received',
      created_at: new Date().toISOString()
    });
    res.render('public/report_success', { title: 'Success', tracking_number });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error submitting report');
  }
};

export const getTrack = async (req: Request, res: Response) => {
  const { tracking_number } = req.query;
  let report = null;
  let error = null;

  if (tracking_number) {
    const snap = await db.collection('incident_reports')
      .where('tracking_number', '==', tracking_number)
      .limit(1)
      .get();
    
    if (!snap.empty) {
      report = { id: snap.docs[0].id, ...snap.docs[0].data() };
    } else {
      error = 'Tracking number not found.';
    }
  }

  res.render('public/track', { title: 'Track Report', report, error, tracking_number });
};

export const getMap = (req: Request, res: Response) => {
  res.render('public/map', { title: 'Crime Map' });
};

export const getMapPoints = async (req: Request, res: Response) => {
  const { type, range } = req.query;
  let query: any = db.collection('map_points');

  if (type) {
    query = query.where('incident_type', '==', type);
  }

  if (range) {
    const now = new Date();
    let dateLimit;
    if (range === '7days') dateLimit = new Date(now.setDate(now.getDate() - 7));
    else if (range === '30days') dateLimit = new Date(now.setDate(now.getDate() - 30));
    else if (range === '6months') dateLimit = new Date(now.setMonth(now.getMonth() - 6));
    
    if (dateLimit) {
      query = query.where('incident_date', '>=', dateLimit.toISOString());
    }
  }

  try {
    const snap = await query.get();
    const points = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    res.json(points);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching map points' });
  }
};

export const getBulletins = async (req: Request, res: Response) => {
  const { category, search, page = 1 } = req.query;
  const limit = 10;
  // Firestore doesn't support offset well for large datasets, but for this app it's fine to use limit/startAfter or just fetch and slice if small.
  // However, for simplicity, we'll just fetch with limit.
  
  try {
    let query: any = db.collection('bulletins').where('is_archived', '==', false);

    if (category && category !== 'All') {
      query = query.where('category', '==', category);
    }

    // Firestore doesn't support LIKE queries. We'll fetch and filter in memory if search is present,
    // or just ignore search for now if we want to stay purely server-side.
    // Given the small scale, we'll fetch and filter.
    
    const snap = await query.orderBy('created_at', 'desc').get();
    let bulletins = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    if (search) {
      const s = String(search).toLowerCase();
      bulletins = bulletins.filter((b: any) => 
        b.title.toLowerCase().includes(s) || b.body.toLowerCase().includes(s)
      );
    }

    // Manual pagination
    const total = bulletins.length;
    const offset = (Number(page) - 1) * limit;
    bulletins = bulletins.slice(offset, offset + limit);

    res.render('public/bulletins', { title: 'Bulletins', bulletins, category, search, page: Number(page) });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading bulletins');
  }
};

export const getBulletinDetail = async (req: Request, res: Response) => {
  try {
    const doc = await db.collection('bulletins').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).send('Bulletin not found');
    const bulletin = { id: doc.id, ...doc.data() };
    res.render('public/bulletin_detail', { title: bulletin.title, bulletin });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading bulletin detail');
  }
};

export const getTip = (req: Request, res: Response) => {
  res.render('public/tip', { title: 'Submit Anonymous Tip' });
};

export const postTip = async (req: Request, res: Response) => {
  const { concern_type, location_text, description } = req.body;
  const tip_id = `TIP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  
  try {
    await db.collection('anonymous_tips').add({
      tip_id,
      concern_type,
      location_text,
      description,
      created_at: new Date().toISOString()
    });
    res.render('public/tip_success', { title: 'Success', tip_id });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error submitting tip');
  }
};

export const getAbout = (req: Request, res: Response) => {
  res.render('public/about', { title: 'About' });
};

export const getHotlines = async (req: Request, res: Response) => {
  try {
    const snap = await db.collection('hotlines').orderBy('category').get();
    const hotlines = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.render('public/hotlines', { title: 'Emergency Hotlines', hotlines });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading hotlines');
  }
};
