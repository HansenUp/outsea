CREATE TABLE `credit_allocations` (
	`result_id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`user_id` text NOT NULL,
	`pool` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `credit_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`pool` text NOT NULL,
	`amount` integer NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `credit_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`credits` integer NOT NULL,
	`amount` integer NOT NULL,
	`package_id` text NOT NULL,
	`status` text NOT NULL,
	`receipt` text,
	`created_at` integer NOT NULL,
	`confirmed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credit_orders_receipt_unique` ON `credit_orders` (`receipt`);--> statement-breakpoint
CREATE INDEX credit_user_pool ON credit_allocations(user_id,pool,status);
--> statement-breakpoint
CREATE INDEX credit_entry_user ON credit_entries(user_id,pool);
--> statement-breakpoint
CREATE UNIQUE INDEX credit_pending_user ON credit_orders(user_id) WHERE status='pending';
--> statement-breakpoint
CREATE TRIGGER credit_reserve_insert BEFORE INSERT ON credit_allocations WHEN NEW.status='held' BEGIN
SELECT CASE WHEN NEW.amount<1 OR NEW.pool NOT IN ('free','paid') OR
COALESCE((SELECT SUM(amount) FROM credit_entries WHERE user_id=NEW.user_id AND pool=NEW.pool),0)-COALESCE((SELECT SUM(amount) FROM credit_allocations WHERE user_id=NEW.user_id AND pool=NEW.pool AND status IN ('held','spent') AND result_id<>NEW.result_id),0)<NEW.amount
THEN RAISE(ABORT,'CREDITS_INSUFFICIENT') END;
SELECT CASE WHEN NEW.pool='free' AND ((SELECT kind FROM jobs WHERE id=NEW.job_id)<>'image' OR (SELECT COUNT(DISTINCT job_id) FROM credit_allocations WHERE user_id=NEW.user_id AND pool='free' AND status IN ('held','spent') AND job_id<>NEW.job_id)>=3) THEN RAISE(ABORT,'FREE_IMAGE_LIMIT') END;
END;
--> statement-breakpoint
CREATE TRIGGER credit_reserve_update BEFORE UPDATE ON credit_allocations WHEN NEW.status='held' AND OLD.status='released' BEGIN
SELECT CASE WHEN NEW.amount<1 OR NEW.pool NOT IN ('free','paid') OR
COALESCE((SELECT SUM(amount) FROM credit_entries WHERE user_id=NEW.user_id AND pool=NEW.pool),0)-COALESCE((SELECT SUM(amount) FROM credit_allocations WHERE user_id=NEW.user_id AND pool=NEW.pool AND status IN ('held','spent') AND result_id<>NEW.result_id),0)<NEW.amount THEN RAISE(ABORT,'CREDITS_INSUFFICIENT') END;
SELECT CASE WHEN NEW.pool='free' AND ((SELECT kind FROM jobs WHERE id=NEW.job_id)<>'image' OR (SELECT COUNT(DISTINCT job_id) FROM credit_allocations WHERE user_id=NEW.user_id AND pool='free' AND status IN ('held','spent') AND job_id<>NEW.job_id)>=3) THEN RAISE(ABORT,'FREE_IMAGE_LIMIT') END;
END;
