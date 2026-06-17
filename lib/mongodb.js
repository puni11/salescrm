import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  if (!uri) {
    console.warn("⚠️ MONGODB_URI is not defined. Skipping DB connection during build.");
  } else {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
}

clientPromise = global._mongoClientPromise;

export default clientPromise;