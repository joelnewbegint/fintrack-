import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

async function cleanupAndSeed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB!');

    const db = mongoose.connection.db;

    // 1. Remove all dump data from customers, loans, payments, expenses, daily closings, audit logs
    console.log('Removing dump data from collections...');
    const collectionsToClean = ['customers', 'loans', 'payments', 'expenses', 'dailyclosings', 'investments', 'auditlogs'];
    
    for (const name of collectionsToClean) {
      try {
        const result = await db.collection(name).deleteMany({});
        console.log(`- Cleared ${name}: deleted ${result.deletedCount} dump records`);
      } catch (e) {
        console.log(`- Note for ${name}: ${e.message}`);
      }
    }

    // 2. Ensure / Update Settings with Vasantha Kumar K
    console.log('Updating business settings...');
    await db.collection('settings').deleteMany({});
    await db.collection('settings').insertOne({
      businessName: "VK BANKER'S & FINANCE",
      businessNameTamil: "வி.கே. பேங்கர்ஸ் & பைனான்ஸ்",
      ownerName: "Vasantha Kumar K",
      phone: "+91 98421 12345",
      address: "45, Cross Cut Road, Gandhipuram, Coimbatore - 641012, Tamil Nadu",
      defaultPenaltyPercent: 2,
      graceDays: 1,
      defaultLanguage: "ta",
      currencySymbol: "₹",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✓ Settings updated with Owner: Vasantha Kumar K');

    // 3. Upsert / Set Authentic Users: Owner Vasantha Kumar K & Agent Magimaidoss M
    console.log('Configuring authentic users...');
    const salt = await bcrypt.genSalt(10);
    const ownerHash = await bcrypt.hash('admin123', salt);
    const agentHash = await bcrypt.hash('agent123', salt);

    await db.collection('users').deleteMany({});

    await db.collection('users').insertOne({
      name: 'Vasantha Kumar K (Owner)',
      email: 'owner@fintrack.com',
      phone: '9842112345',
      passwordHash: ownerHash,
      role: 'owner',
      assignedAreas: ['Gandhipuram', 'RS Puram', 'Ukkadam', 'Town Hall', 'Singanallur', 'Simmakkal'],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await db.collection('users').insertOne({
      name: 'Magimaidoss M (Collection Agent)',
      email: 'agent@fintrack.com',
      phone: '9789054321',
      passwordHash: agentHash,
      role: 'agent',
      assignedAreas: ['Gandhipuram', 'RS Puram', 'Town Hall'],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✓ Created Owner: Vasantha Kumar K (owner@fintrack.com)');
    console.log('✓ Created Agent: Magimaidoss M (agent@fintrack.com)');
    console.log('All dump data removed successfully!');

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from DB.');
  }
}

cleanupAndSeed();
