ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;

-- Optional: Create an initial super admin if needed
-- UPDATE users SET is_super_admin = TRUE WHERE email = 'your-email@example.com';
