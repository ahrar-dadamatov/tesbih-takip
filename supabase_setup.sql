-- =============================================
-- Tesbih Takip - Supabase Database Setup
-- Run this SQL in your Supabase SQL Editor
-- =============================================

-- 1. Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  preferred_language TEXT NOT NULL DEFAULT 'tr' CHECK (preferred_language IN ('tr', 'ru')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$ BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT 'weekly' CHECK (period IN ('weekly', 'daily')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_global BOOLEAN NOT NULL DEFAULT false,
  invite_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own goals" ON goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_goals_user_id ON goals(user_id);

-- 3. Goal items
CREATE TABLE IF NOT EXISTS goal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  dhikr_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  target_count INTEGER NOT NULL DEFAULT 0 CHECK (target_count >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE goal_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own goal items" ON goal_items FOR ALL
  USING (EXISTS (SELECT 1 FROM goals WHERE goals.id = goal_items.goal_id AND goals.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM goals WHERE goals.id = goal_items.goal_id AND goals.user_id = auth.uid()));
CREATE INDEX idx_goal_items_goal_id ON goal_items(goal_id);

-- Join goal by invite RPC function
CREATE OR REPLACE FUNCTION join_goal_by_invite(p_invite_code TEXT)
RETURNS UUID AS $$
DECLARE
  v_source_goal goals%ROWTYPE;
  v_new_goal_id UUID;
  v_item RECORD;
BEGIN
  SELECT * INTO v_source_goal FROM goals WHERE invite_code = p_invite_code AND is_active = true LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hedef bulunamadı';
  END IF;

  INSERT INTO goals (user_id, name, period, is_active, is_global)
  VALUES (auth.uid(), v_source_goal.name, v_source_goal.period, true, false)
  RETURNING id INTO v_new_goal_id;

  FOR v_item IN SELECT * FROM goal_items WHERE goal_id = v_source_goal.id LOOP
    INSERT INTO goal_items (goal_id, dhikr_name, description, target_count, sort_order)
    VALUES (v_new_goal_id, v_item.dhikr_name, v_item.description, v_item.target_count, v_item.sort_order);
  END LOOP;

  RETURN v_new_goal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Progress
CREATE TABLE IF NOT EXISTS progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_item_id UUID NOT NULL REFERENCES goal_items(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, goal_item_id, date)
);

ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own progress" ON progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_progress_user_date ON progress(user_id, date);
CREATE INDEX idx_progress_goal_item ON progress(goal_item_id);

-- 5. Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_progress_updated_at BEFORE UPDATE ON progress FOR EACH ROW EXECUTE FUNCTION update_updated_at();