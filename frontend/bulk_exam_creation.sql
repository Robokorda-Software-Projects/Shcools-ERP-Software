-- =====================================================
-- BULK EXAM CREATION WITH REALISTIC GRADES
-- =====================================================
-- Creates exams for all subjects and assigns grades to students
-- =====================================================

DO $$
DECLARE
  v_school_stmp UUID := 'b1111111-1111-1111-1111-111111111111';
  v_school_chur UUID := 'b2222222-2222-2222-2222-222222222222';
  v_school_hare UUID := 'b3333333-3333-3333-3333-333333333333';
  v_exam_id UUID;
  v_class_id UUID;
  v_subject_id UUID;
  v_teacher_id UUID;
  v_student_id UUID;
  v_marks DECIMAL;
  v_percentage DECIMAL;
  v_grade VARCHAR;
BEGIN

  RAISE NOTICE 'Starting bulk exam creation...';

  -- =====================================================
  -- ST. MARY''S PRIMARY - TERM 1 EXAMS
  -- =====================================================
  
  RAISE NOTICE 'Creating exams for St. Marys Primary...';
  
  -- Grade 1 English Exam
  SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_stmp AND grade_level = 'Grade 1' LIMIT 1;
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_stmp AND code = 'ENG' LIMIT 1;
  SELECT id INTO v_teacher_id FROM profiles WHERE school_id = v_school_stmp AND role = 'teacher' AND username = 'STMP001-TC-10000001' LIMIT 1;
  
  IF v_class_id IS NOT NULL AND v_subject_id IS NOT NULL AND v_teacher_id IS NOT NULL THEN
    INSERT INTO exams (school_id, class_id, subject_id, title, description, exam_date, total_marks, created_by)
    VALUES (v_school_stmp, v_class_id, v_subject_id, 'Grade 1 English - Term 1 Assessment', 'Reading comprehension, spelling, and basic grammar', '2025-03-15', 50, v_teacher_id)
    RETURNING id INTO v_exam_id;
    
    -- Assign grades to all students in Grade 1
    FOR v_student_id IN (SELECT id FROM students WHERE class_id = v_class_id) LOOP
      v_marks := 30 + FLOOR(RANDOM() * 20); -- Random marks between 30-49
      v_percentage := (v_marks / 50) * 100;
      v_grade := CASE 
        WHEN v_percentage >= 90 THEN 'A'
        WHEN v_percentage >= 80 THEN 'B'
        WHEN v_percentage >= 70 THEN 'C'
        WHEN v_percentage >= 60 THEN 'D'
        WHEN v_percentage >= 50 THEN 'E'
        ELSE 'F'
      END;
      
      INSERT INTO exam_results (exam_id, student_id, marks_obtained, percentage, grade, graded_by, graded_at)
      VALUES (v_exam_id, v_student_id, v_marks, v_percentage, v_grade, v_teacher_id, NOW());
    END LOOP;
  END IF;

  -- Grade 1 Mathematics Exam
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_stmp AND code = 'MTH' LIMIT 1;
  SELECT id INTO v_teacher_id FROM profiles WHERE school_id = v_school_stmp AND role = 'teacher' AND username = 'STMP001-TC-10000002' LIMIT 1;
  
  IF v_class_id IS NOT NULL AND v_subject_id IS NOT NULL AND v_teacher_id IS NOT NULL THEN
    INSERT INTO exams (school_id, class_id, subject_id, title, description, exam_date, total_marks, created_by)
    VALUES (v_school_stmp, v_class_id, v_subject_id, 'Grade 1 Mathematics - Term 1 Test', 'Addition, subtraction, and number recognition', '2025-03-18', 50, v_teacher_id)
    RETURNING id INTO v_exam_id;
    
    FOR v_student_id IN (SELECT id FROM students WHERE class_id = v_class_id) LOOP
      v_marks := 32 + FLOOR(RANDOM() * 18);
      v_percentage := (v_marks / 50) * 100;
      v_grade := CASE 
        WHEN v_percentage >= 90 THEN 'A'
        WHEN v_percentage >= 80 THEN 'B'
        WHEN v_percentage >= 70 THEN 'C'
        WHEN v_percentage >= 60 THEN 'D'
        WHEN v_percentage >= 50 THEN 'E'
        ELSE 'F'
      END;
      
      INSERT INTO exam_results (exam_id, student_id, marks_obtained, percentage, grade, graded_by, graded_at)
      VALUES (v_exam_id, v_student_id, v_marks, v_percentage, v_grade, v_teacher_id, NOW());
    END LOOP;
  END IF;

  -- Grade 5 Science Exam
  SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_stmp AND grade_level = 'Grade 5' LIMIT 1;
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_stmp AND code = 'SCI' LIMIT 1;
  SELECT id INTO v_teacher_id FROM profiles WHERE school_id = v_school_stmp AND role = 'teacher' AND username = 'STMP001-TC-10000003' LIMIT 1;
  
  IF v_class_id IS NOT NULL AND v_subject_id IS NOT NULL AND v_teacher_id IS NOT NULL THEN
    INSERT INTO exams (school_id, class_id, subject_id, title, description, exam_date, total_marks, created_by)
    VALUES (v_school_stmp, v_class_id, v_subject_id, 'Grade 5 Science - Mid-Term Exam', 'Plants, animals, and basic chemistry', '2025-03-20', 100, v_teacher_id)
    RETURNING id INTO v_exam_id;
    
    FOR v_student_id IN (SELECT id FROM students WHERE class_id = v_class_id) LOOP
      v_marks := 60 + FLOOR(RANDOM() * 35);
      v_percentage := (v_marks / 100) * 100;
      v_grade := CASE 
        WHEN v_percentage >= 90 THEN 'A'
        WHEN v_percentage >= 80 THEN 'B'
        WHEN v_percentage >= 70 THEN 'C'
        WHEN v_percentage >= 60 THEN 'D'
        WHEN v_percentage >= 50 THEN 'E'
        ELSE 'F'
      END;
      
      INSERT INTO exam_results (exam_id, student_id, marks_obtained, percentage, grade, graded_by, graded_at)
      VALUES (v_exam_id, v_student_id, v_marks, v_percentage, v_grade, v_teacher_id, NOW());
    END LOOP;
  END IF;

  RAISE NOTICE 'St. Marys Primary: Created 3 exams with grades';

  -- =====================================================
  -- CHURCHILL SECONDARY - TERM 1 EXAMS
  -- =====================================================
  
  RAISE NOTICE 'Creating exams for Churchill Secondary...';
  
  -- Form 1A English Exam
  SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_chur AND grade_level = 'Form 1' AND section = 'A' LIMIT 1;
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_chur AND code = 'ENG' LIMIT 1;
  SELECT id INTO v_teacher_id FROM profiles WHERE school_id = v_school_chur AND role = 'teacher' AND username = 'CHUR001-TC-20000001' LIMIT 1;
  
  IF v_class_id IS NOT NULL AND v_subject_id IS NOT NULL AND v_teacher_id IS NOT NULL THEN
    INSERT INTO exams (school_id, class_id, subject_id, title, description, exam_date, total_marks, created_by)
    VALUES (v_school_chur, v_class_id, v_subject_id, 'Form 1A English - Term 1 Exam', 'Comprehension, composition, and grammar', '2025-03-25', 100, v_teacher_id)
    RETURNING id INTO v_exam_id;
    
    FOR v_student_id IN (SELECT id FROM students WHERE class_id = v_class_id) LOOP
      v_marks := 55 + FLOOR(RANDOM() * 40);
      v_percentage := (v_marks / 100) * 100;
      v_grade := CASE 
        WHEN v_percentage >= 90 THEN 'A'
        WHEN v_percentage >= 80 THEN 'B'
        WHEN v_percentage >= 70 THEN 'C'
        WHEN v_percentage >= 60 THEN 'D'
        WHEN v_percentage >= 50 THEN 'E'
        ELSE 'F'
      END;
      
      INSERT INTO exam_results (exam_id, student_id, marks_obtained, percentage, grade, graded_by, graded_at)
      VALUES (v_exam_id, v_student_id, v_marks, v_percentage, v_grade, v_teacher_id, NOW());
    END LOOP;
  END IF;

  -- Form 1A Mathematics Exam
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_chur AND code = 'MTH' LIMIT 1;
  SELECT id INTO v_teacher_id FROM profiles WHERE school_id = v_school_chur AND role = 'teacher' AND username = 'CHUR001-TC-20000002' LIMIT 1;
  
  IF v_class_id IS NOT NULL AND v_subject_id IS NOT NULL AND v_teacher_id IS NOT NULL THEN
    INSERT INTO exams (school_id, class_id, subject_id, title, description, exam_date, total_marks, created_by)
    VALUES (v_school_chur, v_class_id, v_subject_id, 'Form 1A Mathematics - Term 1 Test', 'Algebra, geometry, and number theory', '2025-03-27', 100, v_teacher_id)
    RETURNING id INTO v_exam_id;
    
    FOR v_student_id IN (SELECT id FROM students WHERE class_id = v_class_id) LOOP
      v_marks := 50 + FLOOR(RANDOM() * 45);
      v_percentage := (v_marks / 100) * 100;
      v_grade := CASE 
        WHEN v_percentage >= 90 THEN 'A'
        WHEN v_percentage >= 80 THEN 'B'
        WHEN v_percentage >= 70 THEN 'C'
        WHEN v_percentage >= 60 THEN 'D'
        WHEN v_percentage >= 50 THEN 'E'
        ELSE 'F'
      END;
      
      INSERT INTO exam_results (exam_id, student_id, marks_obtained, percentage, grade, graded_by, graded_at)
      VALUES (v_exam_id, v_student_id, v_marks, v_percentage, v_grade, v_teacher_id, NOW());
    END LOOP;
  END IF;

  -- Form 3A Biology Exam
  SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_chur AND grade_level = 'Form 3' AND section = 'A' LIMIT 1;
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_chur AND code = 'BIO' LIMIT 1;
  SELECT id INTO v_teacher_id FROM profiles WHERE school_id = v_school_chur AND role = 'teacher' AND username = 'CHUR001-TC-20000003' LIMIT 1;
  
  IF v_class_id IS NOT NULL AND v_subject_id IS NOT NULL AND v_teacher_id IS NOT NULL THEN
    INSERT INTO exams (school_id, class_id, subject_id, title, description, exam_date, total_marks, created_by)
    VALUES (v_school_chur, v_class_id, v_subject_id, 'Form 3A Biology - Mid-Term Exam', 'Cell biology, genetics, and human systems', '2025-03-28', 100, v_teacher_id)
    RETURNING id INTO v_exam_id;
    
    FOR v_student_id IN (SELECT id FROM students WHERE class_id = v_class_id) LOOP
      v_marks := 58 + FLOOR(RANDOM() * 37);
      v_percentage := (v_marks / 100) * 100;
      v_grade := CASE 
        WHEN v_percentage >= 90 THEN 'A'
        WHEN v_percentage >= 80 THEN 'B'
        WHEN v_percentage >= 70 THEN 'C'
        WHEN v_percentage >= 60 THEN 'D'
        WHEN v_percentage >= 50 THEN 'E'
        ELSE 'F'
      END;
      
      INSERT INTO exam_results (exam_id, student_id, marks_obtained, percentage, grade, graded_by, graded_at)
      VALUES (v_exam_id, v_student_id, v_marks, v_percentage, v_grade, v_teacher_id, NOW());
    END LOOP;
  END IF;

  RAISE NOTICE 'Churchill Secondary: Created 3 exams with grades';

  -- =====================================================
  -- HARARE HIGH SCHOOL - TERM 1 EXAMS
  -- =====================================================
  
  RAISE NOTICE 'Creating exams for Harare High...';
  
  -- Form 1A English Exam
  SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_hare AND grade_level = 'Form 1' AND section = 'A' LIMIT 1;
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_hare AND code = 'ENG' LIMIT 1;
  SELECT id INTO v_teacher_id FROM profiles WHERE school_id = v_school_hare AND role = 'teacher' AND username = 'HARE001-TC-30000002' LIMIT 1;
  
  IF v_class_id IS NOT NULL AND v_subject_id IS NOT NULL AND v_teacher_id IS NOT NULL THEN
    INSERT INTO exams (school_id, class_id, subject_id, title, description, exam_date, total_marks, created_by)
    VALUES (v_school_hare, v_class_id, v_subject_id, 'Form 1A English Language - Term 1', 'Literature, composition, and comprehension', '2025-03-22', 100, v_teacher_id)
    RETURNING id INTO v_exam_id;
    
    FOR v_student_id IN (SELECT id FROM students WHERE class_id = v_class_id) LOOP
      v_marks := 60 + FLOOR(RANDOM() * 35);
      v_percentage := (v_marks / 100) * 100;
      v_grade := CASE 
        WHEN v_percentage >= 90 THEN 'A'
        WHEN v_percentage >= 80 THEN 'B'
        WHEN v_percentage >= 70 THEN 'C'
        WHEN v_percentage >= 60 THEN 'D'
        WHEN v_percentage >= 50 THEN 'E'
        ELSE 'F'
      END;
      
      INSERT INTO exam_results (exam_id, student_id, marks_obtained, percentage, grade, graded_by, graded_at)
      VALUES (v_exam_id, v_student_id, v_marks, v_percentage, v_grade, v_teacher_id, NOW());
    END LOOP;
  END IF;

  -- Form 1A Mathematics Exam
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_hare AND code = 'MTH' LIMIT 1;
  SELECT id INTO v_teacher_id FROM profiles WHERE school_id = v_school_hare AND role = 'teacher' AND username = 'HARE001-TC-30000003' LIMIT 1;
  
  IF v_class_id IS NOT NULL AND v_subject_id IS NOT NULL AND v_teacher_id IS NOT NULL THEN
    INSERT INTO exams (school_id, class_id, subject_id, title, description, exam_date, total_marks, created_by)
    VALUES (v_school_hare, v_class_id, v_subject_id, 'Form 1A Mathematics - Term 1 Exam', 'Algebra, geometry, statistics', '2025-03-24', 100, v_teacher_id)
    RETURNING id INTO v_exam_id;
    
    FOR v_student_id IN (SELECT id FROM students WHERE class_id = v_class_id) LOOP
      v_marks := 55 + FLOOR(RANDOM() * 40);
      v_percentage := (v_marks / 100) * 100;
      v_grade := CASE 
        WHEN v_percentage >= 90 THEN 'A'
        WHEN v_percentage >= 80 THEN 'B'
        WHEN v_percentage >= 70 THEN 'C'
        WHEN v_percentage >= 60 THEN 'D'
        WHEN v_percentage >= 50 THEN 'E'
        ELSE 'F'
      END;
      
      INSERT INTO exam_results (exam_id, student_id, marks_obtained, percentage, grade, graded_by, graded_at)
      VALUES (v_exam_id, v_student_id, v_marks, v_percentage, v_grade, v_teacher_id, NOW());
    END LOOP;
  END IF;

  -- Form 2A Biology Exam
  SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_hare AND grade_level = 'Form 2' AND section = 'A' LIMIT 1;
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_hare AND code = 'BIO' LIMIT 1;
  SELECT id INTO v_teacher_id FROM profiles WHERE school_id = v_school_hare AND role = 'teacher' AND username = 'HARE001-TC-30000005' LIMIT 1;
  
  IF v_class_id IS NOT NULL AND v_subject_id IS NOT NULL AND v_teacher_id IS NOT NULL THEN
    INSERT INTO exams (school_id, class_id, subject_id, title, description, exam_date, total_marks, created_by)
    VALUES (v_school_hare, v_class_id, v_subject_id, 'Form 2A Biology - Mid-Term', 'Ecology, evolution, and classification', '2025-03-26', 100, v_teacher_id)
    RETURNING id INTO v_exam_id;
    
    FOR v_student_id IN (SELECT id FROM students WHERE class_id = v_class_id) LOOP
      v_marks := 62 + FLOOR(RANDOM() * 33);
      v_percentage := (v_marks / 100) * 100;
      v_grade := CASE 
        WHEN v_percentage >= 90 THEN 'A'
        WHEN v_percentage >= 80 THEN 'B'
        WHEN v_percentage >= 70 THEN 'C'
        WHEN v_percentage >= 60 THEN 'D'
        WHEN v_percentage >= 50 THEN 'E'
        ELSE 'F'
      END;
      
      INSERT INTO exam_results (exam_id, student_id, marks_obtained, percentage, grade, graded_by, graded_at)
      VALUES (v_exam_id, v_student_id, v_marks, v_percentage, v_grade, v_teacher_id, NOW());
    END LOOP;
  END IF;

  -- Form 4A Physics Exam (O-Level Prep)
  SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_hare AND grade_level = 'Form 4' AND section = 'A' LIMIT 1;
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_hare AND code = 'PHY' LIMIT 1;
  SELECT id INTO v_teacher_id FROM profiles WHERE school_id = v_school_hare AND role = 'teacher' AND username = 'HARE001-TC-30000006' LIMIT 1;
  
  IF v_class_id IS NOT NULL AND v_subject_id IS NOT NULL AND v_teacher_id IS NOT NULL THEN
    INSERT INTO exams (school_id, class_id, subject_id, title, description, exam_date, total_marks, created_by)
    VALUES (v_school_hare, v_class_id, v_subject_id, 'Form 4A Physics - Mock Exam', 'Mechanics, electricity, and waves', '2025-03-29', 100, v_teacher_id)
    RETURNING id INTO v_exam_id;
    
    FOR v_student_id IN (SELECT id FROM students WHERE class_id = v_class_id) LOOP
      v_marks := 65 + FLOOR(RANDOM() * 30);
      v_percentage := (v_marks / 100) * 100;
      v_grade := CASE 
        WHEN v_percentage >= 90 THEN 'A'
        WHEN v_percentage >= 80 THEN 'B'
        WHEN v_percentage >= 70 THEN 'C'
        WHEN v_percentage >= 60 THEN 'D'
        WHEN v_percentage >= 50 THEN 'E'
        ELSE 'F'
      END;
      
      INSERT INTO exam_results (exam_id, student_id, marks_obtained, percentage, grade, graded_by, graded_at)
      VALUES (v_exam_id, v_student_id, v_marks, v_percentage, v_grade, v_teacher_id, NOW());
    END LOOP;
  END IF;

  -- Lower 6 Science - Pure Mathematics Exam
  SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_hare AND grade_level = 'Lower 6' AND section = 'Science' LIMIT 1;
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_hare AND code = 'PMTH' LIMIT 1;
  SELECT id INTO v_teacher_id FROM profiles WHERE school_id = v_school_hare AND role = 'teacher' AND username = 'HARE001-TC-30000004' LIMIT 1;
  
  IF v_class_id IS NOT NULL AND v_subject_id IS NOT NULL AND v_teacher_id IS NOT NULL THEN
    INSERT INTO exams (school_id, class_id, subject_id, title, description, exam_date, total_marks, created_by)
    VALUES (v_school_hare, v_class_id, v_subject_id, 'Lower 6 Pure Mathematics - Term 1', 'Calculus, algebra, and trigonometry', '2025-03-30', 100, v_teacher_id)
    RETURNING id INTO v_exam_id;
    
    FOR v_student_id IN (SELECT id FROM students WHERE class_id = v_class_id) LOOP
      v_marks := 70 + FLOOR(RANDOM() * 25);
      v_percentage := (v_marks / 100) * 100;
      v_grade := CASE 
        WHEN v_percentage >= 90 THEN 'A'
        WHEN v_percentage >= 80 THEN 'B'
        WHEN v_percentage >= 70 THEN 'C'
        WHEN v_percentage >= 60 THEN 'D'
        WHEN v_percentage >= 50 THEN 'E'
        ELSE 'F'
      END;
      
      INSERT INTO exam_results (exam_id, student_id, marks_obtained, percentage, grade, graded_by, graded_at)
      VALUES (v_exam_id, v_student_id, v_marks, v_percentage, v_grade, v_teacher_id, NOW());
    END LOOP;
  END IF;

  RAISE NOTICE 'Harare High: Created 5 exams with grades';
  RAISE NOTICE 'Bulk exam creation complete!';

END $$;

-- Summary
SELECT 
  'EXAM CREATION COMPLETE' as status,
  (SELECT COUNT(*) FROM exams WHERE school_id = 'b1111111-1111-1111-1111-111111111111') as stmarys_exams,
  (SELECT COUNT(*) FROM exams WHERE school_id = 'b2222222-2222-2222-2222-222222222222') as churchill_exams,
  (SELECT COUNT(*) FROM exams WHERE school_id = 'b3333333-3333-3333-3333-333333333333') as harare_exams,
  (SELECT COUNT(*) FROM exams) as total_exams,
  (SELECT COUNT(*) FROM exam_results) as total_exam_results;
