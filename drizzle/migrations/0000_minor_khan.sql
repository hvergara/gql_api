CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`external_id` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `user_name_idx` ON `user` (`name`);