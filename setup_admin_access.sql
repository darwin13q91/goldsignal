-- Admin Setup Script for Gold Signal Service (Simplified)
-- Run this in your Supabase SQL editor

-- 1. Add user_role column to users table (if not exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT 'user';

-- 2. Add constraint to ensure valid roles (simplified to just admin/user)
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS user_role_check;

ALTER TABLE users 
ADD CONSTRAINT user_role_check 
CHECK (user_role IN ('user', 'admin'));

-- 3. Set default value for existing users
UPDATE users SET user_role = 'user' WHERE user_role IS NULL OR user_role = 'super_admin';

-- 4. Make your account an admin (replace with your actual email)
-- UPDATE users 
-- SET user_role = 'admin' 
-- WHERE email = 'your-email@example.com';

-- Uncomment and run the line above with your actual email address

-- 5. Verify the changes
SELECT id, email, full_name, subscription_tier, user_role 
FROM users 
WHERE user_role = 'admin';
