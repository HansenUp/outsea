CREATE UNIQUE INDEX `pilot_orders_receipt_unique` ON `pilot_orders` (`receipt`);--> statement-breakpoint
CREATE UNIQUE INDEX `pilot_refunds_receipt_unique` ON `pilot_refunds` (`receipt`);--> statement-breakpoint
CREATE TRIGGER pilot_refund_limit BEFORE INSERT ON pilot_refunds BEGIN
 SELECT CASE WHEN (SELECT status FROM pilot_orders WHERE id=NEW.order_id) NOT IN ('paid','delivered','part_refunded') OR NEW.amount<=0 OR COALESCE((SELECT SUM(amount) FROM pilot_refunds WHERE order_id=NEW.order_id),0)+NEW.amount>(SELECT amount FROM pilot_orders WHERE id=NEW.order_id) THEN RAISE(ABORT,'refund exceeds received amount') END;
END;
