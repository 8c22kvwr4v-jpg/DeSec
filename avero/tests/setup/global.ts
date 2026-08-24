import { resetDatabase } from './db';

export async function setup(): Promise<void> {
  await resetDatabase();
}
