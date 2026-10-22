CREATE TABLE `acquisition_visits` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`medium` text NOT NULL,
	`campaign` text NOT NULL,
	`content` text NOT NULL,
	`referrer` text NOT NULL,
	`demo` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `campaign_costs` (
	`expense_id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`campaign` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `credit_lots` (
	`id` text PRIMARY KEY NOT NULL,
	`result_id` text NOT NULL,
	`order_id` text NOT NULL,
	`credits` integer NOT NULL,
	`revenue_micros` integer NOT NULL,
	`basis` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `operational_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`reference` text NOT NULL,
	`digest` text NOT NULL,
	`note` text NOT NULL,
	`demo` integer NOT NULL,
	`actor_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `result_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`issue_id` text NOT NULL,
	`result_id` text NOT NULL,
	`job_id` text NOT NULL,
	`version` integer NOT NULL,
	`key` text,
	`mime` text NOT NULL,
	`name` text NOT NULL,
	`source_hash` text NOT NULL,
	`note` text NOT NULL,
	`status` text NOT NULL,
	`actor_id` text NOT NULL,
	`review_note` text,
	`created_at` integer NOT NULL,
	`reviewed_at` integer
);
--> statement-breakpoint
CREATE TABLE `runtime_events` (
	`id` text PRIMARY KEY NOT NULL,
	`severity` text NOT NULL,
	`kind` text NOT NULL,
	`detail` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_acquisition` (
	`user_id` text PRIMARY KEY NOT NULL,
	`visit_id` text NOT NULL,
	`source` text NOT NULL,
	`medium` text NOT NULL,
	`campaign` text NOT NULL,
	`content` text NOT NULL,
	`registered` integer NOT NULL,
	`demo` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX revision_result_version ON result_revisions(result_id,version);
--> statement-breakpoint
CREATE INDEX revision_issue ON result_revisions(issue_id,created_at);
--> statement-breakpoint
CREATE INDEX credit_lots_order ON credit_lots(order_id);
--> statement-breakpoint
CREATE INDEX acquisition_cohort ON user_acquisition(source,campaign,created_at);
--> statement-breakpoint
CREATE TRIGGER credit_lot_guard BEFORE INSERT ON credit_lots BEGIN
SELECT CASE WHEN NEW.credits<1 OR NOT EXISTS(SELECT 1 FROM credit_allocations a JOIN credit_orders o ON o.user_id=a.user_id WHERE a.result_id=NEW.result_id AND a.pool='paid' AND a.status IN ('held','spent') AND o.id=NEW.order_id) OR NEW.credits+COALESCE((SELECT SUM(l.credits) FROM credit_lots l JOIN credit_allocations a ON a.result_id=l.result_id WHERE l.order_id=NEW.order_id AND a.status IN ('held','spent')),0)>(SELECT credits-COALESCE((SELECT SUM(credits) FROM credit_refunds WHERE order_id=NEW.order_id),0) FROM credit_orders WHERE id=NEW.order_id) THEN RAISE(ABORT,'LOT_CAPACITY') END;
END;
--> statement-breakpoint
CREATE TRIGGER credit_refund_lot_guard BEFORE INSERT ON credit_refunds BEGIN
SELECT CASE WHEN NEW.credits+COALESCE((SELECT SUM(credits) FROM credit_refunds WHERE order_id=NEW.order_id),0)+COALESCE((SELECT SUM(l.credits) FROM credit_lots l JOIN credit_allocations a ON a.result_id=l.result_id WHERE l.order_id=NEW.order_id AND a.status IN ('held','spent')),0)>(SELECT credits FROM credit_orders WHERE id=NEW.order_id) THEN RAISE(ABORT,'ORDER_CREDITS_CONSUMED') END;
END;
