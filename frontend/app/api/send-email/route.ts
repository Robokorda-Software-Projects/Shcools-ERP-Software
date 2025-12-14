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

    // Send email using EmailJS
    const emailJSResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
        template_id: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
        user_id: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY,
        accessToken: process.env.EMAILJS_PRIVATE_KEY,
        template_params: {
          to_email: to,
          to_name: data.adminName || data.principalName || 'User',
          subject: subject || `SmartSchools ERP - ${template}`,
          message: emailContent,
          from_name: 'SmartSchools ERP',
          reply_to: data.supportEmail || 'support@smartschools.com'
        }
      })
    })

    if (!emailJSResponse.ok) {
      const errorText = await emailJSResponse.text()
      console.error('❌ EmailJS error:', errorText)
      throw new Error(`EmailJS failed: ${errorText}`)
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