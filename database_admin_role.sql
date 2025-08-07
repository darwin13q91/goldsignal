-- Add admin role to users table
ALTER TABLE users ADD COLUMN user_role TEXT DEFAULT 'user' CHECK (user_role IN ('user', 'admin', 'super_admin'));

-- Update your user to be admin
UPDATE users 
SET user_role = 'admin' 
WHERE email = 'your-admin-email@example.com';
