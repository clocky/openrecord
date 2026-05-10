import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase;

export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync("openrecord.db");

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'New Chat',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tool_calls TEXT,
      tool_results TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      action_prompt TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      dismissed_at TEXT
    );
  `);

  await seedAlertsIfEmpty();
}

function getDb(): SQLite.SQLiteDatabase {
  if (!db) throw new Error("Database not initialized. Call initDatabase() first.");
  return db;
}

// ─── Chats ───

export type Chat = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export async function createChat(title = "New Chat"): Promise<Chat> {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const now = new Date().toISOString();
  await getDb().runAsync(
    "INSERT INTO chats (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
    id, title, now, now
  );
  return { id, title, created_at: now, updated_at: now };
}

export async function getChats(): Promise<Chat[]> {
  return getDb().getAllAsync<Chat>("SELECT * FROM chats ORDER BY updated_at DESC");
}

export async function getChat(id: string): Promise<Chat | null> {
  return getDb().getFirstAsync<Chat>("SELECT * FROM chats WHERE id = ?", id);
}

export async function updateChatTitle(id: string, title: string): Promise<void> {
  const now = new Date().toISOString();
  await getDb().runAsync(
    "UPDATE chats SET title = ?, updated_at = ? WHERE id = ?",
    title, now, id
  );
}

export async function deleteChat(id: string): Promise<void> {
  await getDb().runAsync("DELETE FROM messages WHERE chat_id = ?", id);
  await getDb().runAsync("DELETE FROM chats WHERE id = ?", id);
}

export async function touchChat(id: string): Promise<void> {
  const now = new Date().toISOString();
  await getDb().runAsync("UPDATE chats SET updated_at = ? WHERE id = ?", now, id);
}

// ─── Messages ───

export type Message = {
  id: string;
  chat_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls: string | null;
  tool_results: string | null;
  created_at: string;
};

export async function addMessage(
  chatId: string,
  role: Message["role"],
  content: string,
  toolCalls?: string,
  toolResults?: string,
): Promise<Message> {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const now = new Date().toISOString();
  await getDb().runAsync(
    "INSERT INTO messages (id, chat_id, role, content, tool_calls, tool_results, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    id, chatId, role, content, toolCalls ?? null, toolResults ?? null, now
  );
  await touchChat(chatId);
  return { id, chat_id: chatId, role, content, tool_calls: toolCalls ?? null, tool_results: toolResults ?? null, created_at: now };
}

export async function getMessages(chatId: string): Promise<Message[]> {
  return getDb().getAllAsync<Message>(
    "SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC",
    chatId
  );
}

// ─── Alerts ───

export type Alert = {
  id: string;
  title: string;
  description: string;
  action_prompt: string;
  created_at: string;
  dismissed_at: string | null;
};

export async function getActiveAlerts(): Promise<Alert[]> {
  return getDb().getAllAsync<Alert>(
    "SELECT * FROM alerts WHERE dismissed_at IS NULL ORDER BY created_at DESC"
  );
}

export async function dismissAlert(id: string): Promise<void> {
  const now = new Date().toISOString();
  await getDb().runAsync(
    "UPDATE alerts SET dismissed_at = ? WHERE id = ?",
    now, id
  );
}

async function seedAlertsIfEmpty(): Promise<void> {
  const row = await getDb().getFirstAsync<{ c: number }>(
    "SELECT COUNT(*) AS c FROM alerts"
  );
  if (row && row.c > 0) return;

  const seeds: Array<Omit<Alert, "created_at" | "dismissed_at">> = [
    {
      id: "seed-bill",
      title: "Outstanding bill",
      description: "You have a billing statement that's due soon.",
      action_prompt: "Look up my current outstanding medical bills and tell me what's due, when, and how to pay.",
    },
    {
      id: "seed-refill",
      title: "Medication refill",
      description: "One of your prescriptions may be running low.",
      action_prompt: "Check my medications and tell me which ones are running low or need a refill request soon.",
    },
    {
      id: "seed-followup",
      title: "Follow up on recent results",
      description: "There's a recent lab or imaging result worth reviewing.",
      action_prompt: "Summarize my most recent lab and imaging results and flag anything that warrants a follow-up with my doctor.",
    },
  ];

  for (const s of seeds) {
    await getDb().runAsync(
      "INSERT INTO alerts (id, title, description, action_prompt) VALUES (?, ?, ?, ?)",
      s.id, s.title, s.description, s.action_prompt
    );
  }
}

export async function searchChats(query: string): Promise<Chat[]> {
  const pattern = `%${query}%`;
  return getDb().getAllAsync<Chat>(
    `SELECT DISTINCT c.* FROM chats c
     LEFT JOIN messages m ON c.id = m.chat_id
     WHERE c.title LIKE ? OR m.content LIKE ?
     ORDER BY c.updated_at DESC`,
    pattern, pattern
  );
}
