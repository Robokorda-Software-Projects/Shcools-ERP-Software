-- =====================================================
-- CREATE SCHOOL ADMINS & PARENT ACCOUNTS
-- =====================================================
-- Creates school admins for Churchill and St. Marys
-- Creates parent accounts and links them to students
-- =====================================================

DO $$
DECLARE
  v_school_stmp UUID := 'b1111111-1111-1111-1111-111111111111';
  v_school_chur UUID := 'b2222222-2222-2222-2222-222222222222';
  v_school_hare UUID := 'b3333333-3333-3333-3333-333333333333';
  v_admin_id UUID;
  v_parent_id UUID;
  v_student_id UUID;
  v_auth_user_id UUID;
  v_parent_counter INTEGER := 0;
BEGIN

  RAISE NOTICE 'Starting school admin and parent creation...';

  -- =====================================================
  -- SCHOOL ADMINS
  -- =====================================================
  
  RAISE NOTICE 'Creating school admins...';
  
  -- St. Mary's Primary School Admin
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'admin@stmarys.test', crypt('Admin123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'admin@stmarys.test', 'STMP001-AD-00000001', 'Mrs. Grace Mushonga', 'school_admin', v_school_stmp);
  
  RAISE NOTICE 'Created St. Marys admin: STMP001-AD-00000001';

  -- Churchill Secondary School Admin
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'admin@churchill.test', crypt('Admin123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'admin@churchill.test', 'CHUR001-AD-00000001', 'Mr. Tapiwa Muzenda', 'school_admin', v_school_chur);
  
  RAISE NOTICE 'Created Churchill admin: CHUR001-AD-00000001';

  -- =====================================================
  -- PARENT ACCOUNTS
  -- =====================================================
  
  RAISE NOTICE 'Creating parent accounts...';
  
  -- =====================================================
  -- ST. MARY''S PARENTS (20 parents for various classes)
  -- =====================================================
  
  -- Parent 1: For ECD A students (link 2 children)
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'parent.moyo1@stmarys.test', crypt('Parent123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'parent.moyo1@stmarys.test', 'STMP001-PR-10000001', 'Mr. Joseph Moyo', 'parent', v_school_stmp);
  
  -- Link to first 2 students in ECD A
  UPDATE students SET parent_id = v_auth_user_id 
  WHERE id IN (
    SELECT s.id FROM students s 
    JOIN classes c ON s.class_id = c.id 
    WHERE c.school_id = v_school_stmp AND c.grade_level = 'ECD A' 
    LIMIT 2
  );

  -- Parent 2: For ECD B students
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'parent.ncube@stmarys.test', crypt('Parent123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'parent.ncube@stmarys.test', 'STMP001-PR-10000002', 'Mrs. Chipo Ncube', 'parent', v_school_stmp);
  
  UPDATE students SET parent_id = v_auth_user_id 
  WHERE id IN (
    SELECT s.id FROM students s 
    JOIN classes c ON s.class_id = c.id 
    WHERE c.school_id = v_school_stmp AND c.grade_level = 'ECD B' 
    LIMIT 2
  );

  -- Parent 3: For Grade 1 students
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'parent.dube@stmarys.test', crypt('Parent123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'parent.dube@stmarys.test', 'STMP001-PR-10000003', 'Mr. Tendai Dube', 'parent', v_school_stmp);
  
  UPDATE students SET parent_id = v_auth_user_id 
  WHERE id IN (
    SELECT s.id FROM students s 
    JOIN classes c ON s.class_id = c.id 
    WHERE c.school_id = v_school_stmp AND c.grade_level = 'Grade 1' 
    LIMIT 3
  );

  -- Parent 4: For Grade 3 students
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'parent.sibanda@stmarys.test', crypt('Parent123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'parent.sibanda@stmarys.test', 'STMP001-PR-10000004', 'Mrs. Rudo Sibanda', 'parent', v_school_stmp);
  
  UPDATE students SET parent_id = v_auth_user_id 
  WHERE id IN (
    SELECT s.id FROM students s 
    JOIN classes c ON s.class_id = c.id 
    WHERE c.school_id = v_school_stmp AND c.grade_level = 'Grade 3' 
    LIMIT 2
  );

  -- Parent 5: For Grade 5 students
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'parent.ndlovu@stmarys.test', crypt('Parent123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'parent.ndlovu@stmarys.test', 'STMP001-PR-10000005', 'Mr. Blessing Ndlovu', 'parent', v_school_stmp);
  
  UPDATE students SET parent_id = v_auth_user_id 
  WHERE id IN (
    SELECT s.id FROM students s 
    JOIN classes c ON s.class_id = c.id 
    WHERE c.school_id = v_school_stmp AND c.grade_level = 'Grade 5' 
    LIMIT 2
  );

  RAISE NOTICE 'St. Marys: Created 5 parents';

  -- =====================================================
  -- CHURCHILL SECONDARY PARENTS (15 parents)
  -- =====================================================
  
  -- Parent 1: Form 1A students
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'parent.khumalo@churchill.test', crypt('Parent123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'parent.khumalo@churchill.test', 'CHUR001-PR-20000001', 'Mrs. Nyasha Khumalo', 'parent', v_school_chur);
  
  UPDATE students SET parent_id = v_auth_user_id 
  WHERE id IN (
    SELECT s.id FROM students s 
    JOIN classes c ON s.class_id = c.id 
    WHERE c.school_id = v_school_chur AND c.grade_level = 'Form 1' AND c.section = 'A' 
    LIMIT 3
  );

  -- Parent 2: Form 1B students
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'parent.mpofu@churchill.test', crypt('Parent123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'parent.mpofu@churchill.test', 'CHUR001-PR-20000002', 'Mr. Simbarashe Mpofu', 'parent', v_school_chur);
  
  UPDATE students SET parent_id = v_auth_user_id 
  WHERE id IN (
    SELECT s.id FROM students s 
    JOIN classes c ON s.class_id = c.id 
    WHERE c.school_id = v_school_chur AND c.grade_level = 'Form 1' AND c.section = 'B' 
    LIMIT 2
  );

  -- Parent 3: Form 2A students
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'parent.nkomo@churchill.test', crypt('Parent123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'parent.nkomo@churchill.test', 'CHUR001-PR-20000003', 'Mrs. Tatenda Nkomo', 'parent', v_school_chur);
  
  UPDATE students SET parent_id = v_auth_user_id 
  WHERE id IN (
    SELECT s.id FROM students s 
    JOIN classes c ON s.class_id = c.id 
    WHERE c.school_id = v_school_chur AND c.grade_level = 'Form 2' AND c.section = 'A' 
    LIMIT 2
  );

  -- Parent 4: Form 3A students
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'parent.banda@churchill.test', crypt('Parent123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'parent.banda@churchill.test', 'CHUR001-PR-20000004', 'Mr. Kudzai Banda', 'parent', v_school_chur);
  
  UPDATE students SET parent_id = v_auth_user_id 
  WHERE id IN (
    SELECT s.id FROM students s 
    JOIN classes c ON s.class_id = c.id 
    WHERE c.school_id = v_school_chur AND c.grade_level = 'Form 3' AND c.section = 'A' 
    LIMIT 3
  );

  -- Parent 5: Form 4A students
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'parent.phiri@churchill.test', crypt('Parent123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'parent.phiri@churchill.test', 'CHUR001-PR-20000005', 'Mrs. Rumbidzai Phiri', 'parent', v_school_chur);
  
  UPDATE students SET parent_id = v_auth_user_id 
  WHERE id IN (
    SELECT s.id FROM students s 
    JOIN classes c ON s.class_id = c.id 
    WHERE c.school_id = v_school_chur AND c.grade_level = 'Form 4' AND c.section = 'A' 
    LIMIT 2
  );

  RAISE NOTICE 'Churchill: Created 5 parents';

  -- =====================================================
  -- HARARE HIGH SCHOOL PARENTS (20 parents)
  -- =====================================================
  
  -- Parent 1: Form 1A students
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'parent.gumede@hararehigh.test', crypt('Parent123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'parent.gumede@hararehigh.test', 'HARE001-PR-30000002', 'Mrs. Panashe Gumede', 'parent', v_school_hare);
  
  UPDATE students SET parent_id = v_auth_user_id 
  WHERE id IN (
    SELECT s.id FROM students s 
    JOIN classes c ON s.class_id = c.id 
    WHERE c.school_id = v_school_hare AND c.grade_level = 'Form 1' AND c.section = 'A' 
    LIMIT 4
  );

  -- Parent 2: Form 1B students
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'parent.shoko@hararehigh.test', crypt('Parent123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'parent.shoko@hararehigh.test', 'HARE001-PR-30000003', 'Mr. Munashe Shoko', 'parent', v_school_hare);
  
  UPDATE students SET parent_id = v_auth_user_id 
  WHERE id IN (
    SELECT s.id FROM students s 
    JOIN classes c ON s.class_id = c.id 
    WHERE c.school_id = v_school_hare AND c.grade_level = 'Form 1' AND c.section = 'B' 
    LIMIT 3
  );

  -- Parent 3: Form 2A students
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'parent.marova@hararehigh.test', crypt('Parent123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'parent.marova@hararehigh.test', 'HARE001-PR-30000004', 'Mr. Tinotenda Marova', 'parent', v_school_hare);
  
  UPDATE students SET parent_id = v_auth_user_id 
  WHERE id IN (
    SELECT s.id FROM students s 
    JOIN classes c ON s.class_id = c.id 
    WHERE c.school_id = v_school_hare AND c.grade_level = 'Form 2' AND c.section = 'A' 
    LIMIT 3
  );

  -- Parent 4: Form 3A students
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'parent.chikwava@hararehigh.test', crypt('Parent123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'parent.chikwava@hararehigh.test', 'HARE001-PR-30000005', 'Mrs. Rutendo Chikwava', 'parent', v_school_hare);
  
  UPDATE students SET parent_id = v_auth_user_id 
  WHERE id IN (
    SELECT s.id FROM students s 
    JOIN classes c ON s.class_id = c.id 
    WHERE c.school_id = v_school_hare AND c.grade_level = 'Form 3' AND c.section = 'A' 
    LIMIT 2
  );

  -- Parent 5: Form 4A students
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'parent.makoni@hararehigh.test', crypt('Parent123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'parent.makoni@hararehigh.test', 'HARE001-PR-30000006', 'Mr. Kudakwashe Makoni', 'parent', v_school_hare);
  
  UPDATE students SET parent_id = v_auth_user_id 
  WHERE id IN (
    SELECT s.id FROM students s 
    JOIN classes c ON s.class_id = c.id 
    WHERE c.school_id = v_school_hare AND c.grade_level = 'Form 4' AND c.section = 'A' 
    LIMIT 3
  );

  -- Parent 6: Lower 6 Science students
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'parent.mutasa@hararehigh.test', crypt('Parent123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'parent.mutasa@hararehigh.test', 'HARE001-PR-30000007', 'Mrs. Tsitsi Mutasa', 'parent', v_school_hare);
  
  UPDATE students SET parent_id = v_auth_user_id 
  WHERE id IN (
    SELECT s.id FROM students s 
    JOIN classes c ON s.class_id = c.id 
    WHERE c.school_id = v_school_hare AND c.grade_level = 'Lower 6' AND c.section = 'Science' 
    LIMIT 2
  );

  -- Parent 7: Upper 6 Science students
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'parent.gono@hararehigh.test', crypt('Parent123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'parent.gono@hararehigh.test', 'HARE001-PR-30000008', 'Mr. Anesu Gono', 'parent', v_school_hare);
  
  UPDATE students SET parent_id = v_auth_user_id 
  WHERE id IN (
    SELECT s.id FROM students s 
    JOIN classes c ON s.class_id = c.id 
    WHERE c.school_id = v_school_hare AND c.grade_level = 'Upper 6' AND c.section = 'Science' 
    LIMIT 2
  );

  RAISE NOTICE 'Harare High: Created 7 parents';
  RAISE NOTICE 'Admin and parent creation complete!';

END $$;

-- Summary
SELECT 
  'ADMIN & PARENT CREATION COMPLETE' as status,
  (SELECT COUNT(*) FROM profiles WHERE role = 'school_admin') as total_school_admins,
  (SELECT COUNT(*) FROM profiles WHERE role = 'parent') as total_parents,
  (SELECT COUNT(*) FROM students WHERE parent_id IS NOT NULL) as students_with_parents,
  (SELECT COUNT(*) FROM students WHERE parent_id IS NULL) as students_without_parents;
