-- Clean up orphan exams that don't have valid class_subject_assignments
-- These are exams created for class/subject combinations that a teacher is no longer assigned to

-- First, let's see what orphan exams exist (run this to preview)
SELECT 
    e.id as exam_id,
    e.title,
    p.full_name as teacher_name,
    c.grade_level || ' ' || c.section as class_name,
    s.name as subject_name,
    e.created_at
FROM exams e
JOIN profiles p ON e.created_by = p.id
JOIN classes c ON e.class_id = c.id
JOIN subjects s ON e.subject_id = s.id
LEFT JOIN class_subject_assignments csa 
    ON csa.class_id = e.class_id 
    AND csa.subject_id = e.subject_id 
    AND csa.teacher_id = e.created_by
WHERE csa.id IS NULL
ORDER BY e.created_at DESC;

-- To delete orphan exams, first delete their results, then delete the exams
-- Run this only if you're sure you want to remove them:

-- Step 1: Delete exam results for orphan exams
DELETE FROM exam_results 
WHERE exam_id IN (
    SELECT e.id
    FROM exams e
    LEFT JOIN class_subject_assignments csa 
        ON csa.class_id = e.class_id 
        AND csa.subject_id = e.subject_id 
        AND csa.teacher_id = e.created_by
    WHERE csa.id IS NULL
);

-- Step 2: Delete orphan exams
DELETE FROM exams 
WHERE id IN (
    SELECT e.id
    FROM exams e
    LEFT JOIN class_subject_assignments csa 
        ON csa.class_id = e.class_id 
        AND csa.subject_id = e.subject_id 
        AND csa.teacher_id = e.created_by
    WHERE csa.id IS NULL
);

-- Verify cleanup - should return 0 rows
SELECT COUNT(*) as orphan_count
FROM exams e
LEFT JOIN class_subject_assignments csa 
    ON csa.class_id = e.class_id 
    AND csa.subject_id = e.subject_id 
    AND csa.teacher_id = e.created_by
WHERE csa.id IS NULL;

DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    RAISE NOTICE 'Orphan exams cleanup completed!';
    RAISE NOTICE 'Run the SELECT query first to preview orphan exams before deleting.';
END $$;
