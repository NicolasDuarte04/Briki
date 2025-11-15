# Ticket para Supabase Support

## Subject
Need superuser permissions to apply RLS policies on storage.objects for multi-tenant security

## Description

Hello Supabase Support Team,

I'm implementing Row Level Security (RLS) policies on `storage.objects` for multi-tenant isolation in my project, but I'm encountering permission issues.

### The Problem

When I try to execute `CREATE POLICY` or `DROP POLICY` statements on `storage.objects` from the SQL Editor, I get:

```
ERROR: 42501: must be owner of relation objects
```

### What I've Verified

I ran these diagnostic queries in the SQL Editor:

```sql
SELECT 
    current_user as usuario,
    session_user as sesion,
    (SELECT usesuper FROM pg_user WHERE usename = current_user) as es_superuser,
    (SELECT tableowner FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') as owner_storage;
```

**Results**:
- Current user: `postgres`
- Session user: `postgres`  
- Is superuser: `FALSE` ← This is the issue
- storage.objects owner: `supabase_storage_admin`

### What I Need

I need to apply RLS policies to `storage.objects` to implement organization-based access control (multi-tenant security) as part of our Day 2 implementation.

The policies I need to create validate access based on `org_id` in file metadata, ensuring users can only access files from their own organization.

### Options

Could you please help me by either:

1. **Granting necessary permissions** to my `postgres` user to create/drop policies on `storage.objects`, OR
2. **Executing the attached SQL script** (`apply-day2-with-permissions-fix.sql`) on my behalf, OR
3. **Providing guidance** on the correct way to apply custom RLS policies to Storage in a managed Supabase project

### Project Information

- **Project ID**: [YOUR-PROJECT-ID] (find it in your Dashboard URL)
- **Project Name**: Briki
- **Database**: PostgreSQL

### Attached Files

1. `apply-day2-with-permissions-fix.sql` - The complete SQL script with the policies
2. `verify-day2-implementation.sql` - Verification script to run after applying

### What the Script Does

The script:
1. Drops old/insecure storage policies
2. Creates new RLS policies that validate `org_id` in file metadata
3. Migrates metadata for 27 existing files (adds `org_id` from path)
4. Implements multi-tenant security for artifacts and proposals buckets

This is a standard multi-tenant security implementation and does NOT modify the structure of `storage.objects`, only the RLS policies.

### Priority

This is **critical for security** - without these policies, users from one organization can access files from other organizations, which is a serious security vulnerability.

### Thank You

I appreciate your help with this. Please let me know if you need any additional information.

Best regards,
[Your Name]

