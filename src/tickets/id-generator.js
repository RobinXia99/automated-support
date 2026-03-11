import { readFile } from "fs/promises";
import { TICKETS_PATH } from "./store.js";

/**
 * Reads the current tickets file and returns the next sequential SUP-XXXX id.
 * Zero-padded to 4 digits (SUP-0001 … SUP-9999, then SUP-10000+).
 */
export async function nextId() {
  let lastNum = 0;

  try {
    const raw = await readFile(TICKETS_PATH, "utf-8");
    const tickets = JSON.parse(raw);

    if (tickets.length > 0) {
      // Extract numeric parts and find the max
      lastNum = tickets.reduce((max, t) => {
        const num = parseInt(t.id.replace("SUP-", ""), 10);
        return num > max ? num : max;
      }, 0);
    }
  } catch {
    // File missing or unreadable — start from 0
  }

  const next = lastNum + 1;
  return `SUP-${String(next).padStart(4, "0")}`;
}
