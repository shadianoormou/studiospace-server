import { MongoClient } from 'mongodb';
export async function connectDatabase(uri, database) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  const db = client.db(database);
  await Promise.all([
    db.collection('studios').createIndex({ ownerEmail: 1 }),
    db.collection('studios').createIndex({ category: 1, createdAt: -1 }),
    db.collection('bookings').createIndex({ studioId: 1, status: 1, start: 1, end: 1 }),
    db.collection('bookings').createIndex({ userId: 1, createdAt: -1 }),
    db.collection('wishlist').createIndex({ userId: 1, studioId: 1 }, { unique: true }),
    db.collection('reviews').createIndex({ userId: 1, studioId: 1 }, { unique: true }),
    db.collection('newsletter').createIndex({ email: 1 }, { unique: true }),
  ]);
  return { client, db };
}
