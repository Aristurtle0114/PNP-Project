import { db, auth } from './config/firebase.ts';
import { signInWithEmailAndPassword } from 'firebase/auth';
import bcrypt from 'bcryptjs';

async function seedFirestore() {
  console.log('Starting Firestore seeding using Client SDK Wrapper...');
  try {
    // Try to sign in to bypass rules if user already exists
    try {
      await signInWithEmailAndPassword(auth, 'superadmin@example.com', 'superadmin123');
      console.log('Signed in as superadmin.');
    } catch (e) {
      console.log('Sign in failed (expected if user not yet created), proceeding...');
    }

    // 1. Seed Users
    const usersRef = db.collection('users');
    const userCountSnap = await usersRef.count().get();
    const userCount = userCountSnap.data().count;

    if (userCount === 0) {
      const superadminHash = bcrypt.hashSync('superadmin123', 10);
      const staffHash = bcrypt.hashSync('staff123', 10);

      await usersRef.doc('superadmin').set({
        username: 'superadmin',
        email: 'superadmin@example.com',
        full_name: 'Super Administrator',
        password_hash: superadminHash,
        role: 'superadmin',
        created_at: new Date().toISOString()
      });

      await usersRef.doc('staff').set({
        username: 'staff',
        full_name: 'PNP Staff Member',
        password_hash: staffHash,
        role: 'staff',
        created_at: new Date().toISOString()
      });
      console.log('Users seeded.');
    }

    // 2. Seed Hotlines
    const hotlinesRef = db.collection('hotlines');
    const hotlineCountSnap = await hotlinesRef.count().get();
    const hotlineCount = hotlineCountSnap.data().count;

    if (hotlineCount === 0) {
      const hotlines = [
        { name: 'PNP Sta. Cruz', number: '0912-345-6789', category: 'Police' },
        { name: 'BFP Sta. Cruz', number: '0923-456-7890', category: 'Fire' },
        { name: 'Sta. Cruz Rescue', number: '0934-567-8901', category: 'Emergency' },
        { name: 'MDRRMO', number: '0945-678-9012', category: 'Disaster' },
        { name: 'Red Cross Laguna', number: '0956-789-0123', category: 'Medical' },
        { name: 'Laguna Medical Center', number: '(049) 501-1234', category: 'Medical' },
        { name: 'Meralco', number: '16211', category: 'Utility' },
        { name: 'Water District', number: '0967-890-1234', category: 'Utility' },
        { name: 'DOH Hotline', number: '1555', category: 'Health' },
        { name: 'Women & Children Desk', number: '0978-901-2345', category: 'Social Services' }
      ];

      const batch = db.batch();
      hotlines.forEach(h => {
        const newDocRef = hotlinesRef.doc();
        batch.set(newDocRef, { ...h, updated_at: new Date().toISOString() });
      });
      await batch.commit();
      console.log('Hotlines seeded.');
    }

    // 3. Seed Incident Reports
    const reportsRef = db.collection('incident_reports');
    const reportCountSnap = await reportsRef.count().get();
    const reportCount = reportCountSnap.data().count;

    if (reportCount === 0) {
      const incidentTypes = ['Theft', 'Vandalism', 'Assault', 'Suspicious Activity', 'Robbery', 'Other'];
      const batch = db.batch();

      for (let i = 1; i <= 25; i++) {
        const trackingNo = `STC-2026-${String(i).padStart(5, '0')}`;
        const type = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
        const lat = 14.28 + (Math.random() - 0.5) * 0.02;
        const lng = 121.41 + (Math.random() - 0.5) * 0.02;
        const date = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
        const status = ['Received', 'Under Review', 'Resolved', 'Closed'][Math.floor(Math.random() * 4)];
        const imageUrl = `https://picsum.photos/seed/incident${i}/800/600`;

        const newDocRef = reportsRef.doc();
        batch.set(newDocRef, {
          tracking_number: trackingNo,
          type,
          incident_date: date,
          location_text: `Brgy. Sample ${i}, Sta. Cruz`,
          lat,
          lng,
          description: `Automated sample report description for ${type} incident.`,
          status,
          photo_path: imageUrl,
          created_at: new Date().toISOString()
        });
      }
      await batch.commit();
      console.log('Incident reports seeded.');
    }

    // 4. Seed Bulletins
    const bulletinsRef = db.collection('bulletins');
    const bulletinCountSnap = await bulletinsRef.count().get();
    const bulletinCount = bulletinCountSnap.data().count;

    if (bulletinCount === 0) {
      const bulletinCategories = ['Wanted Person', 'Missing Person', 'Crime Advisory', 'Recovered Property', 'General Announcement'];
      const bulletinImages = {
        'Wanted Person': 'https://picsum.photos/seed/wanted/800/600',
        'Missing Person': 'https://picsum.photos/seed/missing/800/600',
        'Crime Advisory': 'https://picsum.photos/seed/advisory/800/600',
        'Recovered Property': 'https://picsum.photos/seed/recovered/800/600',
        'General Announcement': 'https://picsum.photos/seed/announcement/800/600'
      };

      const batch = db.batch();
      for (let i = 1; i <= 10; i++) {
        const category = bulletinCategories[Math.floor(Math.random() * bulletinCategories.length)];
        const imageUrl = `${bulletinImages[category as keyof typeof bulletinImages] || 'https://picsum.photos/seed/bulletin/800/600'}?random=${i}`;
        
        const newDocRef = bulletinsRef.doc();
        batch.set(newDocRef, {
          title: `Bulletin Title ${i}`,
          category,
          body: `This is the body of bulletin ${i}. It contains important information regarding ${category}.`,
          photo_path: imageUrl,
          is_archived: false,
          posted_by: 'superadmin',
          created_at: new Date().toISOString()
        });
      }
      await batch.commit();
      console.log('Bulletins seeded.');
    }

    console.log('Firestore seeding completed successfully.');
  } catch (e: any) {
    console.error('Seeding failed:', e.message);
  }
}

seedFirestore().catch(console.error);
