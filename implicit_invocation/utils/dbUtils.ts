// @ts-nocheck
import { MongoClient } from "mongodb";

const MONGO_URL = Bun.env.MONGO_URL;

if (!MONGO_URL) {
  throw new Error(`Missing URL`);
}

const mongoClient = new MongoClient(MONGO_URL);

await mongoClient.connect();

const db = mongoClient.db(Bun.env.DATABASE);

export const pricesAAPLCollection = db.collection("pricesAAPL");
