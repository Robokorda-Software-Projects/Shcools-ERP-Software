// AI-Assisted CSV/Excel Parser
// Fallback for complex file structures that deterministic parsing can't handle

export interface AIParseRequest {
  fileContent: string
  fileName: string
  fileType: 'csv' | 'excel'
  rowCount: number
  columnCount: number
  firstRows: string[] // First 20 rows for context
}

export interface AIParseResponse {
  success: boolean
  analysis: {
    fileStructure: string // Description of file structure
    classDetection: {
      detected: boolean
      className?: string
      gradeLevel?: string
      section?: string
      confidence: number
      location: string // 'filename' | 'header_row' | 'content' | 'sheet_name'
    }
    headerRow: {
      detected: boolean
      rowIndex: number
      confidence: number
      headers: string[]
    }
    dataRows: {
      startRow: number
      endRow: number
      totalStudents: number
    }
    columnMapping: Record<string, {
      suggestedField: string
      confidence: number
      reasoning: string
    }>
    specialCases: string[] // Any unusual patterns detected
  }
  error?: string
}

export class AIParser {
  private apiKey: string
  private model: string
  private endpoint: string

  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    this.apiKey = apiKey
    this.model = model
    this.endpoint = 'https://api.openai.com/v1/chat/completions'
  }

  async parseFile(request: AIParseRequest): Promise<AIParseResponse> {
    try {
      const prompt = this.buildAnalysisPrompt(request)
      
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert at analyzing educational data files. You help parse student enrollment CSV/Excel files with complex or unusual structures. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3, // Low temperature for consistent parsing
          response_format: { type: 'json_object' }
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const aiResponse = JSON.parse(data.choices[0].message.content)

      return {
        success: true,
        analysis: aiResponse
      }

    } catch (error: any) {
      console.error('AI parsing error:', error)
      return {
        success: false,
        analysis: this.getEmptyAnalysis(),
        error: error.message
      }
    }
  }

  private buildAnalysisPrompt(request: AIParseRequest): string {
    return `
Analyze this student enrollment file and extract its structure.

**File Information:**
- Filename: ${request.fileName}
- Type: ${request.fileType}
- Rows: ${request.rowCount}
- Columns: ${request.columnCount}

**First 20 rows of content:**
\`\`\`
${request.firstRows.join('\n')}
\`\`\`

**Your Task:**
Analyze this file and provide a JSON response with the following structure:

{
  "fileStructure": "Brief description of how the file is organized",
  "classDetection": {
    "detected": true/false,
    "className": "extracted class name if found",
    "gradeLevel": "extracted grade level if found",
    "section": "extracted section if found",
    "confidence": 0.0-1.0,
    "location": "filename|header_row|content|sheet_name"
  },
  "headerRow": {
    "detected": true/false,
    "rowIndex": number (0-based index),
    "confidence": 0.0-1.0,
    "headers": ["array", "of", "column", "names"]
  },
  "dataRows": {
    "startRow": number (first row with actual student data),
    "endRow": number (last row with data),
    "totalStudents": number
  },
  "columnMapping": {
    "Original Column Name": {
      "suggestedField": "student_full_name|student_gender|student_birth_date|...",
      "confidence": 0.0-1.0,
      "reasoning": "Why this mapping"
    }
  },
  "specialCases": ["Any unusual patterns or notes"]
}

**Mapping Fields Available:**
- student_full_name, student_gender, student_birth_date, student_nationality
- student_id_number, student_birth_certificate, student_address
- student_medical_conditions, student_previous_school
- parent_full_name, parent_id_number, parent_birth_date
- parent_phone, parent_email, parent_address, parent_relationship, parent_occupation
- class_name, grade_level, fee_amount, notes

**Important Rules:**
1. Skip title rows, section headers, blank rows
2. Identify the actual header row with column names
3. Detect class info from filename, sheet name, or content
4. Map columns to standard fields above
5. Return ONLY valid JSON, no markdown or extra text
`.trim()
  }

  private getEmptyAnalysis(): AIParseResponse['analysis'] {
    return {
      fileStructure: 'Unknown',
      classDetection: {
        detected: false,
        confidence: 0,
        location: 'filename'
      },
      headerRow: {
        detected: false,
        rowIndex: 0,
        confidence: 0,
        headers: []
      },
      dataRows: {
        startRow: 0,
        endRow: 0,
        totalStudents: 0
      },
      columnMapping: {},
      specialCases: []
    }
  }
}

// Helper to check if AI parsing is needed
export function shouldUseAIParsing(
  fileContent: string,
  deterministicResult: any
): boolean {
  // Trigger AI if deterministic parsing has low confidence
  const triggers = [
    // No headers detected
    !deterministicResult.headers || deterministicResult.headers.length === 0,
    
    // Too few columns (suspicious)
    deterministicResult.headers && deterministicResult.headers.length < 5,
    
    // Very few rows
    deterministicResult.rows && deterministicResult.rows.length < 3,
    
    // Headers look suspicious (all numbers, all single chars, etc.)
    deterministicResult.headers && 
      deterministicResult.headers.every((h: string) => h.length <= 2),
    
    // Mixed data types in columns (suggests wrong header row)
    // This would need deeper analysis
  ]

  return triggers.some(condition => condition)
}

// Format AI results for the bulk upload UI
export function formatAIResults(aiResponse: AIParseResponse) {
  if (!aiResponse.success) {
    return null
  }

  const { analysis } = aiResponse

  return {
    headers: analysis.headerRow.headers,
    rows: [], // Rows will be extracted based on startRow/endRow
    detectedClass: analysis.classDetection.detected 
      ? `${analysis.classDetection.gradeLevel} ${analysis.classDetection.section}`.trim()
      : null,
    aiAnalysis: {
      structure: analysis.fileStructure,
      confidence: analysis.headerRow.confidence,
      startRow: analysis.dataRows.startRow,
      endRow: analysis.dataRows.endRow,
      specialNotes: analysis.specialCases
    },
    suggestedMappings: Object.entries(analysis.columnMapping).reduce((acc, [col, info]) => {
      acc[col] = info.suggestedField
      return acc
    }, {} as Record<string, string>)
  }
}
