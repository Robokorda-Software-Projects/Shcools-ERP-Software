# Test Upload Files

This folder contains sample CSV files to test the bulk upload system.

## Test Files

### 1. **Form1A.csv** (Standard format with class in filename)
- **Format:** Standard CSV with all fields
- **Class Detection:** Auto-detects "Form1A" from filename
- **Students:** 5 students (Alice, Bob, Carol, David, Eva)
- **Features:**
  - All columns properly named
  - Medical conditions included
  - Previous schools listed
  - Standard format most schools use

**Usage:** Upload this file to test filename-based class detection.

---

### 2. **Form2B_with_header.csv** (Section header format)
- **Format:** CSV with "FORM 2B" header row
- **Class Detection:** Auto-detects "FORM 2B" from content
- **Students:** 4 students (Frank, Grace, Henry, Isabella)
- **Features:**
  - Section title row (will be skipped)
  - Description row (will be skipped)
  - Actual headers in row 3
  - Minimal required fields only

**Usage:** Upload this file to test section header skipping.

---

### 3. **Grade3Blue_minimal.csv** (Non-standard column names)
- **Format:** Minimal columns with different names
- **Class Detection:** Auto-detects "3Blue" from filename
- **Students:** 3 students (Jack, Kate, Leo)
- **Features:**
  - Alternative column names (Student, Sex, DOB, Contact)
  - Tests auto-detection intelligence
  - Only required fields
  - "Blue" as section name

**Usage:** Upload this file to test column name flexibility.

---

## Testing Instructions

### Before Testing:
1. Make sure these classes exist in your school:
   - **Form 1, Section: A**
   - **Form 2, Section: B** (or just "B")
   - **Form 3, Section: Blue**

2. To create classes:
   - Go to Dashboard → Classes
   - Click "Add New Class"
   - Enter grade_level and section exactly as above

### Test Procedure:

#### Test 1: Basic Upload (Form1A.csv)
1. Navigate to Dashboard → Students → Bulk Enroll
2. Upload `Form1A.csv`
3. **Expected:** Blue alert shows "Class auto-detected: Form1A"
4. **Check Step 2:** All columns should be mapped correctly
5. **Check Step 3:** Preview shows 5 students
6. Click "Final Process & Enroll"
7. **Expected:** 5 successful enrollments, all assigned to Form 1 A

#### Test 2: Section Header (Form2B_with_header.csv)
1. Upload `Form2B_with_header.csv`
2. **Expected:** Blue alert shows "Class auto-detected: FORM 2B"
3. **Expected:** Parser skips first 2 rows, finds headers in row 3
4. **Check Step 2:** Columns mapped (some may need manual adjustment)
5. **Check Step 3:** Preview shows 4 students
6. Process upload
7. **Expected:** 4 successful enrollments, all assigned to Form 2 B

#### Test 3: Alternative Names (Grade3Blue_minimal.csv)
1. Upload `Grade3Blue_minimal.csv`
2. **Expected:** Blue alert shows "Class auto-detected: 3Blue"
3. **Check Step 2:** 
   - "Student" → student_full_name
   - "Sex" → student_gender
   - "DOB" → student_birth_date
   - "Contact" → parent_phone
   - etc.
4. **Note:** Some may need manual mapping
5. Process upload
6. **Expected:** 3 successful enrollments, all assigned to Form 3 Blue

### Debugging:

If uploads fail with "Class not found":

1. **Check browser console** (F12 → Console):
   ```
   [Class Match] Looking for: grade="Form 1", section="A"
   [Class Match] FAILED for: "Form 1" section "A"
   ```

2. **Check database classes**:
   - Go to your database
   - Query: `SELECT * FROM classes WHERE school_id = 'your-school-id'`
   - Verify grade_level and section match exactly

3. **Adjust class data**:
   - If class shows grade_level="1" and you're searching "Form 1", they won't match
   - Either update class to "Form 1" or edit CSV to use "1"

### Expected Console Output (Success):
```
[Class Match] Looking for: grade="Form 1", section="A"
[Class Match] SUCCESS: Form 1 A (ID: abc-123-def)
[Class Match] Looking for: grade="Form 1", section="A"
[Class Match] SUCCESS: Form 1 A (ID: abc-123-def)
...
```

### Common Issues:

**Issue: "Parent ID already exists"**
- Solution: Change parent ID numbers to unique values

**Issue: "Invalid email format"**
- Solution: Check email addresses have @ and .com/.co.zw etc.

**Issue: "Student ID already exists"**
- Solution: Each student needs unique ID number

**Issue: "Class not found"**
- Solution: Create the class first, or check grade_level/section values

---

## File Format Variations

You can create your own CSV files with ANY column names. Examples:

### Variation 1: Spanish column names
```csv
Nombre Completo,Género,Fecha de Nacimiento,ID Estudiante,...
```
(Will need manual mapping in Step 2)

### Variation 2: Abbreviated names
```csv
Name,M/F,BD,SID,PName,PID,PBD,Tel,Mail,Gr,Sec
```
(Auto-detection will map most, some manual mapping needed)

### Variation 3: Descriptive names
```csv
Learner Full Name,Gender Male or Female,Date They Were Born,...
```
(Auto-detection should handle these well)

---

## Notes

- Files use Zimbabwe ID format: `73-1234567-X-12`
- Phone numbers: `+263771234567` (Zimbabwe format)
- Dates: `YYYY-MM-DD` format (e.g., 2010-05-15)
- Gender: "Male"/"Female" or "M"/"F"
- All students are fictional test data

## Adding Your Own Test Files

1. Create a CSV file with your school's format
2. Save it in this folder
3. Upload via the bulk enrollment page
4. System will auto-detect columns and class

---

**Pro Tip:** Name your CSV files with the class name (e.g., "Form4C.csv") and you won't need a Class column in the CSV at all!
