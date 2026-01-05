# Document Upload Implementation Guide

## ✅ Completed

### 1. Database Schema
- Created migration `07_add_document_urls_to_students.sql` ✅ **MIGRATED**
- Added 5 document URL columns to `students` table:
  - `birth_certificate_url`
  - `student_id_url`
  - `parent_id_url`
  - `previous_school_report_url`
  - `fee_slip_url`
- Created `student-documents` storage bucket
- Set up storage policies for upload/view/delete

### 2. Frontend - Viewing Documents
- Updated `students/enrolled/page.tsx` to fetch and display documents ✅
- Added `PreviousGrade` interface for grades ✅
- Enhanced EnrolledStudent interface with document URLs and previous_grades ✅
- Fetch previous grades from `student_previous_grades` table ✅
- Beautiful UI with color-coded document cards (click to view) ✅
- Previous grades display with average calculation ✅
- Removed old unused files: `students/page.tsx`, `students/enroll/` folder ✅

### 3. Document Display Features
- **Documents Section**: Shows all uploaded documents with color-coded cards
  - Blue: Birth Certificate
  - Green: Student ID
  - Purple: Parent ID
  - Amber: Previous School Report
  - Emerald: Fee Slip (already existed)
- **Grades Section**: Shows previous school results in a beautiful gradient card
  - Subject name in gray
  - Large bold percentage
  - Letter grade badge
  - Unit display for ZIMSEC grades
  - Overall average with subject count
  - Responsive grid (2/3/4 columns)

## 🔨 TODO - Complete the Implementation

### Step 1: ✅ Run the Database Migration - DONE
Migration executed successfully!

### Step 2: Update Enrollment API to Upload Documents

You need to modify `frontend/app/dashboard/students/enroll-new/page.tsx` to actually upload the documents to Supabase Storage when the student is enrolled.

Add this function before `handleSubmitEnrollment`:

```typescript
const uploadDocumentToStorage = async (file: File, studentId: string, documentType: string): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${studentId}/${documentType}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('student-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('student-documents')
      .getPublicUrl(fileName)

    return publicUrl
  } catch (error) {
    console.error(`Error uploading ${documentType}:`, error)
    return null
  }
}
```

### Step 3: Update the Enrollment Submission

In the `handleSubmitEnrollment` function, after the student is created, add document upload logic:

```typescript
// After student is created successfully
const studentId = result.data.student_id

// Upload documents if they exist
const documentUrls: any = {}

if (birthCertificateFile) {
  documentUrls.birth_certificate_url = await uploadDocumentToStorage(birthCertificateFile, studentId, 'birth_certificate')
}
if (studentIdFile) {
  documentUrls.student_id_url = await uploadDocumentToStorage(studentIdFile, studentId, 'student_id')
}
if (parentIdFile) {
  documentUrls.parent_id_url = await uploadDocumentToStorage(parentIdFile, studentId, 'parent_id')
}
if (previousSchoolReportFile) {
  documentUrls.previous_school_report_url = await uploadDocumentToStorage(previousSchoolReportFile, studentId, 'previous_school_report')
}
if (feeSlipFile) {
  documentUrls.fee_slip_url = await uploadDocumentToStorage(feeSlipFile, studentId, 'fee_slip')
}

// Update student record with document URLs
if (Object.keys(documentUrls).length > 0) {
  await supabase
    .from('students')
    .update(documentUrls)
    .eq('id', studentId)
}
```

### Step 4: Save Previous Grades to Database

After enrollment, save the grades to `student_previous_grades` table:

```typescript
// Save previous grades if they exist
if (formData.previousGrades && formData.previousGrades.length > 0) {
  const gradesToInsert = formData.previousGrades.map(grade => ({
    student_id: studentId,
    school_id: profile?.school_id,
    subject: grade.subject,
    marks: grade.marks,
    grade: grade.grade,
    unit: grade.unit,
    academic_year: formData.entryStatus === 'grade7_to_form1' ? 'Grade 7' : 
                   formData.entryStatus === 'olevel_to_alevel' ? 'O-Level' : 'Previous School'
  }))

  await supabase
    .from('student_previous_grades')
    .insert(gradesToInsert)
}
```

### Step 5: Update the Enrollment API Endpoint

Modify `frontend/app/api/admin/enroll-student/route.ts` to accept document files and save URLs:

1. Accept file URLs in the request body
2. Save document URLs when creating student record
3. Save previous grades to `student_previous_grades` table

Example:
```typescript
// In the student insert:
const { data: studentData, error: studentError } = await supabase
  .from('students')
  .insert({
    user_id: studentUserId,
    school_id: schoolId,
    class_id: classId,
    parent_id: parentUserId,
    // ... other fields ...
    birth_certificate_url: body.birth_certificate_url || null,
    student_id_url: body.student_id_url || null,
    parent_id_url: body.parent_id_url || null,
    previous_school_report_url: body.previous_school_report_url || null,
    fee_slip_url: body.fee_slip_url || null,
  })
  .select()
  .single()

// After student created, insert grades:
if (body.previous_grades && body.previous_grades.length > 0) {
  await supabase
    .from('student_previous_grades')
    .insert(body.previous_grades.map((g: any) => ({
      ...g,
      student_id: studentData.id,
      school_id: schoolId
    })))
}
```

## 📋 Testing Checklist

1. ✅ Run migration `07_add_document_urls_to_students.sql`
2. ⬜ Test document upload during enrollment
3. ⬜ Verify documents are stored in Supabase Storage bucket `student-documents`
4. ⬜ Verify document URLs are saved in `students` table
5. ⬜ Test viewing student details - documents should appear
6. ⬜ Test clicking document links - should open in new tab
7. ⬜ Test previous grades display
8. ⬜ Verify average calculation is correct
9. ⬜ Test with students who have no documents (should not show section)
10. ⬜ Test with students who have no grades (should not show section)

## 🎨 UI Features

### Document Cards
- Color-coded by document type
- Hover effect (darker background)
- Click to open in new tab
- External link icon for clarity
- Only shows documents that exist

### Grades Display
- Grid layout (responsive: 2/3/4 columns)
- Subject name in gray
- Large bold percentage
- Badge for letter grade
- Unit display for ZIMSEC grades
- Average calculation at bottom
- White cards on gray background

## 🔒 Security Notes

- Storage bucket `student-documents` is private (public: false)
- Only authenticated users can upload
- Storage policies allow viewing by authenticated users
- Consider adding more specific RLS policies based on school_id
- Documents are organized by student_id in folders

## 📱 Mobile Responsive

- Documents grid: 1 column on mobile, 2 on tablet, 3 on desktop
- Grades grid: 2 columns on mobile, 3 on tablet, 4 on desktop
- All click targets are large enough for touch
- Text sizes are readable on small screens

## 🚀 Future Enhancements

1. Add document preview modal (PDF viewer, image viewer)
2. Add document download button
3. Add document upload date/time
4. Add document verification status
5. Add ability to re-upload/replace documents
6. Add document expiry tracking
7. Bulk document download (zip all student docs)
8. Document approval workflow
9. Email notifications when documents are uploaded
10. Document OCR for automatic data extraction
