
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    validity_start DATE NOT NULL,
    validity_end DATE NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert admin user
INSERT INTO users (username, password, validity_start, validity_end, is_admin) 
VALUES ('admin', '$2y$10$7ZCoD.d9DMnriL16U110SeUjRDYwWz18QXU6i63DFZe5OmKip6wWu', '2023-01-01', '2030-12-31', true)
ON CONFLICT (username) DO NOTHING;
