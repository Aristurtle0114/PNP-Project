export const mockHotlines = [
  { id: '1', name: 'PNP Sta. Cruz', number: '0912-345-6789', category: 'Police' },
  { id: '2', name: 'BFP Sta. Cruz', number: '0923-456-7890', category: 'Fire' },
  { id: '3', name: 'Sta. Cruz Rescue', number: '0934-567-8901', category: 'Emergency' },
  { id: '4', name: 'MDRRMO', number: '0945-678-9012', category: 'Disaster' },
  { id: '5', name: 'Red Cross Laguna', number: '0956-789-0123', category: 'Medical' }
];

export const mockReports = [
  {
    id: 'rep1',
    tracking_number: 'STC-2026-00001',
    type: 'Theft',
    incident_date: new Date().toISOString(),
    location_text: 'Poblacion, Sta. Cruz',
    lat: 14.2811,
    lng: 121.4122,
    description: 'Sample theft report for mockup.',
    status: 'Received',
    photo_path: 'https://picsum.photos/seed/rep1/800/600',
    created_at: new Date().toISOString()
  },
  {
    id: 'rep2',
    tracking_number: 'STC-2026-00002',
    type: 'Assault',
    incident_date: new Date().toISOString(),
    location_text: 'Brgy. Bagumbayan, Sta. Cruz',
    lat: 14.2750,
    lng: 121.4050,
    description: 'Sample assault report for mockup.',
    status: 'Under Review',
    photo_path: 'https://picsum.photos/seed/rep2/800/600',
    created_at: new Date().toISOString()
  }
];

export const mockBulletins = [
  {
    id: 'bul1',
    title: 'Missing Person: Juan Dela Cruz',
    category: 'Missing Person',
    body: 'Last seen wearing a blue shirt near the plaza.',
    photo_path: 'https://picsum.photos/seed/bul1/800/600',
    is_archived: false,
    posted_by: 'superadmin',
    created_at: new Date().toISOString()
  },
  {
    id: 'bul2',
    title: 'Crime Advisory: Night Patrols',
    category: 'Crime Advisory',
    body: 'Increased police presence in residential areas.',
    photo_path: 'https://picsum.photos/seed/bul2/800/600',
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
