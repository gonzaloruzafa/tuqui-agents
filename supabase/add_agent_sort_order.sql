-- Agregar sort_order a tuqui_agents
ALTER TABLE tuqui_agents ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Actualizar agentes existentes con un sort_order basado en created_at
UPDATE tuqui_agents 
SET sort_order = subquery.row_num 
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num 
  FROM tuqui_agents
) AS subquery 
WHERE tuqui_agents.id = subquery.id;
