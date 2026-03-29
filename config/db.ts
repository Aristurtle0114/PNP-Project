import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(process.cwd(), 'data/cpicrs.db');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

let db: Database.Database;

try {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
} catch (error: any) {
  if (error.code === 'SQLITE_CORRUPT') {
    console.error('Database is corrupted. Attempting to delete and recreate...');
    try {
      // Close the connection if it was partially opened
      // (though better-sqlite3 might not have a handle if it failed)
      fs.unlinkSync(dbPath);
      db = new Database(dbPath);
      db.pragma('journal_mode = WAL');
      console.log('Database recreated successfully.');
    } catch (unlinkError) {
      console.error('Failed to recover from database corruption:', unlinkError);
      throw error; // Re-throw original error if recovery fails
    }
  } else {
    throw error;
  }
}

export default db;
