# AI-Assisted Parsing - Quick Setup Guide

## 📋 Prerequisites

1. OpenAI API account
2. Super Admin access to ERP system
3. Database migrations applied

## 🚀 Setup Steps

### Step 1: Run Database Migration

Execute the SQL migration to create required tables:

```bash
# In your Supabase dashboard or via psql
psql -h your-db-host -d your-db-name -f frontend/migrations/06_ai_parsing_system.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `frontend/migrations/06_ai_parsing_system.sql`
3. Click "Run"

### Step 2: Get OpenAI API Key

1. Visit https://platform.openai.com/api-keys
2. Sign in or create account
3. Click "Create new secret key"
4. Name it: "Schools-ERP-Bulk-Upload"
5. Copy the key (starts with `sk-proj-...`)
6. **Important:** Save it securely - you won't see it again!

### Step 3: Configure in System

1. Log in as **Super Admin**
2. Navigate to: **Dashboard → Super Admin → AI Settings**
3. Paste your OpenAI API key
4. Click **"Test Key"** to verify it works
5. Select AI Model: **gpt-4o-mini** (recommended)
6. Enable **"AI Parsing"** toggle
7. Set daily limit: **100** (adjust based on usage)
8. Click **"Save Settings"**

### Step 4: Test the System

1. Go to **Dashboard → Students → Bulk Enroll**
2. Upload a complex CSV file (see test_uploads/ folder)
3. If file is complex, you'll see purple alert
4. Click **"Use AI-Assisted Parsing"**
5. Wait 2-5 seconds
6. Review AI-generated column mappings
7. Proceed with enrollment

## ✅ Verification Checklist

- [ ] Database tables created (system_settings, ai_parsing_logs)
- [ ] OpenAI API key added
- [ ] API key tested successfully
- [ ] AI parsing enabled
- [ ] Test file uploaded successfully
- [ ] AI parsing button appears for complex files
- [ ] AI analysis completes without errors

## 🔍 Troubleshooting

### Issue: "AI parsing not configured"

**Problem:** No API key in system
**Solution:** Add API key in Super Admin → AI Settings

### Issue: "Invalid API key"

**Problem:** Wrong key or expired
**Solution:** 
1. Check key is copied correctly (no extra spaces)
2. Verify key is active in OpenAI dashboard
3. Check account has credits/billing enabled

### Issue: AI parsing button doesn't appear

**Problem:** File passes deterministic parsing
**Solution:** This is normal! AI only triggers for complex files. Try uploading `test_uploads/Form2B_with_header.csv` to test.

### Issue: Database error on save

**Problem:** Tables not created
**Solution:** Run migration SQL file first

## 💰 Cost Management

### Recommended Settings

**Small School (< 50 uploads/month):**
- Model: gpt-4o-mini
- Daily Limit: 10
- Est. Cost: < $0.01/month

**Medium School (50-200 uploads/month):**
- Model: gpt-4o-mini
- Daily Limit: 50
- Est. Cost: ~$0.05/month

**Large School District (200+ uploads/month):**
- Model: gpt-4o-mini
- Daily Limit: 100
- Est. Cost: ~$0.10/month

### Monitoring Usage

Check logs in database:
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as parses,
  AVG(confidence) as avg_confidence,
  SUM(COALESCE(cost_estimate, 0)) as total_cost
FROM ai_parsing_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 🎓 Training Users

### For Enrollment Officers

**Normal Files:**
"Upload your CSV as usual. The system handles most files automatically."

**Complex Files:**
"If you see a purple message saying 'Complex File Structure', just click the blue 'Use AI-Assisted Parsing' button and wait a few seconds. The AI will figure out your file structure."

**No Technical Knowledge Required:**
The system is designed to "just work" - AI is seamless fallback.

## 📊 Success Metrics

After deployment, monitor:
- % of files using AI vs deterministic
- AI success rate
- Average processing time
- User satisfaction
- Cost per month

**Target KPIs:**
- AI usage: < 15% of files (most pass deterministic)
- AI success rate: > 95%
- Processing time: < 5 seconds
- Cost: < $0.20/month for typical school

## 🔒 Security Best Practices

1. **API Key Security:**
   - Never commit keys to git
   - Rotate keys every 6 months
   - Use environment variables in production

2. **Access Control:**
   - Only super_admin can view/edit API key
   - Rate limit AI requests
   - Log all AI usage

3. **Cost Protection:**
   - Set daily limits
   - Monitor spending weekly
   - Alert on unusual spikes

## 📞 Support

If you encounter issues:

1. Check browser console (F12) for errors
2. Check `ai_parsing_logs` table for error messages
3. Verify OpenAI service status: https://status.openai.com/
4. Review `AI_PARSING_SYSTEM.md` for detailed documentation

## 🎉 You're Done!

Your hybrid parsing system is now active. Users can upload any CSV format, and the system will intelligently choose the best parsing method.

**Key Benefits:**
- ✅ Handles 100% of file formats (deterministic + AI)
- ✅ No user training required
- ✅ Minimal cost (< $1/month typical)
- ✅ Seamless fallback experience
- ✅ Detailed logging for troubleshooting

---

**Setup Time:** ~10 minutes
**Technical Skill Required:** Basic (copy/paste API key)
**User Impact:** Zero (system handles complexity)
