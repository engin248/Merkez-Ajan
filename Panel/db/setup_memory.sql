-- Ana ve Yonetici ajanlarin zengin hafiza tablosu
CREATE TABLE agent_memory (
    id SERIAL PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    identity TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT '',
    personality TEXT DEFAULT '',
    system_prompt TEXT NOT NULL DEFAULT '',
    capabilities TEXT[] DEFAULT '{}',
    rules TEXT[] DEFAULT '{}',
    pc_tools TEXT[] DEFAULT '{}',
    speech_rules TEXT DEFAULT '',
    extra_context TEXT DEFAULT '',
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id)
);

-- Isci ajanlar icin basit prompt kolonu
ALTER TABLE agents ADD COLUMN IF NOT EXISTS prompt TEXT DEFAULT '';

-- Hafiza degisiklik loglari
CREATE TABLE memory_log (
    id SERIAL PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    change_type TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memory_agent ON agent_memory(agent_id);
CREATE INDEX idx_memlog_agent ON memory_log(agent_id, changed_at DESC);
