import { Logger } from './utils/logger';
const logger = new Logger('Database');
/**
 * ═══════════════════════════════════════════════════════════
 * ASKER MOTORU — PostgreSQL Veritabanı Modülü
 * Tüm ajan, edge ve sohbet verilerini yerel PostgreSQL'de saklar.
 * ═══════════════════════════════════════════════════════════
 */
import * as dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

// Bağlantı test
pool.on('connect', () => logger.info('PostgreSQL connection established'));
pool.on('error', (err) => logger.error('PostgreSQL error:', err.message));

// ═══════════════════════════════════════════════════════════
// AGENTS (Ajan CRUD)
// ═══════════════════════════════════════════════════════════

/**
 * Tüm ajanları veritabanından çek
 */
async function getAllAgents() {
  const { rows } = await pool.query(
    'SELECT * FROM agents ORDER BY created_at ASC'
  );
  return rows;
}

/**
 * Tek bir ajanı ID ile getir
 */
async function getAgent(id) {
  const { rows } = await pool.query('SELECT * FROM agents WHERE id = $1', [id]);
  return rows[0] || null;
}

/**
 * Ajan ekle veya güncelle (upsert)
 */
async function upsertAgent(agent) {
  const q = `
    INSERT INTO agents (id, label, sub, x, y, r, color, type, model, parent, children, info, capabilities)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (id) DO UPDATE SET
      label = EXCLUDED.label,
      sub = EXCLUDED.sub,
      x = EXCLUDED.x,
      y = EXCLUDED.y,
      r = EXCLUDED.r,
      color = EXCLUDED.color,
      type = EXCLUDED.type,
      model = EXCLUDED.model,
      parent = EXCLUDED.parent,
      children = EXCLUDED.children,
      info = EXCLUDED.info,
      capabilities = EXCLUDED.capabilities,
      updated_at = NOW()
    RETURNING *;
  `;
  const values = [
    agent.id,
    agent.label,
    agent.sub || null,
    agent.x || 0,
    agent.y || 0,
    agent.r || 22,
    agent.color || '#00d4ff',
    agent.type || 'mesh',
    agent.model || null,
    agent.parent || null,
    agent.children || [],
    agent.info || [],
    agent.capabilities || []
  ];
  const { rows } = await pool.query(q, values);
  return rows[0];
}

/**
 * Tüm ajanları toplu kaydet (tam graph state)
 */
