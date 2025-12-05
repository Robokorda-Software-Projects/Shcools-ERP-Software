-- =====================================================
-- BULK STUDENT ENROLLMENT FOR ALL 3 SCHOOLS
-- =====================================================

DO $$
DECLARE
  v_school_stmp UUID := 'b1111111-1111-1111-1111-111111111111';
  v_school_chur UUID := 'b2222222-2222-2222-2222-222222222222';
  v_school_hare UUID := 'b3333333-3333-3333-3333-333333333333';
  v_class_id UUID;
  v_student_counter INTEGER;
  v_student_name TEXT;
  v_student_email TEXT;
  v_student_username TEXT;
  v_auth_user_id UUID;
  v_section TEXT;
  v_form_num INTEGER;
  v_grade_num INTEGER;
BEGIN

  RAISE NOTICE 'Starting bulk enrollment...';

  -- =====================================================
  -- ST. MARY''S PRIMARY SCHOOL (STMP001)
  -- =====================================================
  
  RAISE NOTICE 'Enrolling students at St. Marys Primary School...';
  
  -- ECD A (20 students)
  SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_stmp AND grade_level = 'ECD A' LIMIT 1;
  IF v_class_id IS NOT NULL THEN
    FOR i IN 1..20 LOOP
      v_student_name := 'STMP ECD-A Student ' || i;
      v_student_email := 'stmp.ecda.' || i || '@eschools.test';
      v_student_username := 'STMP001-ST-' || LPAD((10000000 + i)::TEXT, 8, '0');
      
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
      VALUES (gen_random_uuid(), v_student_email, crypt('Student123!', gen_salt('bf')), NOW(), NOW(), NOW())
      RETURNING id INTO v_auth_user_id;
      
      INSERT INTO profiles (id, email, username, full_name, role, school_id)
      VALUES (v_auth_user_id, v_student_email, v_student_username, v_student_name, 'student', v_school_stmp);
      
      INSERT INTO students (user_id, class_id, admission_date)
      VALUES (v_auth_user_id, v_class_id, '2025-01-06');
    END LOOP;
  END IF;

  -- ECD B (18 students)
  SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_stmp AND grade_level = 'ECD B' LIMIT 1;
  IF v_class_id IS NOT NULL THEN
    FOR i IN 1..18 LOOP
      v_student_name := 'STMP ECD-B Student ' || i;
      v_student_email := 'stmp.ecdb.' || i || '@eschools.test';
      v_student_username := 'STMP001-ST-' || LPAD((10000100 + i)::TEXT, 8, '0');
      
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
      VALUES (gen_random_uuid(), v_student_email, crypt('Student123!', gen_salt('bf')), NOW(), NOW(), NOW())
      RETURNING id INTO v_auth_user_id;
      
      INSERT INTO profiles (id, email, username, full_name, role, school_id)
      VALUES (v_auth_user_id, v_student_email, v_student_username, v_student_name, 'student', v_school_stmp);
      
      INSERT INTO students (user_id, class_id, admission_date)
      VALUES (v_auth_user_id, v_class_id, '2025-01-06');
    END LOOP;
  END IF;

  -- ECD C (22 students)
  SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_stmp AND grade_level = 'ECD C' LIMIT 1;
  IF v_class_id IS NOT NULL THEN
    FOR i IN 1..22 LOOP
      v_student_name := 'STMP ECD-C Student ' || i;
      v_student_email := 'stmp.ecdc.' || i || '@eschools.test';
      v_student_username := 'STMP001-ST-' || LPAD((10000200 + i)::TEXT, 8, '0');
      
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
      VALUES (gen_random_uuid(), v_student_email, crypt('Student123!', gen_salt('bf')), NOW(), NOW(), NOW())
      RETURNING id INTO v_auth_user_id;
      
      INSERT INTO profiles (id, email, username, full_name, role, school_id)
      VALUES (v_auth_user_id, v_student_email, v_student_username, v_student_name, 'student', v_school_stmp);
      
      INSERT INTO students (user_id, class_id, admission_date)
      VALUES (v_auth_user_id, v_class_id, '2025-01-06');
    END LOOP;
  END IF;

  -- Grades 1-7 (25 students each)
  v_student_counter := 10000300;
  FOR v_grade_num IN 1..7 LOOP
    SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_stmp AND grade_level = 'Grade ' || v_grade_num LIMIT 1;
    IF v_class_id IS NOT NULL THEN
      FOR i IN 1..25 LOOP
        v_student_name := 'STMP Grade-' || v_grade_num || ' Student ' || i;
        v_student_email := 'stmp.g' || v_grade_num || '.' || i || '@eschools.test';
        v_student_username := 'STMP001-ST-' || LPAD((v_student_counter + i)::TEXT, 8, '0');
        
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
        VALUES (gen_random_uuid(), v_student_email, crypt('Student123!', gen_salt('bf')), NOW(), NOW(), NOW())
        RETURNING id INTO v_auth_user_id;
        
        INSERT INTO profiles (id, email, username, full_name, role, school_id)
        VALUES (v_auth_user_id, v_student_email, v_student_username, v_student_name, 'student', v_school_stmp);
        
        INSERT INTO students (user_id, class_id, admission_date)
        VALUES (v_auth_user_id, v_class_id, '2025-01-06');
      END LOOP;
      v_student_counter := v_student_counter + 100;
    END IF;
  END LOOP;

  RAISE NOTICE 'St. Marys Primary: Enrolled students';

  -- =====================================================
  -- CHURCHILL SECONDARY SCHOOL (CHUR001)
  -- =====================================================
  
  RAISE NOTICE 'Enrolling students at Churchill Secondary School...';
  
  v_student_counter := 20000000;
  FOR v_form_num IN 1..4 LOOP
    -- Section A
    SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_chur AND grade_level = 'Form ' || v_form_num AND section = 'A' LIMIT 1;
    IF v_class_id IS NOT NULL THEN
      FOR i IN 1..32 LOOP
        v_student_name := 'CHUR F' || v_form_num || 'A Student ' || i;
        v_student_email := 'chur.f' || v_form_num || 'a.' || i || '@eschools.test';
        v_student_username := 'CHUR001-ST-' || LPAD((v_student_counter + i)::TEXT, 8, '0');
        
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
        VALUES (gen_random_uuid(), v_student_email, crypt('Student123!', gen_salt('bf')), NOW(), NOW(), NOW())
        RETURNING id INTO v_auth_user_id;
        
        INSERT INTO profiles (id, email, username, full_name, role, school_id)
        VALUES (v_auth_user_id, v_student_email, v_student_username, v_student_name, 'student', v_school_chur);
        
        INSERT INTO students (user_id, class_id, admission_date)
        VALUES (v_auth_user_id, v_class_id, '2025-01-06');
      END LOOP;
      v_student_counter := v_student_counter + 100;
    END IF;

    -- Section B
    SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_chur AND grade_level = 'Form ' || v_form_num AND section = 'B' LIMIT 1;
    IF v_class_id IS NOT NULL THEN
      FOR i IN 1..32 LOOP
        v_student_name := 'CHUR F' || v_form_num || 'B Student ' || i;
        v_student_email := 'chur.f' || v_form_num || 'b.' || i || '@eschools.test';
        v_student_username := 'CHUR001-ST-' || LPAD((v_student_counter + i)::TEXT, 8, '0');
        
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
        VALUES (gen_random_uuid(), v_student_email, crypt('Student123!', gen_salt('bf')), NOW(), NOW(), NOW())
        RETURNING id INTO v_auth_user_id;
        
        INSERT INTO profiles (id, email, username, full_name, role, school_id)
        VALUES (v_auth_user_id, v_student_email, v_student_username, v_student_name, 'student', v_school_chur);
        
        INSERT INTO students (user_id, class_id, admission_date)
        VALUES (v_auth_user_id, v_class_id, '2025-01-06');
      END LOOP;
      v_student_counter := v_student_counter + 100;
    END IF;

    -- Section C
    SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_chur AND grade_level = 'Form ' || v_form_num AND section = 'C' LIMIT 1;
    IF v_class_id IS NOT NULL THEN
      FOR i IN 1..32 LOOP
        v_student_name := 'CHUR F' || v_form_num || 'C Student ' || i;
        v_student_email := 'chur.f' || v_form_num || 'c.' || i || '@eschools.test';
        v_student_username := 'CHUR001-ST-' || LPAD((v_student_counter + i)::TEXT, 8, '0');
        
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
        VALUES (gen_random_uuid(), v_student_email, crypt('Student123!', gen_salt('bf')), NOW(), NOW(), NOW())
        RETURNING id INTO v_auth_user_id;
        
        INSERT INTO profiles (id, email, username, full_name, role, school_id)
        VALUES (v_auth_user_id, v_student_email, v_student_username, v_student_name, 'student', v_school_chur);
        
        INSERT INTO students (user_id, class_id, admission_date)
        VALUES (v_auth_user_id, v_class_id, '2025-01-06');
      END LOOP;
      v_student_counter := v_student_counter + 100;
    END IF;
  END LOOP;

  RAISE NOTICE 'Churchill Secondary: Enrolled students';

  -- =====================================================
  -- HARARE HIGH SCHOOL (HARE001)
  -- =====================================================
  
  RAISE NOTICE 'Enrolling students at Harare High School...';
  
  v_student_counter := 30000000;
  
  -- Forms 1-4
  FOR v_form_num IN 1..4 LOOP
    -- Section A
    SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_hare AND grade_level = 'Form ' || v_form_num AND section = 'A' LIMIT 1;
    IF v_class_id IS NOT NULL THEN
      FOR i IN 1..32 LOOP
        v_student_name := 'HARE F' || v_form_num || 'A Student ' || i;
        v_student_email := 'hare.f' || v_form_num || 'a.' || i || '@eschools.test';
        v_student_username := 'HARE001-ST-' || LPAD((v_student_counter + i)::TEXT, 8, '0');
        
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
        VALUES (gen_random_uuid(), v_student_email, crypt('Student123!', gen_salt('bf')), NOW(), NOW(), NOW())
        RETURNING id INTO v_auth_user_id;
        
        INSERT INTO profiles (id, email, username, full_name, role, school_id)
        VALUES (v_auth_user_id, v_student_email, v_student_username, v_student_name, 'student', v_school_hare);
        
        INSERT INTO students (user_id, class_id, admission_date)
        VALUES (v_auth_user_id, v_class_id, '2025-01-06');
      END LOOP;
      v_student_counter := v_student_counter + 100;
    END IF;

    -- Section B
    SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_hare AND grade_level = 'Form ' || v_form_num AND section = 'B' LIMIT 1;
    IF v_class_id IS NOT NULL THEN
      FOR i IN 1..32 LOOP
        v_student_name := 'HARE F' || v_form_num || 'B Student ' || i;
        v_student_email := 'hare.f' || v_form_num || 'b.' || i || '@eschools.test';
        v_student_username := 'HARE001-ST-' || LPAD((v_student_counter + i)::TEXT, 8, '0');
        
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
        VALUES (gen_random_uuid(), v_student_email, crypt('Student123!', gen_salt('bf')), NOW(), NOW(), NOW())
        RETURNING id INTO v_auth_user_id;
        
        INSERT INTO profiles (id, email, username, full_name, role, school_id)
        VALUES (v_auth_user_id, v_student_email, v_student_username, v_student_name, 'student', v_school_hare);
        
        INSERT INTO students (user_id, class_id, admission_date)
        VALUES (v_auth_user_id, v_class_id, '2025-01-06');
      END LOOP;
      v_student_counter := v_student_counter + 100;
    END IF;

    -- Section C
    SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_hare AND grade_level = 'Form ' || v_form_num AND section = 'C' LIMIT 1;
    IF v_class_id IS NOT NULL THEN
      FOR i IN 1..32 LOOP
        v_student_name := 'HARE F' || v_form_num || 'C Student ' || i;
        v_student_email := 'hare.f' || v_form_num || 'c.' || i || '@eschools.test';
        v_student_username := 'HARE001-ST-' || LPAD((v_student_counter + i)::TEXT, 8, '0');
        
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
        VALUES (gen_random_uuid(), v_student_email, crypt('Student123!', gen_salt('bf')), NOW(), NOW(), NOW())
        RETURNING id INTO v_auth_user_id;
        
        INSERT INTO profiles (id, email, username, full_name, role, school_id)
        VALUES (v_auth_user_id, v_student_email, v_student_username, v_student_name, 'student', v_school_hare);
        
        INSERT INTO students (user_id, class_id, admission_date)
        VALUES (v_auth_user_id, v_class_id, '2025-01-06');
      END LOOP;
      v_student_counter := v_student_counter + 100;
    END IF;
  END LOOP;

  -- Lower 6 Science (25 students)
  SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_hare AND grade_level = 'Lower 6' AND section = 'Science' LIMIT 1;
  IF v_class_id IS NOT NULL THEN
    FOR i IN 1..25 LOOP
      v_student_name := 'HARE L6-Science Student ' || i;
      v_student_email := 'hare.l6sci.' || i || '@eschools.test';
      v_student_username := 'HARE001-ST-' || LPAD((v_student_counter + i)::TEXT, 8, '0');
      
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
      VALUES (gen_random_uuid(), v_student_email, crypt('Student123!', gen_salt('bf')), NOW(), NOW(), NOW())
      RETURNING id INTO v_auth_user_id;
      
      INSERT INTO profiles (id, email, username, full_name, role, school_id)
      VALUES (v_auth_user_id, v_student_email, v_student_username, v_student_name, 'student', v_school_hare);
      
      INSERT INTO students (user_id, class_id, admission_date)
      VALUES (v_auth_user_id, v_class_id, '2025-01-06');
    END LOOP;
    v_student_counter := v_student_counter + 100;
  END IF;

  -- Lower 6 Arts (25 students)
  SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_hare AND grade_level = 'Lower 6' AND section = 'Arts' LIMIT 1;
  IF v_class_id IS NOT NULL THEN
    FOR i IN 1..25 LOOP
      v_student_name := 'HARE L6-Arts Student ' || i;
      v_student_email := 'hare.l6art.' || i || '@eschools.test';
      v_student_username := 'HARE001-ST-' || LPAD((v_student_counter + i)::TEXT, 8, '0');
      
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
      VALUES (gen_random_uuid(), v_student_email, crypt('Student123!', gen_salt('bf')), NOW(), NOW(), NOW())
      RETURNING id INTO v_auth_user_id;
      
      INSERT INTO profiles (id, email, username, full_name, role, school_id)
      VALUES (v_auth_user_id, v_student_email, v_student_username, v_student_name, 'student', v_school_hare);
      
      INSERT INTO students (user_id, class_id, admission_date)
      VALUES (v_auth_user_id, v_class_id, '2025-01-06');
    END LOOP;
    v_student_counter := v_student_counter + 100;
  END IF;

  -- Lower 6 Commerce (25 students)
  SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_hare AND grade_level = 'Lower 6' AND section = 'Commerce' LIMIT 1;
  IF v_class_id IS NOT NULL THEN
    FOR i IN 1..25 LOOP
      v_student_name := 'HARE L6-Commerce Student ' || i;
      v_student_email := 'hare.l6com.' || i || '@eschools.test';
      v_student_username := 'HARE001-ST-' || LPAD((v_student_counter + i)::TEXT, 8, '0');
      
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
      VALUES (gen_random_uuid(), v_student_email, crypt('Student123!', gen_salt('bf')), NOW(), NOW(), NOW())
      RETURNING id INTO v_auth_user_id;
      
      INSERT INTO profiles (id, email, username, full_name, role, school_id)
      VALUES (v_auth_user_id, v_student_email, v_student_username, v_student_name, 'student', v_school_hare);
      
      INSERT INTO students (user_id, class_id, admission_date)
      VALUES (v_auth_user_id, v_class_id, '2025-01-06');
    END LOOP;
    v_student_counter := v_student_counter + 100;
  END IF;

  -- Upper 6 Science (22 students)
  SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_hare AND grade_level = 'Upper 6' AND section = 'Science' LIMIT 1;
  IF v_class_id IS NOT NULL THEN
    FOR i IN 1..22 LOOP
      v_student_name := 'HARE U6-Science Student ' || i;
      v_student_email := 'hare.u6sci.' || i || '@eschools.test';
      v_student_username := 'HARE001-ST-' || LPAD((v_student_counter + i)::TEXT, 8, '0');
      
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
      VALUES (gen_random_uuid(), v_student_email, crypt('Student123!', gen_salt('bf')), NOW(), NOW(), NOW())
      RETURNING id INTO v_auth_user_id;
      
      INSERT INTO profiles (id, email, username, full_name, role, school_id)
      VALUES (v_auth_user_id, v_student_email, v_student_username, v_student_name, 'student', v_school_hare);
      
      INSERT INTO students (user_id, class_id, admission_date)
      VALUES (v_auth_user_id, v_class_id, '2025-01-06');
    END LOOP;
    v_student_counter := v_student_counter + 100;
  END IF;

  -- Upper 6 Arts (22 students)
  SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_hare AND grade_level = 'Upper 6' AND section = 'Arts' LIMIT 1;
  IF v_class_id IS NOT NULL THEN
    FOR i IN 1..22 LOOP
      v_student_name := 'HARE U6-Arts Student ' || i;
      v_student_email := 'hare.u6art.' || i || '@eschools.test';
      v_student_username := 'HARE001-ST-' || LPAD((v_student_counter + i)::TEXT, 8, '0');
      
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
      VALUES (gen_random_uuid(), v_student_email, crypt('Student123!', gen_salt('bf')), NOW(), NOW(), NOW())
      RETURNING id INTO v_auth_user_id;
      
      INSERT INTO profiles (id, email, username, full_name, role, school_id)
      VALUES (v_auth_user_id, v_student_email, v_student_username, v_student_name, 'student', v_school_hare);
      
      INSERT INTO students (user_id, class_id, admission_date)
      VALUES (v_auth_user_id, v_class_id, '2025-01-06');
    END LOOP;
    v_student_counter := v_student_counter + 100;
  END IF;

  -- Upper 6 Commerce (22 students)
  SELECT id INTO v_class_id FROM classes WHERE school_id = v_school_hare AND grade_level = 'Upper 6' AND section = 'Commerce' LIMIT 1;
  IF v_class_id IS NOT NULL THEN
    FOR i IN 1..22 LOOP
      v_student_name := 'HARE U6-Commerce Student ' || i;
      v_student_email := 'hare.u6com.' || i || '@eschools.test';
      v_student_username := 'HARE001-ST-' || LPAD((v_student_counter + i)::TEXT, 8, '0');
      
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
      VALUES (gen_random_uuid(), v_student_email, crypt('Student123!', gen_salt('bf')), NOW(), NOW(), NOW())
      RETURNING id INTO v_auth_user_id;
      
      INSERT INTO profiles (id, email, username, full_name, role, school_id)
      VALUES (v_auth_user_id, v_student_email, v_student_username, v_student_name, 'student', v_school_hare);
      
      INSERT INTO students (user_id, class_id, admission_date)
      VALUES (v_auth_user_id, v_class_id, '2025-01-06');
    END LOOP;
  END IF;

  RAISE NOTICE 'Harare High: Enrolled students';
  RAISE NOTICE 'Bulk enrollment complete!';

END $$;

-- Summary
SELECT 
  'ENROLLMENT COMPLETE' as status,
  (SELECT COUNT(*) FROM students WHERE class_id IN (SELECT id FROM classes WHERE school_id = 'b1111111-1111-1111-1111-111111111111')) as stmarys_students,
  (SELECT COUNT(*) FROM students WHERE class_id IN (SELECT id FROM classes WHERE school_id = 'b2222222-2222-2222-2222-222222222222')) as churchill_students,
  (SELECT COUNT(*) FROM students WHERE class_id IN (SELECT id FROM classes WHERE school_id = 'b3333333-3333-3333-3333-333333333333')) as harare_students,
  (SELECT COUNT(*) FROM students) as total_students;
