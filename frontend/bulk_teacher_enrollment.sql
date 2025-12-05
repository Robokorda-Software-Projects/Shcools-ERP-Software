-- =====================================================
-- BULK TEACHER ENROLLMENT FOR ALL 3 SCHOOLS
-- =====================================================

DO $$
DECLARE
  v_school_stmp UUID := 'b1111111-1111-1111-1111-111111111111';
  v_school_chur UUID := 'b2222222-2222-2222-2222-222222222222';
  v_school_hare UUID := 'b3333333-3333-3333-3333-333333333333';
  v_teacher_id UUID;
  v_auth_user_id UUID;
  v_subject_id UUID;
BEGIN

  RAISE NOTICE 'Starting bulk teacher enrollment...';

  -- =====================================================
  -- ST. MARY''S PRIMARY SCHOOL (STMP001)
  -- =====================================================
  
  RAISE NOTICE 'Creating teachers for St. Marys Primary...';
  
  -- Teacher 1: English
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'mrs.chipo.moyo@stmarys.test', crypt('Teacher123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'mrs.chipo.moyo@stmarys.test', 'STMP001-TC-10000001', 'Mrs. Chipo Moyo', 'teacher', v_school_stmp);
  
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_stmp AND code = 'ENG' LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO teacher_subject_assignments (teacher_id, subject_id, school_id, assignment_level, created_by)
    VALUES (v_auth_user_id, v_subject_id, v_school_stmp, 'grade', v_auth_user_id);
  END IF;

  -- Teacher 2: Mathematics
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'mr.tanaka.ncube@stmarys.test', crypt('Teacher123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'mr.tanaka.ncube@stmarys.test', 'STMP001-TC-10000002', 'Mr. Tanaka Ncube', 'teacher', v_school_stmp);
  
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_stmp AND code = 'MTH' LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO teacher_subject_assignments (teacher_id, subject_id, school_id, assignment_level, created_by)
    VALUES (v_auth_user_id, v_subject_id, v_school_stmp, 'grade', v_auth_user_id);
  END IF;

  -- Teacher 3: Science
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'mrs.ruvimbo.dube@stmarys.test', crypt('Teacher123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'mrs.ruvimbo.dube@stmarys.test', 'STMP001-TC-10000003', 'Mrs. Ruvimbo Dube', 'teacher', v_school_stmp);
  
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_stmp AND code = 'SCI' LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO teacher_subject_assignments (teacher_id, subject_id, school_id, assignment_level, created_by)
    VALUES (v_auth_user_id, v_subject_id, v_school_stmp, 'grade', v_auth_user_id);
  END IF;

  -- Teacher 4: Shona
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'mrs.tendai.sibanda@stmarys.test', crypt('Teacher123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'mrs.tendai.sibanda@stmarys.test', 'STMP001-TC-10000004', 'Mrs. Tendai Sibanda', 'teacher', v_school_stmp);
  
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_stmp AND code = 'SHO' LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO teacher_subject_assignments (teacher_id, subject_id, school_id, assignment_level, created_by)
    VALUES (v_auth_user_id, v_subject_id, v_school_stmp, 'school', v_auth_user_id);
  END IF;

  -- Teacher 5: Social Studies
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'mr.takudzwa.ndlovu@stmarys.test', crypt('Teacher123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'mr.takudzwa.ndlovu@stmarys.test', 'STMP001-TC-10000005', 'Mr. Takudzwa Ndlovu', 'teacher', v_school_stmp);
  
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_stmp AND code = 'SST' LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO teacher_subject_assignments (teacher_id, subject_id, school_id, assignment_level, created_by)
    VALUES (v_auth_user_id, v_subject_id, v_school_stmp, 'grade', v_auth_user_id);
  END IF;

  RAISE NOTICE 'St. Marys: Created 5 teachers';

  -- =====================================================
  -- CHURCHILL SECONDARY SCHOOL (CHUR001)
  -- =====================================================
  
  RAISE NOTICE 'Creating teachers for Churchill Secondary...';
  
  -- Teacher 1: English
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'mrs.nyasha.khumalo@churchill.test', crypt('Teacher123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'mrs.nyasha.khumalo@churchill.test', 'CHUR001-TC-20000001', 'Mrs. Nyasha Khumalo', 'teacher', v_school_chur);
  
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_chur AND code = 'ENG' LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO teacher_subject_assignments (teacher_id, subject_id, school_id, assignment_level, created_by)
    VALUES (v_auth_user_id, v_subject_id, v_school_chur, 'school', v_auth_user_id);
  END IF;

  -- Teacher 2: Mathematics
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'mr.simbarashe.mpofu@churchill.test', crypt('Teacher123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'mr.simbarashe.mpofu@churchill.test', 'CHUR001-TC-20000002', 'Mr. Simbarashe Mpofu', 'teacher', v_school_chur);
  
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_chur AND code = 'MTH' LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO teacher_subject_assignments (teacher_id, subject_id, school_id, assignment_level, created_by)
    VALUES (v_auth_user_id, v_subject_id, v_school_chur, 'grade', v_auth_user_id);
  END IF;

  -- Teacher 3: Biology
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'mrs.tatenda.nkomo@churchill.test', crypt('Teacher123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'mrs.tatenda.nkomo@churchill.test', 'CHUR001-TC-20000003', 'Mrs. Tatenda Nkomo', 'teacher', v_school_chur);
  
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_chur AND code = 'BIO' LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO teacher_subject_assignments (teacher_id, subject_id, school_id, assignment_level, created_by)
    VALUES (v_auth_user_id, v_subject_id, v_school_chur, 'grade', v_auth_user_id);
  END IF;

  -- Teacher 4: Physics
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'mr.kudzai.banda@churchill.test', crypt('Teacher123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'mr.kudzai.banda@churchill.test', 'CHUR001-TC-20000004', 'Mr. Kudzai Banda', 'teacher', v_school_chur);
  
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_chur AND code = 'PHY' LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO teacher_subject_assignments (teacher_id, subject_id, school_id, assignment_level, created_by)
    VALUES (v_auth_user_id, v_subject_id, v_school_chur, 'grade', v_auth_user_id);
  END IF;

  -- Teacher 5: Chemistry
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'mrs.rumbidzai.phiri@churchill.test', crypt('Teacher123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'mrs.rumbidzai.phiri@churchill.test', 'CHUR001-TC-20000005', 'Mrs. Rumbidzai Phiri', 'teacher', v_school_chur);
  
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_chur AND code = 'CHM' LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO teacher_subject_assignments (teacher_id, subject_id, school_id, assignment_level, created_by)
    VALUES (v_auth_user_id, v_subject_id, v_school_chur, 'grade', v_auth_user_id);
  END IF;

  -- Teacher 6: History
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'mr.tafadzwa.tembo@churchill.test', crypt('Teacher123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'mr.tafadzwa.tembo@churchill.test', 'CHUR001-TC-20000006', 'Mr. Tafadzwa Tembo', 'teacher', v_school_chur);
  
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_chur AND code = 'HIS' LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO teacher_subject_assignments (teacher_id, subject_id, school_id, assignment_level, created_by)
    VALUES (v_auth_user_id, v_subject_id, v_school_chur, 'school', v_auth_user_id);
  END IF;

  -- Teacher 7: Geography
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'mrs.chiedza.zulu@churchill.test', crypt('Teacher123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'mrs.chiedza.zulu@churchill.test', 'CHUR001-TC-20000007', 'Mrs. Chiedza Zulu', 'teacher', v_school_chur);
  
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_chur AND code = 'GEO' LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO teacher_subject_assignments (teacher_id, subject_id, school_id, assignment_level, created_by)
    VALUES (v_auth_user_id, v_subject_id, v_school_chur, 'school', v_auth_user_id);
  END IF;

  -- Teacher 8: Shona
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'mrs.vimbai.nyoni@churchill.test', crypt('Teacher123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'mrs.vimbai.nyoni@churchill.test', 'CHUR001-TC-20000008', 'Mrs. Vimbai Nyoni', 'teacher', v_school_chur);
  
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_chur AND code = 'SHO' LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO teacher_subject_assignments (teacher_id, subject_id, school_id, assignment_level, created_by)
    VALUES (v_auth_user_id, v_subject_id, v_school_chur, 'school', v_auth_user_id);
  END IF;

  RAISE NOTICE 'Churchill Secondary: Created 8 teachers';

  -- =====================================================
  -- HARARE HIGH SCHOOL (HARE001)
  -- =====================================================
  
  RAISE NOTICE 'Creating teachers for Harare High...';
  
  -- Teacher 2: English (avoiding TC-00000001 as it exists)
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'mrs.panashe.gumede@hararehigh.test', crypt('Teacher123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'mrs.panashe.gumede@hararehigh.test', 'HARE001-TC-30000002', 'Mrs. Panashe Gumede', 'teacher', v_school_hare);
  
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_hare AND code = 'ENG' LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO teacher_subject_assignments (teacher_id, subject_id, school_id, assignment_level, created_by)
    VALUES (v_auth_user_id, v_subject_id, v_school_hare, 'school', v_auth_user_id);
  END IF;

  -- Teacher 3: Mathematics
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'mr.munashe.shoko@hararehigh.test', crypt('Teacher123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'mr.munashe.shoko@hararehigh.test', 'HARE001-TC-30000003', 'Mr. Munashe Shoko', 'teacher', v_school_hare);
  
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_hare AND code = 'MTH' LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO teacher_subject_assignments (teacher_id, subject_id, school_id, assignment_level, created_by)
    VALUES (v_auth_user_id, v_subject_id, v_school_hare, 'grade', v_auth_user_id);
  END IF;

  -- Teacher 4: Pure Mathematics
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'mr.tinotenda.marova@hararehigh.test', crypt('Teacher123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'mr.tinotenda.marova@hararehigh.test', 'HARE001-TC-30000004', 'Mr. Tinotenda Marova', 'teacher', v_school_hare);
  
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_hare AND code = 'PMTH' LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO teacher_subject_assignments (teacher_id, subject_id, school_id, assignment_level, created_by)
    VALUES (v_auth_user_id, v_subject_id, v_school_hare, 'grade', v_auth_user_id);
  END IF;

  -- Teacher 5: Biology
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'mrs.rutendo.chikwava@hararehigh.test', crypt('Teacher123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'mrs.rutendo.chikwava@hararehigh.test', 'HARE001-TC-30000005', 'Mrs. Rutendo Chikwava', 'teacher', v_school_hare);
  
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_hare AND code = 'BIO' LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO teacher_subject_assignments (teacher_id, subject_id, school_id, assignment_level, created_by)
    VALUES (v_auth_user_id, v_subject_id, v_school_hare, 'school', v_auth_user_id);
  END IF;

  -- Teacher 6: Physics
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'mr.kudakwashe.makoni@hararehigh.test', crypt('Teacher123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'mr.kudakwashe.makoni@hararehigh.test', 'HARE001-TC-30000006', 'Mr. Kudakwashe Makoni', 'teacher', v_school_hare);
  
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_hare AND code = 'PHY' LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO teacher_subject_assignments (teacher_id, subject_id, school_id, assignment_level, created_by)
    VALUES (v_auth_user_id, v_subject_id, v_school_hare, 'school', v_auth_user_id);
  END IF;

  -- Teacher 7: Chemistry
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'mrs.tsitsi.mutasa@hararehigh.test', crypt('Teacher123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'mrs.tsitsi.mutasa@hararehigh.test', 'HARE001-TC-30000007', 'Mrs. Tsitsi Mutasa', 'teacher', v_school_hare);
  
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_hare AND code = 'CHM' LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO teacher_subject_assignments (teacher_id, subject_id, school_id, assignment_level, created_by)
    VALUES (v_auth_user_id, v_subject_id, v_school_hare, 'school', v_auth_user_id);
  END IF;

  -- Teacher 8: History
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'mr.anesu.gono@hararehigh.test', crypt('Teacher123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'mr.anesu.gono@hararehigh.test', 'HARE001-TC-30000008', 'Mr. Anesu Gono', 'teacher', v_school_hare);
  
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_hare AND code = 'HIS' LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO teacher_subject_assignments (teacher_id, subject_id, school_id, assignment_level, created_by)
    VALUES (v_auth_user_id, v_subject_id, v_school_hare, 'school', v_auth_user_id);
  END IF;

  -- Teacher 9: Geography
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'mrs.tariro.chirwa@hararehigh.test', crypt('Teacher123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'mrs.tariro.chirwa@hararehigh.test', 'HARE001-TC-30000009', 'Mrs. Tariro Chirwa', 'teacher', v_school_hare);
  
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_hare AND code = 'GEO' LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO teacher_subject_assignments (teacher_id, subject_id, school_id, assignment_level, created_by)
    VALUES (v_auth_user_id, v_subject_id, v_school_hare, 'school', v_auth_user_id);
  END IF;

  -- Teacher 10: Accounts
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'mr.blessing.msipa@hararehigh.test', crypt('Teacher123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'mr.blessing.msipa@hararehigh.test', 'HARE001-TC-30000010', 'Mr. Blessing Msipa', 'teacher', v_school_hare);
  
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_hare AND code = 'ACC' LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO teacher_subject_assignments (teacher_id, subject_id, school_id, assignment_level, created_by)
    VALUES (v_auth_user_id, v_subject_id, v_school_hare, 'grade', v_auth_user_id);
  END IF;

  -- Teacher 11: Economics
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'mrs.faith.zvinavashe@hararehigh.test', crypt('Teacher123!', gen_salt('bf')), NOW(), NOW(), NOW())
  RETURNING id INTO v_auth_user_id;
  
  INSERT INTO profiles (id, email, username, full_name, role, school_id)
  VALUES (v_auth_user_id, 'mrs.faith.zvinavashe@hararehigh.test', 'HARE001-TC-30000011', 'Mrs. Faith Zvinavashe', 'teacher', v_school_hare);
  
  SELECT id INTO v_subject_id FROM subjects WHERE school_id = v_school_hare AND code = 'ECO' LIMIT 1;
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO teacher_subject_assignments (teacher_id, subject_id, school_id, assignment_level, created_by)
    VALUES (v_auth_user_id, v_subject_id, v_school_hare, 'grade', v_auth_user_id);
  END IF;

  RAISE NOTICE 'Harare High: Created 10 teachers';
  RAISE NOTICE 'Bulk teacher enrollment complete!';

END $$;

-- Summary
SELECT 
  'TEACHER ENROLLMENT COMPLETE' as status,
  (SELECT COUNT(*) FROM profiles WHERE role = 'teacher' AND school_id = 'b1111111-1111-1111-1111-111111111111') as stmarys_teachers,
  (SELECT COUNT(*) FROM profiles WHERE role = 'teacher' AND school_id = 'b2222222-2222-2222-2222-222222222222') as churchill_teachers,
  (SELECT COUNT(*) FROM profiles WHERE role = 'teacher' AND school_id = 'b3333333-3333-3333-3333-333333333333') as harare_teachers,
  (SELECT COUNT(*) FROM profiles WHERE role = 'teacher') as total_teachers,
  (SELECT COUNT(*) FROM teacher_subject_assignments) as total_subject_assignments;
