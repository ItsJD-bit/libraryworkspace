-- PostgreSQL schema starter for the library workspace project.
-- Add tables here as the application grows.

CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'admin' CHECK (role = 'admin'),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patrons (
  id SERIAL PRIMARY KEY,
  barcode VARCHAR(100) UNIQUE NOT NULL,
  first_name VARCHAR(150) NOT NULL,
  last_name VARCHAR(150) NOT NULL,
  course VARCHAR(200),
  year INTEGER,
  patron_type VARCHAR(50) NOT NULL,
  department VARCHAR(200),
  student_id VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  subtitle VARCHAR(500),
  author VARCHAR(300) NOT NULL,
  illustrator VARCHAR(300),
  edition VARCHAR(200),
  publisher VARCHAR(300),
  publication_year INTEGER,
  language VARCHAR(100),
  isbn VARCHAR(32),
  isbn_13 VARCHAR(32),
  ddc_number VARCHAR(50),
  cutter_number VARCHAR(100),
  lcsh TEXT,
  ddc VARCHAR(50),
  cutter VARCHAR(100),
  genre VARCHAR(200),
  format VARCHAR(100),
  pages INTEGER,
  description TEXT,
  subject VARCHAR(500),
  barcode VARCHAR(100) UNIQUE,
  status VARCHAR(40) NOT NULL DEFAULT 'available',
  location VARCHAR(200),
  condition VARCHAR(100),
  price NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  acquisition_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  archived BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS circulation_loans (
  id SERIAL PRIMARY KEY,
  book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
  patron_id INTEGER REFERENCES patrons(id) ON DELETE CASCADE,
  checked_out_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_date TIMESTAMP,
  returned_at TIMESTAMP,
  status VARCHAR(30) NOT NULL DEFAULT 'checked_out'
);

CREATE TABLE IF NOT EXISTS internet_sessions (
  id SERIAL PRIMARY KEY,
  patron_id INTEGER REFERENCES patrons(id) ON DELETE CASCADE,
  pc_number INTEGER NOT NULL,
  time_in TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  time_out TIMESTAMP,
  usage_minutes INTEGER NOT NULL DEFAULT 0,
  monthly_usage_minutes INTEGER NOT NULL DEFAULT 0,
  fine_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(30) NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS discussion_room_reservations (
  id SERIAL PRIMARY KEY,
  room_name VARCHAR(100) NOT NULL,
  reservation_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  request_master_barcode VARCHAR(100),
  patron_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
