import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { connectDB } from './config/db.js';

const timestamp = '2026-11-17_19-11';
const backupDir = path.join(__dirname, `../../backups/backup_${timestamp}`);

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

console.log('Connecting to MongoDB via connectDB()...');
await connectDB();
console.log('Connected!');

const collections = await mongoose.connection.db.listCollections().toArray();
console.log(`Found ${collections.length} collections to export.`);

const manifest = {
  timestamp: new Date().toISOString(),
  database: mongoose.connection.db.databaseName,
  collections: {},
  filesCopied: [],
};

for (const col of collections) {
  const colName = col.name;
  const docs = await mongoose.connection.db.collection(colName).find({}).toArray();
  const filePath = path.join(backupDir, `${colName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
  manifest.collections[colName] = {
    count: docs.length,
    file: `${colName}.json`,
    sizeBytes: fs.statSync(filePath).size,
  };
  console.log(`Exported ${colName}: ${docs.length} documents -> ${filePath}`);
}

// Copy server/data if exists
const serverDataDir = path.join(__dirname, '../data');
if (fs.existsSync(serverDataDir)) {
  const targetDataDir = path.join(backupDir, 'data');
  fs.mkdirSync(targetDataDir, { recursive: true });
  const files = fs.readdirSync(serverDataDir);
  for (const f of files) {
    fs.copyFileSync(path.join(serverDataDir, f), path.join(targetDataDir, f));
    manifest.filesCopied.push(`data/${f}`);
  }
  console.log(`Copied ${files.length} files from server/data/ to backup.`);
}

// Write manifest
const manifestPath = path.join(backupDir, 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log(`\n✅ Backup successfully created at: ${backupDir}`);
console.log('Manifest:', JSON.stringify(manifest, null, 2));

await mongoose.disconnect();

