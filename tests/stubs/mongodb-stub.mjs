import { state } from "./db-state.mjs";

/**
 * Stand-in for `src/lib/mongodb.ts`. Never opens a real connection.
 */
export async function connectToDatabase() {
  state.connects += 1;
  if (state.shouldFail) {
    throw new Error("simulated connection failure: MONGODB_URI is not defined");
  }
}
