# Bulk Upload Technical Implementation

## 🔧 Enhanced Features Implemented

### 1. Smart CSV Parsing (`parseCSV` function)

**Location:** `frontend/app/dashboard/students/bulk-enroll/page.tsx` line ~126

**Features:**
- Detects class name from filename (regex patterns)
- Skips section header rows (e.g., "FORM 1A")
- Finds actual data header row
- Adds `__detected_class__` to each row if found

**Detection Patterns:**
```typescript
// Filename: "Form1A.csv", "2A_Class.csv", "Grade_3_Blue.csv"
const fileClassMatch = fileName.match(/(?:Form|Grade|Class)[\s_-]*(\d+[A-Za-z]*)/i)

// Content: "FORM 1A" row detection
if (cols.length <= 3 && /^(Form|Grade|Class)\s+\d+[A-Za-z]*$/i.test(cols[0]))
```

### 2. Enhanced Column Mapping (`autoDetectMappings` function)

**Location:** `frontend/app/dashboard/students/bulk-enroll/page.tsx` line ~224

**Features:**
- Accepts detected class as parameter
- Creates virtual mapping for `__detected_class__`
- 22 field types supported
- Intelligent keyword matching (removes spaces, lowercase)

**Mapping Examples:**
```typescript
'studentname' | 'fullname' | 'name' → 'student_full_name'
'birthdate' | 'dateofbirth' | 'dob' → 'student_birth_date'
'parentname' | 'guardianname' → 'parent_full_name'
'class' → 'class_name'
'grade' | 'form' | 'level' → 'grade_level'
```

### 3. Improved Class Matching (`processStudent` function)

**Location:** `frontend/app/api/admin/bulk-enroll-mapped/route.ts` line ~88

**Strategies (in order):**

#### A. Exact Match
```typescript
.eq('school_id', schoolId)
.eq('grade_level', student.grade_level)
.eq('section', student.class_name)
.maybeSingle()
```

#### B. Section Letter Extraction
```typescript
const sectionLetter = student.class_name.match(/[A-Z]$/)?.[0]
// "Form 1A" → "A"
```

#### C. Fuzzy Match
```typescript
.or(`grade_level.ilike.%${student.grade_level}%,section.ilike.%${student.class_name}%`)
```

**Debug Logging:**
```typescript
console.log(`[Class Match] Looking for: grade="${grade_level}", section="${class_name}"`)
console.log(`[Class Match] SUCCESS: ${grade} ${section} (ID: ${id})`)
console.error(`[Class Match] FAILED for: "${grade}" section "${section}"`)
```

## 🗂️ Database Schema

### students Table
```sql
- id (primary key)
- user_id (references auth.users)
- school_id (references schools)
- class_id (references classes) ← KEY FIELD
- parent_id (references profiles)
- admission_number
- admission_date
- birth_date
- gender
- nationality
- id_number
- birth_certificate_number
- address
- emergency_contact
- emergency_contact_name
- medical_conditions
- previous_school
- student_status
```

### classes Table
```sql
- id (primary key)
- school_id (references schools)
- name
- grade_level ← MATCHING FIELD
- section ← MATCHING FIELD
- capacity
- teacher_id
- academic_year
```

### student_enrollments Table
```sql
- id (primary key)
- school_id
- student_id (references students)
- student_user_id
- parent_id
- parent_user_id
- class_id ← DUPLICATES class_id from students
- grade_level
- enrollment_number
- enrollment_date
- enrolled_by
- enrollment_status
- fee_amount_paid
- notes
```

## 🔄 Data Flow

```
1. User uploads CSV file
   ↓
2. parseCSV(text, fileName)
   - Detect class from filename
   - Find header row
   - Parse rows
   - Add __detected_class__ to rows
   ↓
3. autoDetectMappings(headers, detectedClass)
   - Map virtual __detected_class__ → 'class_name'
   - Map CSV columns → system fields
   ↓
4. User reviews/adjusts mappings
   ↓
5. handleProcessUpload()
   - Transform rows using mappings
   - Send to /api/admin/bulk-enroll-mapped
   ↓
6. API processStudent() for each row
   - Find/create parent
   - Match class (3 strategies)
   - Create student auth + profile
   - Insert students record with class_id
   - Insert student_enrollments record
   ↓
7. Return results
   - Success count
   - Failed count
   - Error details per row
```

## 🐛 Debugging Guide

### Issue: Class not being assigned

