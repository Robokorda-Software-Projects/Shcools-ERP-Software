import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { AIParser, AIParseRequest } from '@/lib/ai-parser'

export async function POST(request: NextRequest) {
  try {
    // Get user from authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single()

    if (!profile || !['enrollment_officer', 'school_admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get AI API key from settings (super_admin can configure this)
    const { data: settings } = await supabase
      .from('system_settings')
      .select('openai_api_key, ai_model')
      .single()

    if (!settings?.openai_api_key) {
      return NextResponse.json({ 
        error: 'AI parsing not configured. Please contact your system administrator to add OpenAI API key in Super Admin settings.' 
      }, { status: 400 })
    }

    // Parse request body
    const body = await request.json()
    const { fileContent, fileName, fileType, firstRows } = body as {
      fileContent: string
      fileName: string
      fileType: 'csv' | 'excel'
      firstRows: string[]
    }

    if (!fileContent || !fileName || !firstRows) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Count rows and columns
    const lines = fileContent.split('\n').filter(l => l.trim())
    const rowCount = lines.length
    const columnCount = lines[0]?.split(',').length || 0

    const parseRequest: AIParseRequest = {
      fileContent,
      fileName,
      fileType: fileType || 'csv',
      rowCount,
      columnCount,
      firstRows: firstRows.slice(0, 20) // Limit to 20 rows to save tokens
    }

    // Initialize AI parser
    const aiModel = settings.ai_model || 'gpt-4o-mini'
    const parser = new AIParser(settings.openai_api_key, aiModel)

    console.log(`[AI Parser] Analyzing file: ${fileName} (${rowCount} rows, ${columnCount} cols)`)

    // Call AI parsing
    const result = await parser.parseFile(parseRequest)

    if (!result.success) {
      console.error('[AI Parser] Failed:', result.error)
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    console.log('[AI Parser] Success! Structure:', result.analysis.fileStructure)
    console.log('[AI Parser] Class detected:', result.analysis.classDetection.detected)
    console.log('[AI Parser] Headers found at row:', result.analysis.headerRow.rowIndex)

    // Log AI usage for billing/monitoring
    await supabase.from('ai_parsing_logs').insert([{
      user_id: user.id,
      school_id: profile.school_id,
      file_name: fileName,
      row_count: rowCount,
      model_used: aiModel,
      success: true,
      confidence: result.analysis.headerRow.confidence,
      created_at: new Date().toISOString()
    }])

    return NextResponse.json({
      success: true,
      analysis: result.analysis
    })

  } catch (error: any) {
    console.error('[AI Parser] Error:', error)
    return NextResponse.json({ 
      error: 'AI parsing failed: ' + error.message 
    }, { status: 500 })
  }
}
