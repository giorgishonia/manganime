-- Reset content table
DROP TABLE IF EXISTS content CASCADE;

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  alternative_titles TEXT[] DEFAULT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('anime', 'manga')),
  status TEXT NOT NULL CHECK (status IN ('ongoing', 'completed', 'hiatus')),
  thumbnail TEXT NOT NULL,
  banner_image TEXT DEFAULT NULL,
  genres TEXT[] NOT NULL,
  season TEXT DEFAULT NULL,
  release_year INTEGER DEFAULT NULL,
  rating DECIMAL(3,1) DEFAULT 0,
  anilist_id TEXT DEFAULT NULL,
  mal_id TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reset episodes table
DROP TABLE IF EXISTS episodes CASCADE;

CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  thumbnail TEXT DEFAULT NULL,
  video_url TEXT NOT NULL,
  duration INTEGER DEFAULT NULL,
  release_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(content_id, number)
);

-- Reset chapters table
DROP TABLE IF EXISTS chapters CASCADE;

CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  thumbnail TEXT DEFAULT NULL,
  pages TEXT[] NOT NULL,
  release_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(content_id, number)
);

-- Create indexes for better performance
CREATE INDEX content_type_idx ON content(type);
CREATE INDEX content_genres_idx ON content USING GIN(genres);
CREATE INDEX episodes_content_id_idx ON episodes(content_id);
CREATE INDEX chapters_content_id_idx ON chapters(content_id); 