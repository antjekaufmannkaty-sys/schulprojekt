-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('quiz', 'test')),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  questions JSONB NOT NULL DEFAULT '[]',
  current_q INT NOT NULL DEFAULT 0,
  timer_secs INT NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  klasse TEXT NOT NULL,
  pin TEXT,
  score INT NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '[]',
  note TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pins table
CREATE TABLE IF NOT EXISTS pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  klasse TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;

-- Public policies (no auth needed)
CREATE POLICY "public read sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "public insert sessions" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "public update sessions" ON sessions FOR UPDATE USING (true);

CREATE POLICY "public read participants" ON participants FOR SELECT USING (true);
CREATE POLICY "public insert participants" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "public update participants" ON participants FOR UPDATE USING (true);

CREATE POLICY "public read events" ON events FOR SELECT USING (true);
CREATE POLICY "public insert events" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "public update events" ON events FOR UPDATE USING (true);

CREATE POLICY "public read pins" ON pins FOR SELECT USING (true);
CREATE POLICY "public insert pins" ON pins FOR INSERT WITH CHECK (true);
CREATE POLICY "public update pins" ON pins FOR UPDATE USING (true);

-- Enable Realtime on all tables
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE pins;
