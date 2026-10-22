CREATE TABLE `pilot_allocations` (
	`result_id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`order_id` text NOT NULL,
	`status` text DEFAULT 'reserved' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pilot_budget` (
	`day` text PRIMARY KEY NOT NULL,
	`reserved` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pilot_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`result_id` text NOT NULL,
	`day` text NOT NULL,
	`reserved` integer NOT NULL,
	`status` text NOT NULL,
	`request_id` text,
	`error` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pilot_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`customer` text NOT NULL,
	`contact` text NOT NULL,
	`amount` integer NOT NULL,
	`units` integer NOT NULL,
	`languages` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`receipt` text,
	`scope` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pilot_qa` (
	`result_id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`reviewer` text NOT NULL,
	`usable` integer NOT NULL,
	`critical` integer NOT NULL,
	`authorized` integer NOT NULL,
	`note` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pilot_refunds` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`amount` integer NOT NULL,
	`reason` text NOT NULL,
	`receipt` text,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