async function saveAllAgents(agents) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const agent of agents) {
      await client.query(`
        INSERT INTO agents (id, label, sub, x, y, r, color, type, model, parent, children, info, capabilities)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          label = EXCLUDED.label, sub = EXCLUDED.sub,
          x = EXCLUDED.x, y = EXCLUDED.y, r = EXCLUDED.r,
          color = EXCLUDED.color, type = EXCLUDED.type,
          model = EXCLUDED.model, parent = EXCLUDED.parent,
          children = EXCLUDED.children, info = EXCLUDED.info,
          capabilities = EXCLUDED.capabilities, updated_at = NOW()
      `, [
        agent.id, agent.label, agent.sub || null,
        agent.x || 0, agent.y || 0, agent.r || 22,
        agent.color || '#00d4ff', agent.type || 'mesh',
        agent.model || null, agent.parent || null,
        agent.children || [], agent.info || [],
        agent.capabilities || []
      ]);
    }
    await client.query('COMMIT');
    return { success: true, count: agents.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Ajan sil (ve bağlı edge/chat'ler CASCADE ile silinir)
 */
async function deleteAgent(id) {
  await pool.query('DELETE FROM agents WHERE id = $1', [id]);
}

// ═══════════════════════════════════════════════════════════
// EDGES (Bağlantılar)
// ═══════════════════════════════════════════════════════════

async function getAllEdges() {
  const { rows } = await pool.query('SELECT from_node, to_node, color FROM edges');
  return rows.map(r => ({ from: r.from_node, to: r.to_node, color: r.color }));
}

async function saveAllEdges(edges) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM edges');
    for (const edge of edges) {
      await client.query(
        'INSERT INTO edges (from_node, to_node, color) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [edge.from, edge.to, edge.color || '#00d4ff']
      );
    }
    await client.query('COMMIT');
    return { success: true, count: edges.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════════════
// CHAT MESSAGES (Ajan Bazlı Sohbet)
// ═══════════════════════════════════════════════════════════

/**
 * Bir ajanın sohbet geçmişini getir (son N mesaj)
 */
async function getChatHistory(agentId, limit = 100) {
  const { rows } = await pool.query(
    `SELECT role, content, created_at FROM chat_messages
     WHERE agent_id = $1
     ORDER BY created_at ASC
     LIMIT $2`,
    [agentId, limit]
  );
  return rows;
}

/**
 * Sohbete mesaj ekle
 */
async function addChatMessage(agentId, role, content) {
  const { rows } = await pool.query(
    `INSERT INTO chat_messages (agent_id, role, content)
     VALUES ($1, $2, $3)
     RETURNING id, created_at`,
    [agentId, role, content]
  );
  return rows[0];
}

/**
 * Bir ajanın sohbet geçmişini sil (Yeni Sohbet)
 */
async function clearChatHistory(agentId) {
  await pool.query('DELETE FROM chat_messages WHERE agent_id = $1', [agentId]);
}

// ═══════════════════════════════════════════════════════════
// GRAPH STATE (Tam Kaydet / Yükle)
// ═══════════════════════════════════════════════════════════

/**
 * Tam graph state kaydet (agents + edges)
 */
async function saveGraphState(agents, edges) {
  const agentResult = await saveAllAgents(agents);
  const edgeResult = await saveAllEdges(edges);
  return { agents: agentResult.count, edges: edgeResult.count };
}

/**
 * Tam graph state yükle
 */
async function loadGraphState() {
  const agents = await getAllAgents();
  const edges = await getAllEdges();
  return { nodes: agents, edges };
}

// ═══════════════════════════════════════════════════════════
// AGENT MEMORY (Ana + Yönetici: Zengin Hafıza / İşçi: Basit Prompt)
// ═══════════════════════════════════════════════════════════

/**
 * Ana/Yönetici ajanın hafızasını getir
 */
async function getAgentMemory(agentId) {
  const { rows } = await pool.query(
    'SELECT * FROM agent_memory WHERE agent_id = $1 AND is_active = true',
    [agentId]
  );
  return rows[0] || null;
}

/**
 * Ana/Yönetici ajanın hafızasını kaydet/güncelle (upsert)
 */
async function upsertAgentMemory(agentId, memory) {
  // Önce eski değeri log'a yaz
  const existing = await getAgentMemory(agentId);
  if (existing) {
    await pool.query(
      `INSERT INTO memory_log (agent_id, change_type, old_value, new_value)
       VALUES ($1, 'UPDATE', $2, $3)`,
      [agentId, existing.system_prompt, memory.system_prompt || '']
    );
  }

  const { rows } = await pool.query(`
    INSERT INTO agent_memory (agent_id, identity, role, personality, system_prompt,
                              capabilities, rules, pc_tools, speech_rules, extra_context)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (agent_id) DO UPDATE SET
      identity = EXCLUDED.identity,
      role = EXCLUDED.role,
      personality = EXCLUDED.personality,
      system_prompt = EXCLUDED.system_prompt,
      capabilities = EXCLUDED.capabilities,
      rules = EXCLUDED.rules,
      pc_tools = EXCLUDED.pc_tools,
      speech_rules = EXCLUDED.speech_rules,
      extra_context = EXCLUDED.extra_context,
      version = agent_memory.version + 1,
      updated_at = NOW()
    RETURNING *;
  `, [
    agentId,
    memory.identity || '',
    memory.role || '',
    memory.personality || '',
    memory.system_prompt || '',
    memory.capabilities || [],
    memory.rules || [],
    memory.pc_tools || [],
    memory.speech_rules || '',
    memory.extra_context || ''
  ]);
  return rows[0];
}

/**
 * İşçi ajanın basit prompt'unu getir
 */
async function getWorkerPrompt(agentId) {
  const { rows } = await pool.query(
    'SELECT prompt FROM agents WHERE id = $1',
    [agentId]
  );
  return rows[0]?.prompt || '';
}

/**
 * İşçi ajanın basit prompt'unu kaydet
 */
async function setWorkerPrompt(agentId, prompt) {
  await pool.query(
    'UPDATE agents SET prompt = $1, updated_at = NOW() WHERE id = $2',
    [prompt, agentId]
  );
  return { success: true };
}

/**
 * Sohbet için uygun system prompt'u getir (rank'a göre otomatik seçim)
 * Ana/Yönetici → agent_memory tablosundan
 * İşçi → agents.prompt kolonundan
 */
async function getSystemPromptForChat(agentId) {
  // Önce agent_memory'de var mı kontrol et (Ana/Yönetici)
  const memory = await getAgentMemory(agentId);
  if (memory && memory.system_prompt) {
    return memory.system_prompt;
  }
  // Yoksa işçi ajanın basit prompt'unu dön
  return await getWorkerPrompt(agentId);
}

/**
 * Hafıza değişiklik loglarını getir
 */
async function getMemoryLog(agentId, limit = 20) {
  const { rows } = await pool.query(
    `SELECT * FROM memory_log WHERE agent_id = $1
     ORDER BY changed_at DESC LIMIT $2`,
    [agentId, limit]
  );
  return rows;
}

/**
 * Bağlantıyı test et
 */
async function testConnection() {
  try {
    const { rows } = await pool.query('SELECT NOW() as now, current_database() as db');
    return { connected: true, time: rows[0].now, database: rows[0].db };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

export {
  pool,
  // Agents
  getAllAgents, getAgent, upsertAgent, saveAllAgents, deleteAgent,
  // Edges
  getAllEdges, saveAllEdges,
  // Chat
  getChatHistory, addChatMessage, clearChatHistory,
  // Graph State
  saveGraphState, loadGraphState,
  // Agent Memory
  getAgentMemory, upsertAgentMemory,
  getWorkerPrompt, setWorkerPrompt,
  getSystemPromptForChat, getMemoryLog,
  // Utils
  testConnection
};
