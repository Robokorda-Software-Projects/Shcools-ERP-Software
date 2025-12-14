// app/api/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, subject, template, data } = body

    console.log('📧 Email request received:', { to, subject, template })

    // Validate required fields
    if (!to || !template || !data) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: to, template, data' 
      }, { status: 400 })
    }

    // Prepare email content based on template
    let emailContent = ''
    
    switch(template) {
      case 'welcome-admin':
        emailContent = `
Dear ${data.adminName},

Welcome to SmartSchools ERP!

Your school administrator account has been successfully created for ${data.schoolName}.

Login Details:
--------------
School Code: ${data.schoolCode}
Username: ${data.username}
Password: ${data.password}
Login URL: ${data.loginUrl}

Please change your password after your first login for security purposes.

If you need any assistance, please contact us at ${data.supportEmail}

Best regards,
SmartSchools ERP Team
        `
        break

      case 'welcome-principal':
        emailContent = `
Dear ${data.principalName},

Congratulations! ${data.schoolName} has been successfully registered on SmartSchools ERP.

School Code: ${data.schoolCode}

Your School Administrator:
--------------------------
Name: ${data.adminName}
Email: ${data.adminEmail}
Phone: ${data.adminPhone}

The school administrator will be able to manage all aspects of your school through our platform.

For support, please contact: ${data.supportEmail}

Best regards,
SmartSchools ERP Team
        `
        break

      case 'admin-assigned':
        emailContent = `
Dear ${data.adminName},

You have been assigned as the School Administrator for ${data.schoolName} (${data.schoolCode}).

Login Details:
--------------
Login URL: ${data.loginUrl}

Please use your existing credentials to access the system.

If you need any assistance, please contact us at ${data.supportEmail}

Best regards,
SmartSchools ERP Team
        `
        break

      case 'credentials-reset':
        emailContent = `
Dear ${data.adminName},

Your login credentials for ${data.schoolName} have been reset.

New Login Details:
------------------
Username: ${data.username}
Password: ${data.password}
Login URL: ${data.loginUrl}

Please change your password after logging in for security purposes.

Best regards,
SmartSchools ERP Team
        `
        break

      default:
        emailContent = `
Dear User,

This is an automated message from SmartSchools ERP.

${JSON.stringify(data, null, 2)}

Best regards,
SmartSchools ERP Team
        `
    }

    // Map template names to EmailJS template IDs
    const templateMap: { [key: string]: string } = {
      'welcome-admin': process.env.EMAILJS_TEMPLATE_WELCOME_ADMIN || '',
      'welcome-principal': process.env.EMAILJS_TEMPLATE_WELCOME_PRINCIPAL || '',
      'admin-assigned': process.env.EMAILJS_TEMPLATE_ADMIN_ASSIGNED || '',
      'credentials-reset': process.env.EMAILJS_TEMPLATE_CREDENTIALS_RESET || ''
    }

    const templateId = templateMap[template]
    
    if (!templateId) {
      console.error('❌ Unknown template:', template)
      return NextResponse.json({ 
        success: false, 
        error: `Unknown email template: ${template}`
      }, { status: 400 })
    }

    // Validate EmailJS credentials
    if (!process.env.EMAILJS_SERVICE_ID || !process.env.EMAILJS_PRIVATE_KEY || !process.env.EMAILJS_PUBLIC_KEY) {
      console.error('❌ EmailJS credentials not configured')
      return NextResponse.json({ 
        success: false, 
        error: 'Email service not configured'
      }, { status: 500 })
    }

    // Build template_params based on template type to match EmailJS template variables
    let templateParams: Record<string, string> = {}

    switch(template) {
      case 'welcome-admin':
        // Matches: {{to_email}}, {{adminName}}, {{schoolName}}, {{schoolCode}}, {{username}}, {{password}}, {{loginUrl}}, {{supportEmail}}
        templateParams = {
          to_email: to,
          adminName: data.adminName || '',
          schoolName: data.schoolName || '',
          schoolCode: data.schoolCode || '',
          username: data.username || '',
          password: data.password || '',
          loginUrl: data.loginUrl || '',
          supportEmail: data.supportEmail || 'support@smartschools.com'
        }
        break

      case 'welcome-principal':
        // Matches: {{to_email}}, {{principalName}}, {{schoolName}}, {{schoolCode}}, {{adminName}}, {{adminEmail}}, {{adminPhone}}, {{supportEmail}}
        templateParams = {
          to_email: to,
          principalName: data.principalName || '',
          schoolName: data.schoolName || '',
          schoolCode: data.schoolCode || '',
          adminName: data.adminName || '',
          adminEmail: data.adminEmail || '',
          adminPhone: data.adminPhone || '',
          supportEmail: data.supportEmail || 'support@smartschools.com'
        }
        break

      case 'credentials-reset':
        // Matches: {{to_email}}, {{adminName}}, {{schoolName}}, {{username}}, {{password}}, {{loginUrl}}
        templateParams = {
          to_email: to,
          adminName: data.adminName || '',
          schoolName: data.schoolName || '',
          username: data.username || '',
          password: data.password || '',
          loginUrl: data.loginUrl || ''
        }
        break

      case 'admin-assigned':
        // Matches: {{to_email}}, {{adminName}}, {{schoolName}}, {{schoolCode}}, {{loginUrl}}, {{supportEmail}}
        templateParams = {
          to_email: to,
          adminName: data.adminName || '',
          schoolName: data.schoolName || '',
          schoolCode: data.schoolCode || '',
          loginUrl: data.loginUrl || '',
          supportEmail: data.supportEmail || 'support@smartschools.com'
        }
        break

      default:
        templateParams = { ...data, to_email: to }
    }

    console.log('📧 Sending email with params:', templateParams)
    console.log('📧 Using service_id:', process.env.EMAILJS_SERVICE_ID)
    console.log('📧 Using template_id:', templateId)

    // Send email using EmailJS
    const emailJSResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: templateId,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        accessToken: process.env.EMAILJS_PRIVATE_KEY,
        template_params: templateParams
      })
    })

    const responseText = await emailJSResponse.text()
    console.log('📧 EmailJS response status:', emailJSResponse.status)
    console.log('📧 EmailJS response:', responseText)

    if (!emailJSResponse.ok) {
      console.error('❌ EmailJS error:', responseText)
      return NextResponse.json({ 
        success: false, 
        error: `EmailJS failed: ${responseText}`,
        status: emailJSResponse.status
      }, { status: 500 })
    }

    console.log('✅ Email sent successfully via EmailJS')

    return NextResponse.json({ 
      success: true, 
      data: { 
        message: 'Email sent successfully',
        to: to,
        template: template
      }
    })

  } catch (error: any) {
    console.error('❌ Email sending error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error',
      details: error.toString()
    }, { status: 500 })
  }
}