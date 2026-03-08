ALTER TABLE `videos` ADD `generatedVideoUrl` varchar(1000);--> statement-breakpoint
ALTER TABLE `videos` ADD `generatedVideoPrompt` text;--> statement-breakpoint
ALTER TABLE `videos` ADD `generatedVideoStyle` varchar(200);--> statement-breakpoint
ALTER TABLE `videos` ADD `generatedVideoDuration` int;--> statement-breakpoint
ALTER TABLE `videos` ADD `generatedVideoSaved` boolean DEFAULT false;