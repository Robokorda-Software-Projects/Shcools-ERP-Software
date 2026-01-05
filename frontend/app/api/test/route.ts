import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Test API received:', body)
    return NextResponse.json({ 
      success: true, 
      message: 'Test endpoint working!',
      received: body 
    })
  } catch (error: any) {
    console.error('Test API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message 
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    success: true, 
    message: 'Test endpoint GET working!' 
  })
}
