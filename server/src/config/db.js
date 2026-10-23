import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

let memServer = null;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fintrack';

  try {
    // Attempt standard connection (Atlas or local mongod)
    console.log(`Connecting to MongoDB at: ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}...`);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.warn(`⚠️ Could not connect to primary MongoDB (${err.message}).`);
    if (uri.includes('mongodb.net')) {
      console.warn('💡 Tip: In MongoDB Atlas, ensure your current IP or 0.0.0.0/0 is added under "Network Access".');
    }
    
    // Fallback to in-memory MongoDB for local development if primary cannot be reached
    if (process.env.NODE_ENV !== 'production' || !uri) {
      console.log('🔄 Initializing embedded in-memory MongoDB server for seamless zero-config setup...');
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        memServer = await MongoMemoryServer.create({
          instance: {
            dbName: 'fintrack'
          }
        });
        const memUri = memServer.getUri();
        const conn = await mongoose.connect(memUri);
        console.log(`✅ Embedded MongoDB ready and connected at: ${memUri}`);
        return conn;
      } catch (memErr) {
        console.error('❌ Failed to start in-memory MongoDB:', memErr.message);
        throw err;
      }
    } else {
      throw err;
    }
  }
};

export const closeDB = async () => {
  await mongoose.disconnect();
  if (memServer) {
    await memServer.stop();
  }
};
