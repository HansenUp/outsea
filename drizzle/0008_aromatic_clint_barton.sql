CREATE TABLE `upload_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`created_at` integer NOT NULL
);
