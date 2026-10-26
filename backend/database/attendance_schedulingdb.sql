-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 02, 2026
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

CREATE DATABASE IF NOT EXISTS `attendance&schedulingdb`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;
USE `attendance&schedulingdb`;

-- --------------------------------------------------------
-- Users
-- --------------------------------------------------------
CREATE TABLE `users` (
  `user_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `role` enum('Admin','Teacher','Student') NOT NULL DEFAULT 'Student',
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Teachers
-- --------------------------------------------------------
CREATE TABLE `teachers` (
  `teacher_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `employee_number` varchar(30) NOT NULL,
  `department` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`teacher_id`),
  UNIQUE KEY `employee_number` (`employee_number`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `teachers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Students
-- --------------------------------------------------------
CREATE TABLE `students` (
  `student_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `student_number` varchar(30) NOT NULL,
  `course` varchar(100) NOT NULL,
  `year_level` int(10) unsigned NOT NULL,
  `section` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`student_id`),
  UNIQUE KEY `student_number` (`student_number`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `students_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Subjects
-- --------------------------------------------------------
CREATE TABLE `subjects` (
  `subject_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `subject_code` varchar(30) NOT NULL,
  `subject_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `units` decimal(3,1) DEFAULT 3.0,
  `year_level` tinyint(3) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`subject_id`),
  UNIQUE KEY `subject_code` (`subject_code`),
  KEY `year_level` (`year_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Rooms
-- --------------------------------------------------------
CREATE TABLE `rooms` (
  `room_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `room_name` varchar(100) NOT NULL,
  `building` enum('A','B','C','D') NOT NULL,
  `floor` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `room_type` enum('Room','Lab','Facility') NOT NULL DEFAULT 'Room',
  `description` varchar(255) DEFAULT NULL,
  `upper_order` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `lower_order` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `is_featured` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`room_id`),
  UNIQUE KEY `room_identity` (`building`,`floor`,`room_name`),
  KEY `building_floor` (`building`,`floor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Schedules
-- --------------------------------------------------------
CREATE TABLE `schedules` (
  `schedule_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `subject_id` int(10) unsigned NOT NULL,
  `teacher_id` int(10) unsigned NOT NULL,
  `day` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `room` varchar(100) DEFAULT NULL,
  `section` varchar(50) DEFAULT NULL,
  `class_status` enum('scheduled','absent','unavailable','cancelled') NOT NULL DEFAULT 'scheduled',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`schedule_id`),
  KEY `subject_id` (`subject_id`),
  KEY `teacher_id` (`teacher_id`),
  CONSTRAINT `schedules_ibfk_1` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`subject_id`),
  CONSTRAINT `schedules_ibfk_2` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`teacher_id`),
  CONSTRAINT `chk_schedule_time` CHECK (`end_time` > `start_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Attendance
-- --------------------------------------------------------
CREATE TABLE `attendance` (
  `attendance_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `student_id` int(10) unsigned NOT NULL,
  `schedule_id` int(10) unsigned NOT NULL,
  `attendance_date` date NOT NULL,
  `time_in` time DEFAULT NULL,
  `time_out` time DEFAULT NULL,
  `status` enum('Present','Late','Absent','Excused') NOT NULL DEFAULT 'Absent',
  `remarks` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`attendance_id`),
  UNIQUE KEY `unique_student_schedule_date` (`student_id`, `schedule_id`, `attendance_date`),
  KEY `student_id` (`student_id`),
  KEY `schedule_id` (`schedule_id`),
  KEY `attendance_date` (`attendance_date`),
  CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`),
  CONSTRAINT `attendance_ibfk_2` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`schedule_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Manual conflicts
-- Issues reported by staff that the schedule itself cannot detect
-- (equipment problems, room changes, exam clashes, requests).
-- --------------------------------------------------------
CREATE TABLE `manual_conflicts` (
  `conflict_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `conflict_type` enum('Teacher','Room','Section','Other') NOT NULL DEFAULT 'Other',
  `day` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') DEFAULT NULL,
  `reference` varchar(150) DEFAULT NULL,
  `title` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `severity` enum('error','warn') NOT NULL DEFAULT 'warn',
  `status` enum('Open','Resolved') NOT NULL DEFAULT 'Open',
  `resolution_note` varchar(255) DEFAULT NULL,
  `reported_by` varchar(150) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`conflict_id`),
  KEY `status` (`status`),
  KEY `conflict_type` (`conflict_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Acknowledged automatic conflicts
-- Automatic clashes that have been reviewed and accepted, so they can be
-- hidden without losing the record. Keyed by a stable signature of the clash.
-- --------------------------------------------------------
CREATE TABLE `conflict_acknowledgements` (
  `conflict_key` varchar(191) NOT NULL,
  `note` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`conflict_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Seed data: demo-only accounts (replace or remove these after import).
-- Passwords below are bcrypt hashes; change them after first login.
-- --------------------------------------------------------
INSERT INTO `users` (`user_id`, `username`, `password`, `full_name`, `email`, `role`, `status`) VALUES
  (1, 'admin', '$2y$10$CkIYWc7Y9UEF3nFCYO1/Q.w7lPvdeC24iRETfDFg0FBOSxWY4i6TG', 'John Clarke Ballega', 'admin@example.com', 'Admin', 'Active'),
  (2, 'teacher', '$2y$10$zhIIezAvCG5L..NzvMLMuOE4NNJMqXYnqILeV5F97qvyjW0RQyxRW', 'Jirah Billones', 'teacher@example.com', 'Teacher', 'Active'),
  (3, 'student', '$2y$10$pud/EDsN1ogcad2N21Ge/.EdZmfqsrinoct1i/ZU4949f.buIHXE6', 'Juan Dela Cruz', 'student@example.com', 'Student', 'Active');

INSERT INTO `teachers` (`teacher_id`, `user_id`, `employee_number`, `department`) VALUES
  (1, 2, 'EMP-001', 'Information Technology');

INSERT INTO `students` (`student_id`, `user_id`, `student_number`, `course`, `year_level`, `section`) VALUES
  (1, 3, '2026-0001', 'BSIT', 2, 'BSIT-2A');

INSERT INTO `subjects` (`subject_id`, `subject_code`, `subject_name`, `description`, `units`, `year_level`) VALUES
  (1, 'IT101', 'Introduction to Information Technology', 'Introductory IT course', 3.0, 1),
  (2, 'IT102', 'Database Management Systems', 'Database principles and SQL', 3.0, 2),
  (3, 'IT103', 'Web Development', 'Front-end and back-end web apps', 3.0, 3),
  (4, 'CS101', 'Programming Fundamentals', 'Basic programming concepts', 3.0, 1),
  (5, 'CS102', 'Data Structures', 'Core data structures and algorithms', 3.0, 2);

INSERT INTO `rooms` (`room_id`, `room_name`, `building`, `floor`, `room_type`, `description`) VALUES
  (1, 'Lab 1', 'A', 1, 'Lab', NULL),
  (2, 'Lab 2', 'A', 1, 'Lab', NULL),
  (3, 'Admin', 'A', 1, 'Facility', 'Admin office'),
  (4, 'Cashier', 'A', 1, 'Facility', 'Administrative office'),
  (5, 'MIS', 'A', 1, 'Facility', 'Information systems office'),
  (6, 'Men''s Restroom', 'A', 1, 'Facility', 'Men''s restroom'),
  (7, 'Library', 'A', 2, 'Facility', 'Library'),
  (8, 'Women CR', 'A', 2, 'Facility', 'Women''s restroom'),
  (9, 'Room 101', 'A', 2, 'Room', NULL),
  (10, 'Room 102', 'A', 2, 'Room', NULL),
  (11, 'Room 103', 'A', 2, 'Room', NULL),
  (12, 'Lab 3', 'A', 2, 'Lab', NULL),
  (13, 'Men CR', 'B', 1, 'Facility', 'Men''s restroom'),
  (14, 'Women CR', 'B', 1, 'Facility', 'Women''s restroom'),
  (15, 'Faculty Room', 'B', 1, 'Facility', 'Faculty office'),
  (16, 'Clinic', 'B', 1, 'Facility', 'Campus clinic'),
  (18, 'Room 102', 'B', 1, 'Room', NULL),
  (19, 'Room 103', 'B', 1, 'Room', NULL),
  (20, 'Room 104', 'B', 1, 'Room', NULL),
  (21, 'Room 106', 'B', 1, 'Room', NULL),
  (60, 'Room 107', 'B', 1, 'Room', NULL),
  (22, 'Room A', 'C', 1, 'Room', NULL),
  (23, 'Room B', 'C', 1, 'Room', NULL),
  (24, 'Room C', 'C', 1, 'Room', NULL),
  (25, 'Room D', 'C', 1, 'Room', NULL),
  (26, 'Room E', 'C', 1, 'Room', NULL),
  (27, 'Room F', 'C', 1, 'Room', NULL),
  (28, 'Room G', 'C', 1, 'Room', NULL),
  (29, 'Room H', 'C', 2, 'Room', NULL),
  (30, 'Room I', 'C', 2, 'Room', NULL),
  (31, 'Room J', 'C', 2, 'Room', NULL),
  (32, 'Room K', 'C', 2, 'Room', NULL),
  (33, 'Room L', 'C', 2, 'Room', NULL),
  (34, 'Room M', 'C', 2, 'Room', NULL),
  (35, 'Room N', 'C', 2, 'Room', NULL),
  (36, 'Room O', 'C', 3, 'Room', NULL),
  (37, 'Room P', 'C', 3, 'Room', NULL),
  (38, 'Room Q', 'C', 3, 'Room', NULL),
  (39, 'Room R', 'C', 3, 'Room', NULL),
  (40, 'Room S', 'C', 3, 'Room', NULL),
  (41, 'Room T', 'C', 3, 'Room', NULL),
  (42, 'Room 101', 'D', 1, 'Room', NULL),
  (43, 'Room 102', 'D', 1, 'Room', NULL),
  (44, 'Room 103', 'D', 1, 'Room', NULL),
  (45, 'Room 104', 'D', 1, 'Room', NULL),
  (46, 'Faculty Room', 'D', 1, 'Facility', 'Faculty office'),
  (47, 'Men CR', 'D', 1, 'Facility', 'Men''s restroom'),
  (48, 'Room 201', 'D', 2, 'Room', NULL),
  (49, 'Room 202', 'D', 2, 'Room', NULL),
  (50, 'Room 203', 'D', 2, 'Room', NULL),
  (51, 'Room 204', 'D', 2, 'Room', NULL),
  (52, 'Faculty Room', 'D', 2, 'Facility', 'Faculty office'),
  (53, 'Men CR', 'D', 2, 'Facility', 'Men''s restroom'),
  (54, 'Room 301', 'D', 3, 'Room', NULL),
  (55, 'Room 302', 'D', 3, 'Room', NULL),
  (56, 'Room 303', 'D', 3, 'Room', NULL),
  (57, 'Room 304', 'D', 3, 'Room', NULL),
  (58, 'Faculty Room', 'D', 3, 'Facility', 'Faculty office'),
  (59, 'Men CR', 'D', 3, 'Facility', 'Men''s restroom');

INSERT INTO `schedules` (`schedule_id`, `subject_id`, `teacher_id`, `day`, `start_time`, `end_time`, `room`, `section`) VALUES
  (1, 1, 1, 'Monday', '08:00:00', '09:30:00', 'Room 101', 'BSIT-2A'),
  (2, 4, 1, 'Tuesday', '10:00:00', '11:30:00', 'Lab 201', 'BSIT-2A'),
  (3, 5, 1, 'Wednesday', '13:00:00', '14:30:00', 'Room 205', 'BSCS-2A');

INSERT INTO `attendance` (`attendance_id`, `student_id`, `schedule_id`, `attendance_date`, `time_in`, `time_out`, `status`, `remarks`) VALUES
  (1, 1, 1, '2026-10-02', '08:00:00', '09:30:00', 'Present', 'On time');

-- Demo manually reported conflicts (delete once real reports come in).
INSERT INTO `manual_conflicts` (`conflict_id`, `conflict_type`, `day`, `reference`, `title`, `description`, `severity`, `status`, `reported_by`) VALUES
  (1, 'Room', 'Wednesday', 'Lab 1', 'Projector in Lab 1 is not working', 'The front projector flickers and cannot be used for the 9:00 class.', 'error', 'Open', 'Facilities'),
  (2, 'Teacher', 'Friday', 'EMP-004', 'Teacher request for a room change', 'Requested to move the Friday class to Room 205 for the laboratory session.', 'warn', 'Open', 'Registrar');

COMMIT;
