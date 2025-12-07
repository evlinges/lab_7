const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'blog_system';

let client = null;
let db = null;

async function connectDatabase() {
  if (db) {
    return db;
  }

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('✅ Підключено до MongoDB');
    return db;
  } catch (error) {
    console.error('❌ Помилка підключення до MongoDB:', error);
    throw error;
  }
}

async function closeDatabase() {
  if (client) {
    await client.close();
    console.log('🔌 Закрито підключення до MongoDB');
  }
}

function getDatabase() {
  if (!db) {
    throw new Error('База даних не підключена. Викличте connectDatabase() спочатку.');
  }
  return db;
}

module.exports = {
  connectDatabase,
  closeDatabase,
  getDatabase
};

