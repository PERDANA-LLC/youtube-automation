CREATE TABLE `analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`videoId` int,
	`date` timestamp NOT NULL,
	`views` int DEFAULT 0,
	`likes` int DEFAULT 0,
	`comments` int DEFAULT 0,
	`shares` int DEFAULT 0,
	`watchTimeMinutes` float DEFAULT 0,
	`avgRetentionPercent` float DEFAULT 0,
	`cpm` float DEFAULT 0,
	`estimatedRevenue` float DEFAULT 0,
	`subscribers` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(255) NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`entityId` int,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calendarEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`videoId` int,
	`title` varchar(500) NOT NULL,
	`description` text,
	`eventType` enum('upload','deadline','review','milestone') NOT NULL DEFAULT 'upload',
	`scheduledAt` timestamp NOT NULL,
	`googleCalendarEventId` varchar(255),
	`isCompleted` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `calendarEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contentIdeas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nicheId` int,
	`title` varchar(500) NOT NULL,
	`description` text,
	`source` varchar(100),
	`sourceUrl` varchar(1000),
	`viralScore` int,
	`keywords` json,
	`isUsed` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contentIdeas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `niches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100) NOT NULL,
	`subNiche` varchar(255),
	`cpmMin` float,
	`cpmMax` float,
	`competitionLevel` enum('low','medium','high'),
	`trendScore` int,
	`profitabilityScore` int,
	`automationScore` int,
	`rationale` text,
	`keywords` json,
	`isSelected` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `niches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `revenue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`source` enum('adsense','affiliate','sponsorship','merchandise','other') NOT NULL,
	`amount` float NOT NULL,
	`currency` varchar(3) DEFAULT 'USD',
	`description` text,
	`videoId` int,
	`date` timestamp NOT NULL,
	`stripePaymentId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `revenue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `videos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nicheId` int,
	`title` varchar(500) NOT NULL,
	`description` text,
	`status` enum('idea','researching','scripting','voiceover','thumbnail','seo','scheduled','published') NOT NULL DEFAULT 'idea',
	`videoType` enum('short','long') NOT NULL DEFAULT 'short',
	`scriptContent` text,
	`scriptWordCount` int,
	`voiceoverUrl` varchar(1000),
	`voiceoverVoice` varchar(100),
	`thumbnailUrl` varchar(1000),
	`thumbnailPrompt` text,
	`seoTitle` varchar(500),
	`seoDescription` text,
	`seoTags` json,
	`seoScore` int,
	`scheduledAt` timestamp,
	`publishedAt` timestamp,
	`researchData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `videos_id` PRIMARY KEY(`id`)
);