**Check 1: Console Logs**
```javascript
// Browser DevTools → Console
[Class Match] Looking for: grade="Form 1", section="A"
[Class Match] Trying section letter: A
[Class Match] SUCCESS: Form 1 A (ID: uuid-here)
```

**Check 2: Database Classes**
```sql
SELECT id, grade_level, section, name 
FROM classes 
WHERE school_id = 'your-school-id';
```

**Check 3: CSV Column Mapping**
```javascript
// Check columnMappings state in browser DevTools
{
  'Full Name': 'student_full_name',
  'Class': 'class_name',  // ← Must map to this
  'Grade Level': 'grade_level',  // ← Must map to this
  '__detected_class__': 'class_name'  // ← Or this if auto-detected
}
```

**Check 4: Transformed Data**
```javascript
// Check network request payload in DevTools → Network
{
  "students": [
    {
      "student_full_name": "John Doe",
      "class_name": "A",  // ← Must have value
      "grade_level": "Form 1",  // ← Must have value
      ...
    }
  ]
}
```

### Issue: Section header rows being parsed as students

**Solution:** Parser now auto-skips these patterns:
- 1-3 columns with "Form X" or "Grade X" format
- Searches first 10 rows for actual headers
- Requires 3+ common field names to identify header row

### Issue: Filename not being detected

**Supported Patterns:**
```
✅ Form1A.csv
✅ Form_1A_students.csv
✅ Grade-2B.csv
✅ 2A_Class.csv
✅ Form 3 Blue.csv

❌ students.csv (no class info)
❌ enrollment_2024.csv (no class info)
```

## 🧪 Testing Scenarios

### Test 1: Simple CSV with Headers
```csv
Name,Gender,DOB,ID,Parent Name,Parent ID,Parent DOB,Phone,Email,Grade,Class
John,Male,2010-01-15,11111,Jane,22222,1980-01-01,+263771234567,jane@test.com,Form 1,A
```
**Expected:** Maps all fields, class = "A", grade = "Form 1"

### Test 2: Filename Auto-Detection
**File:** `Form1A.csv`
```csv
Name,Gender,DOB,ID,Parent Name,Parent ID,Parent DOB,Phone,Email
John,Male,2010-01-15,11111,Jane,22222,1980-01-01,+263771234567,jane@test.com
```
**Expected:** Auto-detects class "Form1A", maps __detected_class__ → class_name

### Test 3: Section Header in Content
```csv
FORM 1A
Name,Gender,DOB,ID,Parent Name,Parent ID,Parent DOB,Phone,Email
John,Male,2010-01-15,11111,Jane,22222,1980-01-01,+263771234567,jane@test.com
```
**Expected:** Skips "FORM 1A" row, finds headers, detects class "FORM 1A"

## 📝 Code Modifications Summary

### Files Changed:

1. **frontend/app/dashboard/students/bulk-enroll/page.tsx**
   - Added `detectedClass` to `ParsedData` interface
   - Enhanced `parseCSV()` with class detection logic
   - Updated `autoDetectMappings()` to accept detected class
   - Modified `handleFileChange()` to pass filename
   - Added visual indicators for auto-detected classes

2. **frontend/app/api/admin/bulk-enroll-mapped/route.ts**
   - Replaced class matching logic with 3-tier strategy
   - Added debug console.log statements
   - Changed from `.single()` to `.maybeSingle()`
   - Added section letter extraction
   - Improved error messages with exact field values

### New Features:
- ✅ Filename class detection
- ✅ Section header skipping
- ✅ Virtual column mapping for detected classes
- ✅ Multi-strategy class matching
- ✅ Debug logging for troubleshooting
- ✅ Enhanced error messages
- ✅ User-facing alerts for auto-detection

## 🚀 Next Steps (For Excel Support)

To add Excel multi-sheet support:

1. Install `xlsx` library:
```bash
npm install xlsx
```

2. Update file handler:
```typescript
if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
  const workbook = XLSX.read(await file.arrayBuffer())
  // Loop through sheets
  // Each sheet name = class name
  // Parse each sheet as separate CSV
}
```

3. UI changes:
- Show sheet selector
- Allow per-sheet column mapping
- Batch process all sheets

---

**Developer Notes:**
- All console.log statements prefixed with `[Class Match]` for easy filtering
- Error messages include actual values for debugging
- System fails gracefully with detailed error messages
- Parent accounts reused across siblings automatically
