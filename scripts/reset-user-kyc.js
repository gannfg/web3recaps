// Script to reset KYC data for a specific user
// Run with: node scripts/reset-user-kyc.js

const { createClient } = require('@supabase/supabase-js')

// Replace with your Supabase URL and service key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function resetUserKyc(email) {
  try {
    console.log(`Looking for user with email: ${email}`)
    
    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, kyc_status, kyc_document_url')
      .eq('email', email)
      .single()

    if (userError) {
      console.error('Error finding user:', userError)
      return
    }

    if (!user) {
      console.log('User not found')
      return
    }

    console.log('Found user:', {
      id: user.id,
      email: user.email,
      kyc_status: user.kyc_status,
      kyc_document_url: user.kyc_document_url
    })

    // Reset KYC fields
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        kyc_completed: false,
        kyc_verified: false,
        kyc_status: null,
        kyc_document_url: null,
        kyc_document_type: null,
        kyc_full_name: null,
        kyc_submitted_at: null,
        kyc_verified_at: null,
        kyc_verified_by: null,
        role: 'VISITOR' // Reset to visitor role
      })
      .eq('id', user.id)
      .select()

    if (updateError) {
      console.error('Error updating user:', updateError)
      return
    }

    console.log('✅ Successfully reset KYC data for user:', email)
    console.log('User can now go through the full KYC process again.')

    // If there was a document URL, try to delete it from storage
    if (user.kyc_document_url) {
      console.log('Attempting to delete document from storage...')
      
      // Extract file path from URL
      const urlParts = user.kyc_document_url.split('/')
      const bucketName = 'kyc-documents'
      const fileName = urlParts[urlParts.length - 1]
      const filePath = `${user.id}/${fileName}`
      
      const { error: deleteError } = await supabase.storage
        .from(bucketName)
        .remove([filePath])

      if (deleteError) {
        console.log('Note: Could not delete document from storage (may already be deleted):', deleteError.message)
      } else {
        console.log('✅ Document deleted from storage')
      }
    }

  } catch (error) {
    console.error('Script error:', error)
  }
}

// Get email from command line argument
const email = process.argv[2]

if (!email) {
  console.log('Usage: node scripts/reset-user-kyc.js <email>')
  console.log('Example: node scripts/reset-user-kyc.js belacosaur@gmail.com')
  process.exit(1)
}

resetUserKyc(email)
