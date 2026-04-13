export const mockHotlines = [
  { id: '1', name: 'PNP Sta. Cruz', number: '0998 598 5667', category: 'Police' },
  { id: '2', name: 'BFP Sta. Cruz', number: '0923-456-7890', category: 'Fire' },
  { id: '3', name: 'Sta. Cruz Rescue', number: '0934-567-8901', category: 'Emergency' },
  { id: '4', name: 'MDRRMO', number: '0945-678-9012', category: 'Disaster' },
  { id: '5', name: 'Red Cross Laguna', number: '0956-789-0123', category: 'Medical' }
];

export const mockBulletins = [
  {
    id: 'bul1',
    title: 'Missing Person: Juan Dela Cruz',
    category: 'Missing Person',
    body: 'Last seen wearing a blue shirt near the plaza.',
    photo_path: 'https://picsum.photos/seed/pnp-missing-person/800/600',
    is_archived: false,
    posted_by: 'superadmin',
    created_at: new Date().toISOString()
  },
  {
    id: 'bul2',
    title: 'Crime Advisory: Night Patrols',
    category: 'Crime Advisory',
    body: 'Increased police presence in residential areas.',
    photo_path: 'https://picsum.photos/seed/pnp-night-patrol/800/600',
    is_archived: false,
    posted_by: 'superadmin',
    created_at: new Date().toISOString()
  }
];

export const mockUsers = [
  {
    id: 'superadmin',
    username: 'superadmin',
    email: 'superadmin@example.com',
    full_name: 'Super Administrator',
    password_hash: '$2a$10$DMpQH4fGsPrzMYMTWe/pIeOUF2eID.ay62ZxVAkvsF24VjNgO5h3y', // 'admin123' hashed
    role: 'superadmin',
    created_at: new Date().toISOString()
  }
];

export const mockTips = [
  { 
    id: 'tip1', 
    tip_id: 'TIP-001',
    concern_type: 'Suspicious Activity',
    location_text: 'Sta. Cruz Park',
    content: 'Suspicious activity near the park.', 
    created_at: new Date().toISOString(), 
    is_flagged: false 
  }
];

export const mockAuditLogs = [
  { 
    id: 'log1', 
    admin_id: 'superadmin', 
    username: 'superadmin',
    action: 'Logged in', 
    details: 'Admin logged into the system',
    timestamp: new Date().toISOString() 
  }
];

export const mockMapPoints = [
  { id: 'point1', lat: 14.2811, lng: 121.4122, incident_type: 'Theft', incident_date: new Date().toISOString(), barangay: 'Poblacion' },
  { id: 'point2', lat: 14.2750, lng: 121.4050, incident_type: 'Assault', incident_date: new Date().toISOString(), barangay: 'Bagumbayan' },
  { id: 'point3', lat: 14.2900, lng: 121.4200, incident_type: 'Theft', incident_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), barangay: 'Poblacion' },
  { id: 'point4', lat: 14.2850, lng: 121.4150, incident_type: 'Vandalism', incident_date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), barangay: 'Poblacion' },
  { id: 'point5', lat: 14.2700, lng: 121.4000, incident_type: 'Robbery', incident_date: new Date().toISOString(), barangay: 'Bagumbayan' },
  { id: 'point6', lat: 14.2800, lng: 121.4300, incident_type: 'Theft', incident_date: new Date().toISOString(), barangay: 'Bubukal' },
  { id: 'point7', lat: 14.2820, lng: 121.4130, incident_type: 'Theft', incident_date: new Date().toISOString(), barangay: 'Poblacion' },
];
