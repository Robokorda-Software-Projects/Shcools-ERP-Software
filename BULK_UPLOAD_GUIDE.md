# Bulk Student Upload System - User Guide

## 🎯 Overview
The bulk student upload system allows schools to enroll multiple students at once using CSV files, with intelligent column mapping and class auto-detection.

## 📊 Supported File Formats

### 1. **Standard CSV** (Simple format)
```csv
Full Name,Gender,Birth Date,Grade Level,Class,Parent Name,...
John Doe,Male,2010-05-15,Form 1,A,Jane Doe,...
Mary Smith,Female,2011-08-22,Form 1,B,Robert Smith,...
```

### 2. **Class in Filename** (Auto-detection from filename)
**Examples:**
- `Form1A.csv` → Auto-detects "Form1A"
- `Grade_2B_students.csv` → Auto-detects "2B"
- `2A_Class.csv` → Auto-detects "2A"

The system will automatically assign all students in the file to the detected class.

### 3. **Section Headers in File** (Class name within CSV)
```csv
FORM 1A
(blank row or section description)
Full Name,Gender,Birth Date,...
John Doe,Male,2010-05-15,...
Mary Smith,Female,2011-08-22,...
```

The system intelligently skips to the actual data headers.

### 4. **Excel Multi-Sheet Support** (Coming Soon!)
- Each sheet name = different class
- Sheet: "Form 2 Blue" → All students go to Form 2 Blue
- Sheet: "Grade 3A" → All students go to Grade 3A

## 🔄 Smart Column Mapping

### How It Works
1. **Any column names accepted** - Your CSV can have columns named:
   - "Name", "Student Name", "Full Name", "Learner Name" → All map to student name
   - "DOB", "Birth Date", "Date of Birth" → All map to birth date
   - "Contact", "Phone", "Mobile" → All map to parent phone

2. **Auto-detection** - System suggests mappings based on your column headers

3. **Manual override** - You can change any suggested mapping

4. **Skip unwanted columns** - Mark columns as "Skip" if not needed

### Required Fields
- ✅ Student Full Name
- ✅ Student Gender
- ✅ Student Birth Date
- ✅ Student ID Number
- ✅ Parent Full Name
- ✅ Parent ID Number
- ✅ Parent Birth Date
- ✅ Parent Phone
- ✅ Parent Email
- ✅ Class Name (or auto-detected from filename)
- ✅ Grade Level (or auto-detected from filename)

### Optional Fields
- Student Birth Certificate
- Student Address
- Student Medical Conditions
- Student Previous School
- Parent Address
- Parent Relationship
- Parent Occupation
- Fee Amount Paid
- Notes/Comments

## 📋 Step-by-Step Process

### Step 1: Upload File
1. Navigate to **Dashboard → Students → Bulk Enroll**
2. Download the sample template (optional)
3. Click "Choose File" and select your CSV
4. System will automatically parse and detect class (if in filename)

### Step 2: Map Columns
1. Review auto-detected mappings
2. Adjust any incorrect mappings using dropdowns
3. Set unused columns to "Skip"
4. Check the blue alert if class was auto-detected
5. Click "Next: Review Data"

### Step 3: Review Data
1. Preview first 5 rows
2. Check statistics (total rows, mapped fields, warnings)
3. Click "Final Process & Enroll" to proceed
4. Or click "Back" to adjust mappings

### Step 4: View Results
1. See success/failure counts
2. Review detailed error messages for failed rows
3. Click "Start New Upload" or "View Uploaded Students"

## ⚙️ Class Matching Logic

The system tries multiple strategies to match classes:

1. **Exact Match**: `grade_level = "Form 1"` AND `section = "A"`
2. **Section Letter**: Extract last letter (e.g., "Form 1A" → "A")
3. **Fuzzy Match**: Partial text matching

### Example Class Formats Supported
- Grade Level: "Form 1", Section: "A"
- Grade Level: "Grade 2", Section: "Blue"
- Grade Level: "Form 3", Section: "Form 3B" (if full class in one field)

## 🚨 Common Issues & Solutions

### Issue: "Class not found"
**Solution:**
1. Check that classes exist in your school
2. Go to **Dashboard → Classes** and create missing classes
3. Ensure grade_level and section match exactly
4. Use the class auto-detection feature by naming your file

### Issue: "Students uploaded but no class assigned"
**Solution:**
1. Check console logs in browser (F12 → Console tab)
2. Look for `[Class Match]` debug messages
3. Verify your CSV has correct grade_level and class_name columns
4. If using auto-detection, check filename format

### Issue: "Duplicate ID numbers"
**Solution:**
- Each student and parent must have unique ID numbers
- System will reject duplicates

### Issue: "Invalid email format"
**Solution:**
- Parent emails must be valid format
- Check for typos or missing @ symbols

## 💡 Best Practices

### 1. **Prepare Your Data**
- Clean ID numbers (remove spaces, dashes)
- Validate email addresses
- Use consistent date format: YYYY-MM-DD
- Gender: "Male" or "Female" (case-insensitive)

### 2. **Create Classes First**
- Before uploading, create all needed classes in the system
- Match grade levels and sections exactly

### 3. **Use File Naming**
- Name files by class: `Form1A_2024.csv`
- System will auto-detect and assign all students

### 4. **Test with Small Files**
- Upload 5-10 students first
- Verify results before bulk upload

### 5. **Handle Siblings**
- Parent accounts are reused automatically
- Same parent ID = same parent account

## 📊 Sample CSV Template

```csv
Full Name,Gender,Birth Date,Nationality,Student ID,Birth Certificate,Address,Medical Conditions,Previous School,Parent Name,Parent ID,Parent Birth Date,Parent Phone,Parent Email,Parent Address,Parent Relationship,Grade Level,Class,Fee Amount,Notes
John Doe,Male,2010-05-15,Zimbabwe,73-2987414-R-42,ZW123456,123 Main St Harare,None,XYZ Primary,Jane Doe,73-0876606-E-12,1980-03-20,+263771234567,jane@email.com,123 Main St Harare,parent,Form 1,A,500,Good student
Mary Smith,Female,2011-08-22,Zimbabwe,73-2456789-F-34,ZW234567,789 Oak Ave Bulawayo,Asthma,ABC Primary,Robert Smith,73-1234567-M-56,1978-06-15,+263772345678,robert@email.com,789 Oak Ave Bulawayo,parent,Form 1,B,500,Needs inhaler
```

## 🔍 Debug Mode

Console logs are enabled in the API. To view:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Upload a file
4. Look for messages like:
   - `[Class Match] Looking for: grade="Form 1", section="A"`
   - `[Class Match] SUCCESS: Form 1 A (ID: xxx)`
   - `[Class Match] FAILED for: "Form 2" section "C"`

## 📞 Support

If students are not being assigned to classes:
1. Check browser console for `[Class Match]` logs
2. Verify class exists in system
3. Check grade_level and section names match exactly
4. Try using filename auto-detection instead

---

**System Version:** v2.0 with Smart Parsing
**Last Updated:** 2024
