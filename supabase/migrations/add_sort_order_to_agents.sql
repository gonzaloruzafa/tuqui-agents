-- Add sort_order column to tuqui_agents table
ALTER TABLE tuqui_agents 
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tuqui_agents_sort_order ON tuqui_agents(sort_order);

-- Update existing agents to have sequential sort_order
UPDATE tuqui_agents
SET sort_order = CASE 
  WHEN slug = 'general' THEN 0
  ELSE ROW_NUMBER() OVER (ORDER BY created_at)
END
WHERE sort_order IS NULL OR sort_order = 0;
