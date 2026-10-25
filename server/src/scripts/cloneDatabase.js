// Copy the whole FleetOS database from one MongoDB to another.
//
// Used to move the local development data (companies, users, bookings,
// invoices, stock, chat) onto the managed cluster that the deployed API reads.
// Collections are replaced, so the copy can be re-run after more local work.
//
//   TARGET_MONGODB_URI="mongodb+srv://..." node src/scripts/cloneDatabase.js
//
// The source defaults to the same URI the API uses locally.

require('dotenv').config();
const { MongoClient } = require('mongodb');

const SOURCE = String(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fleetos').trim();
const TARGET = String(process.env.TARGET_MONGODB_URI || '').trim();
const BATCH = 500;

if (!TARGET) {
  console.error('Set TARGET_MONGODB_URI to the destination connection string.');
  process.exit(1);
}
if (SOURCE === TARGET) {
  console.error('Source and target are the same connection string; nothing to copy.');
  process.exit(1);
}

async function copy() {
  const source = new MongoClient(SOURCE, { serverSelectionTimeoutMS: 10000 });
  const target = new MongoClient(TARGET, { serverSelectionTimeoutMS: 15000 });
  await source.connect();
  await target.connect();

  const sourceDb = source.db();
  const targetDb = target.db();
  const collections = await sourceDb.listCollections().toArray();
  console.log(`Copying ${collections.length} collections from "${sourceDb.database}" to "${targetDb.database}"`);

  let total = 0;
  for (const { name } of collections) {
    if (name.startsWith('system.')) continue;
    const documents = await sourceDb.collection(name).find({}).toArray();
    await targetDb.collection(name).deleteMany({});
    // Insert in batches so large collections stay under the driver's limits.
    for (let index = 0; index < documents.length; index += BATCH) {
      const slice = documents.slice(index, index + BATCH);
      if (slice.length) await targetDb.collection(name).insertMany(slice, { ordered: true });
    }
    // Copy the collection's indexes minus the default _id one.
    const indexes = await sourceDb.collection(name).indexes();
    for (const index of indexes) {
      if (index.name === '_id_') continue;
      const { key, name: indexName, v, ns, ...options } = index;
      await targetDb.collection(name).createIndex(key, { name: indexName, ...options }).catch(() => {});
    }
    total += documents.length;
    console.log(`  ${name}: ${documents.length}`);
  }

  await source.close();
  await target.close();
  console.log(`Done. ${total} documents copied.`);
}

copy().catch((error) => {
  console.error(`Copy failed: ${error.message}`);
  process.exit(1);
});
