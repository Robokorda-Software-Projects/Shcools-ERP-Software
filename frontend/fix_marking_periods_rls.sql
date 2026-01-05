-- Fix RLS policies for exam_marking_periods table
-- Students and Parents need to be able to read published marking periods to see their e-reports

-- Add policy for students to view published marking periods for their school
CREATE POLICY "Students can view published marking periods"
ON exam_marking_periods FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.school_id = exam_marking_periods.school_id
    AND profiles.role = 'student'
  )
  AND results_published = true
);

-- Add policy for parents to view published marking periods for their children's school
CREATE POLICY "Parents can view published marking periods"
ON exam_marking_periods FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM students
    JOIN profiles ON students.parent_id = profiles.id
    WHERE profiles.id = auth.uid()
    AND students.school_id = exam_marking_periods.school_id
    AND profiles.role = 'parent'
  )
  AND results_published = true
);

-- Alternative: Simpler policy that allows students and parents in the same school to view published periods
-- If the above policies don't work, use this one instead:

-- DROP POLICY IF EXISTS "Students can view published marking periods" ON exam_marking_periods;
-- DROP POLICY IF EXISTS "Parents can view published marking periods" ON exam_marking_periods;

-- CREATE POLICY "Students and parents can view published marking periods"
-- ON exam_marking_periods FOR SELECT
-- USING (
--   results_published = true
--   AND EXISTS (
--     SELECT 1 FROM profiles 
--     WHERE profiles.id = auth.uid() 
--     AND profiles.school_id = exam_marking_periods.school_id
--     AND profiles.role IN ('student', 'parent')
--   )
-- );
