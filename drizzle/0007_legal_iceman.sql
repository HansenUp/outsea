CREATE TABLE `credit_refunds` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`credits` integer NOT NULL,
	`amount` integer NOT NULL,
	`receipt` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credit_refunds_receipt_unique` ON `credit_refunds` (`receipt`);--> statement-breakpoint
CREATE TRIGGER credit_debit_guard BEFORE INSERT ON credit_entries WHEN NEW.amount<0 BEGIN
SELECT CASE WHEN NEW.pool<>'paid' OR COALESCE((SELECT SUM(amount) FROM credit_entries WHERE user_id=NEW.user_id AND pool='paid'),0)-COALESCE((SELECT SUM(amount) FROM credit_allocations WHERE user_id=NEW.user_id AND pool='paid' AND status IN ('held','spent')),0)+NEW.amount<0 THEN RAISE(ABORT,'CREDITS_INSUFFICIENT') END;
END;
--> statement-breakpoint
CREATE TRIGGER credit_refund_guard BEFORE INSERT ON credit_refunds BEGIN
SELECT CASE WHEN NEW.credits<1 OR NEW.amount<1 OR NOT EXISTS(SELECT 1 FROM credit_orders WHERE id=NEW.order_id AND status IN ('paid','part_refunded')) OR COALESCE((SELECT SUM(credits) FROM credit_refunds WHERE order_id=NEW.order_id),0)+NEW.credits>(SELECT credits FROM credit_orders WHERE id=NEW.order_id) OR NEW.amount+COALESCE((SELECT SUM(amount) FROM credit_refunds WHERE order_id=NEW.order_id),0)<>(SELECT CAST(amount*(NEW.credits+COALESCE((SELECT SUM(credits) FROM credit_refunds WHERE order_id=NEW.order_id),0)) / credits AS INTEGER) FROM credit_orders WHERE id=NEW.order_id) THEN RAISE(ABORT,'REFUND_INVALID') END;
END;
--> statement-breakpoint
CREATE TRIGGER credit_receipt_guard BEFORE UPDATE OF receipt ON credit_orders WHEN NEW.receipt IS NOT NULL BEGIN
SELECT CASE WHEN EXISTS(SELECT 1 FROM pilot_orders WHERE receipt=NEW.receipt) THEN RAISE(ABORT,'RECEIPT_USED') END;
END;
--> statement-breakpoint
CREATE TRIGGER pilot_credit_receipt_guard BEFORE UPDATE OF receipt ON pilot_orders WHEN NEW.receipt IS NOT NULL BEGIN
SELECT CASE WHEN EXISTS(SELECT 1 FROM credit_orders WHERE receipt=NEW.receipt) THEN RAISE(ABORT,'RECEIPT_USED') END;
END;
