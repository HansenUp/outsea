CREATE TABLE `call_metrics` (
	`call_id` text PRIMARY KEY NOT NULL,
	`duration_ms` integer NOT NULL,
	`units` integer,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cost_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text,
	`result_id` text,
	`category` text NOT NULL,
	`amount_micros` integer NOT NULL,
	`basis` text NOT NULL,
	`minutes` integer NOT NULL,
	`note` text NOT NULL,
	`actor_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `glossary_bindings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`language` text NOT NULL,
	`vendor_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`verified` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `glossary_terms` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source` text NOT NULL,
	`target` text NOT NULL,
	`language` text NOT NULL,
	`kind` text NOT NULL,
	`enabled` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `issue_events` (
	`id` text PRIMARY KEY NOT NULL,
	`issue_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`note` text NOT NULL,
	`status` text NOT NULL,
	`minutes` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `issues` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`result_id` text NOT NULL,
	`user_id` text NOT NULL,
	`category` text NOT NULL,
	`region` text NOT NULL,
	`description` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `job_specs` (
	`job_id` text PRIMARY KEY NOT NULL,
	`terms` text NOT NULL,
	`glossaries` text NOT NULL,
	`protect_product` integer NOT NULL,
	`source_text` text NOT NULL,
	`demo_scenario` text NOT NULL,
	`api_rate_micros` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `result_checks` (
	`result_id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`source_text` text NOT NULL,
	`target_text` text NOT NULL,
	`evidence` text NOT NULL,
	`demo` integer NOT NULL,
	`report` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX glossary_term_identity ON glossary_terms(user_id,language,source);
--> statement-breakpoint
CREATE INDEX issues_owner_status ON issues(user_id,status,updated_at);
--> statement-breakpoint
CREATE INDEX costs_job_category ON cost_entries(job_id,category);
