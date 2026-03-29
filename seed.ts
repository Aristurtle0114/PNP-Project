import db from './config/db.ts';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

function seed() {
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('superadmin', 'staff')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS incident_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tracking_number TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      incident_date DATETIME NOT NULL,
      location_text TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      description TEXT NOT NULL,
      photo_path TEXT,
      contact_info TEXT,
      status TEXT CHECK(status IN ('Received', 'Under Review', 'Resolved', 'Closed')) DEFAULT 'Received',
      internal_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bulletins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT CHECK(category IN ('Wanted Person', 'Missing Person', 'Crime Advisory', 'Recovered Property', 'General Announcement')) NOT NULL,
      body TEXT NOT NULL,
      photo_path TEXT,
      is_archived INTEGER DEFAULT 0,
      posted_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (posted_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS anonymous_tips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tip_id TEXT UNIQUE NOT NULL,
      concern_type TEXT NOT NULL,
      location_text TEXT NOT NULL,
      description TEXT NOT NULL,
      photo_path TEXT,
      is_flagged INTEGER DEFAULT 0,
      admin_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS map_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      incident_type TEXT NOT NULL,
      incident_date DATETIME NOT NULL,
      FOREIGN KEY (report_id) REFERENCES incident_reports(id)
    );

    CREATE TABLE IF NOT EXISTS hotlines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      number TEXT NOT NULL,
      category TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      action TEXT NOT NULL,
      target_table TEXT NOT NULL,
      target_id INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES users(id)
    );
  `);

  // Check if already seeded
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    console.log('Database already seeded. Skipping...');
    return;
  }

  // Seed Admin Users
  const superadminHash = bcrypt.hashSync('superadmin123', 10);
  const staffHash = bcrypt.hashSync('staff123', 10);

  const insertUser = db.prepare('INSERT OR IGNORE INTO users (username, full_name, password_hash, role) VALUES (?, ?, ?, ?)');
  insertUser.run('superadmin', 'Super Administrator', superadminHash, 'superadmin');
  insertUser.run('staff', 'PNP Staff Member', staffHash, 'staff');

  // Seed Hotlines
  const insertHotline = db.prepare('INSERT OR IGNORE INTO hotlines (name, number, category) VALUES (?, ?, ?)');
  const hotlines = [
    ['PNP Sta. Cruz', '0912-345-6789', 'Police'],
    ['BFP Sta. Cruz', '0923-456-7890', 'Fire'],
    ['Sta. Cruz Rescue', '0934-567-8901', 'Emergency'],
    ['MDRRMO', '0945-678-9012', 'Disaster'],
    ['Red Cross Laguna', '0956-789-0123', 'Medical'],
    ['Laguna Medical Center', '(049) 501-1234', 'Medical'],
    ['Meralco', '16211', 'Utility'],
    ['Water District', '0967-890-1234', 'Utility'],
    ['DOH Hotline', '1555', 'Health'],
    ['Women & Children Desk', '0978-901-2345', 'Social Services']
  ];
  hotlines.forEach(h => insertHotline.run(...h));

  // Seed Incident Reports
  const incidentTypes = ['Theft', 'Vandalism', 'Assault', 'Suspicious Activity', 'Robbery', 'Other'];
  const insertReport = db.prepare(`
    INSERT OR IGNORE INTO incident_reports (tracking_number, type, incident_date, location_text, lat, lng, description, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMapPoint = db.prepare(`
    INSERT OR IGNORE INTO map_points (report_id, lat, lng, incident_type, incident_date)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (let i = 1; i <= 25; i++) {
    const trackingNo = `STC-2026-${String(i).padStart(5, '0')}`;
    const type = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
    const lat = 14.28 + (Math.random() - 0.5) * 0.02;
    const lng = 121.41 + (Math.random() - 0.5) * 0.02; // Fixed lng to be within Sta. Cruz
    const date = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
    const status = ['Received', 'Under Review', 'Resolved', 'Closed'][Math.floor(Math.random() * 4)];
    const imageUrl = `https://picsum.photos/seed/incident${i}/800/600`;
    
    const result = insertReport.run(trackingNo, type, date, `Brgy. Sample ${i}, Sta. Cruz`, lat, lng, `Automated sample report description for ${type} incident.`, status);
    
    // Update with photo_path
    db.prepare('UPDATE incident_reports SET photo_path = ? WHERE id = ?').run(imageUrl, result.lastInsertRowid);

    // Seed 15 map points from these reports
    if (i <= 15) {
      insertMapPoint.run(result.lastInsertRowid, lat, lng, type, date);
    }
  }

  // Seed Bulletins
  const bulletinCategories = ['Wanted Person', 'Missing Person', 'Crime Advisory', 'Recovered Property', 'General Announcement'];
  const bulletinImages = {
    'Wanted Person': 'https://picsum.photos/seed/wanted/800/600',
    'Missing Person': 'https://picsum.photos/seed/missing/800/600',
    'Crime Advisory': 'https://picsum.photos/seed/advisory/800/600',
    'Recovered Property': 'https://picsum.photos/seed/recovered/800/600',
    'General Announcement': 'https://picsum.photos/seed/announcement/800/600'
  };
  const insertBulletin = db.prepare(`
    INSERT OR IGNORE INTO bulletins (title, category, body, photo_path, posted_by)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (let i = 1; i <= 10; i++) {
    const category = bulletinCategories[Math.floor(Math.random() * bulletinCategories.length)];
    const imageUrl = `${bulletinImages[category as keyof typeof bulletinImages] || 'https://picsum.photos/seed/bulletin/800/600'}?random=${i}`;
    insertBulletin.run(`Bulletin Title ${i}`, category, `This is the body of bulletin ${i}. It contains important information regarding ${category}.`, imageUrl, 1);
  }

  console.log('Database seeded successfully.');
}

seed();
