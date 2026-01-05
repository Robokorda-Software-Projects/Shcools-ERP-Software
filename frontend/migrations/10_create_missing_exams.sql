-- Create missing exams for all existing class-subject assignments
-- Run this SQL to create exams for teachers who don't have them yet

-- This will create exams for all class-subject combinations that don't have exams yet
-- It will use the current academic year and term from the school settings

DO $$
DECLARE
  school_rec RECORD;
  assignment_rec RECORD;
  current_year TEXT;
  current_term_name TEXT;
  exam_date DATE;
  exam_title TEXT;
  exam_description TEXT;
  existing_exam_id UUID;
BEGIN
  -- Loop through all schools
  FOR school_rec IN 
    SELECT id, academic_year, current_term 
    FROM schools 
    WHERE academic_year IS NOT NULL
  LOOP
    current_year := school_rec.academic_year;
    current_term_name := COALESCE(school_rec.current_term, 'Term 1');
    
    -- Set default exam date based on term
    IF current_term_name = 'Term 1' THEN
      exam_date := (current_year || '-04-15')::DATE;
    ELSIF current_term_name = 'Term 2' THEN
      exam_date := (current_year || '-08-15')::DATE;
    ELSE
      exam_date := (current_year || '-12-10')::DATE;
    END IF;
    
    RAISE NOTICE 'Processing school: %, Year: %, Term: %', school_rec.id, current_year, current_term_name;
    
    -- Loop through all class-subject assignments for this school
    FOR assignment_rec IN
      SELECT 
        csa.teacher_id,
        csa.class_id,
        csa.subject_id,
        c.grade_level || ' ' || c.section AS class_name,
        s.name AS subject_name
      FROM class_subject_assignments csa
      INNER JOIN classes c ON csa.class_id = c.id
      INNER JOIN subjects s ON csa.subject_id = s.id
      WHERE c.school_id = school_rec.id
    LOOP
      -- Check if exam already exists for this class-subject-term combination
      SELECT id INTO existing_exam_id
      FROM exams
      WHERE class_id = assignment_rec.class_id
        AND subject_id = assignment_rec.subject_id
        AND school_id = school_rec.id
        AND title ILIKE '%' || current_term_name || '%'
      LIMIT 1;
      
      -- Only create if exam doesn't exist
      IF existing_exam_id IS NULL THEN
        exam_title := assignment_rec.class_name || ' ' || assignment_rec.subject_name || ' End of ' || current_term_name || ' Exam';
        exam_description := 'End of term examination for ' || assignment_rec.subject_name || ' - ' || assignment_rec.class_name;
        
        -- Create the exam
        INSERT INTO exams (
          title,
          description,
          exam_date,
          total_marks,
          class_id,
          subject_id,
          school_id,
          created_by,
          is_submitted
        ) VALUES (
          exam_title,
          exam_description,
          exam_date,
          100,
          assignment_rec.class_id,
          assignment_rec.subject_id,
          school_rec.id,
          assignment_rec.teacher_id,
          false
        );
        
        RAISE NOTICE 'Created exam: %', exam_title;
      ELSE
        RAISE NOTICE 'Exam already exists for: % - %', assignment_rec.class_name, assignment_rec.subject_name;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Exam creation completed!';
END $$;

-- Verify the results
SELECT 
  s.name as school_name,
  COUNT(DISTINCT csa.id) as total_assignments,
  COUNT(DISTINCT e.id) as total_exams,
  COUNT(DISTINCT csa.id) - COUNT(DISTINCT e.id) as missing_exams
FROM schools s
LEFT JOIN classes c ON c.school_id = s.id
LEFT JOIN class_subject_assignments csa ON csa.class_id = c.id
LEFT JOIN exams e ON e.class_id = csa.class_id AND e.subject_id = csa.subject_id
GROUP BY s.id, s.name
ORDER BY s.name;
