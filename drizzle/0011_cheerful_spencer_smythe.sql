CREATE TABLE `demo_mailbox` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient` text NOT NULL,
	`kind` text NOT NULL,
	`link` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mail_tokens` (
	`hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`email` text NOT NULL,
	`config_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `verified_emails` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`verified_at` integer NOT NULL
);
