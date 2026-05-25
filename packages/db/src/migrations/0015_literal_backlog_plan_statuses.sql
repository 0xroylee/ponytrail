UPDATE board_tasks
SET status = CASE status
	WHEN 'planning' THEN 'backlog'
	WHEN 'todo' THEN 'plan'
	ELSE status
END
WHERE status IN ('planning', 'todo');
