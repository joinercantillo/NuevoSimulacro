-- AUTO GENERATED FILE: do not edit by hand.
--
-- Regenerate it with: npm run diagrams
--
-- Source of the model: scripts/generate-diagrams.mjs

-- PostgreSQL schema equivalent to the TypeORM entities
-- TypeORM creates it automatically while DB_SYNCHRONIZE=true.

-- Branches of the Arenosa Hotels chain
CREATE TABLE hotels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(100) NOT NULL,
  address VARCHAR(200) NOT NULL,
  city VARCHAR(100) NOT NULL,
  active BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Rooms of each branch
CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  number VARCHAR(10) NOT NULL,
  room_type VARCHAR(20) NOT NULL CHECK (room_type IN ('SINGLE', 'DOUBLE', 'SUITE')),
  capacity INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE')),
  hotel_id INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  , CONSTRAINT fk_rooms_hotel_id FOREIGN KEY (hotel_id) REFERENCES hotels (id) ON DELETE RESTRICT
);

-- Receptionists referenced by the reservations
CREATE TABLE receptionists (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  document VARCHAR(20) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100) NOT NULL,
  active BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Identities behind the x-user header: role comes from here, never from the request
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'coordinator', 'receptionist')),
  receptionist_id INTEGER NULL,
  password_hash VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  , CONSTRAINT fk_users_receptionist_id FOREIGN KEY (receptionist_id) REFERENCES receptionists (id) ON DELETE RESTRICT
);

-- Reservation of a room by a guest, owned by one receptionist
CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  guest VARCHAR(100) NOT NULL,
  guest_document VARCHAR(12) NOT NULL,
  room_type VARCHAR(20) NOT NULL CHECK (room_type IN ('SINGLE', 'DOUBLE', 'SUITE')),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  receptionist_id INTEGER NOT NULL,
  room_id INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  , CONSTRAINT fk_reservations_receptionist_id FOREIGN KEY (receptionist_id) REFERENCES receptionists (id) ON DELETE RESTRICT,
  , CONSTRAINT fk_reservations_room_id FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE RESTRICT
);
