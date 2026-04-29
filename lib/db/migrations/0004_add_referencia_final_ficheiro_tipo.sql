PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ficheiros_obra` (
	`id` text PRIMARY KEY NOT NULL,
	`obra_id` text NOT NULL,
	`tipo` text NOT NULL,
	`nome_original` text NOT NULL,
	`storage_path` text NOT NULL,
	`mime_type` text,
	`tamanho_bytes` integer,
	`uploaded_at` integer NOT NULL,
	FOREIGN KEY (`obra_id`) REFERENCES `obras`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ficheiros_tipo_check" CHECK("__new_ficheiros_obra"."tipo" IN ('foto_estado_atual', 'referencia_final', 'mtq', 'projeto_3d', 'projeto_eletricidade', 'projeto_hidraulica', 'projeto_carpintaria', 'projeto_avac', 'outro'))
);
--> statement-breakpoint
INSERT INTO `__new_ficheiros_obra`("id", "obra_id", "tipo", "nome_original", "storage_path", "mime_type", "tamanho_bytes", "uploaded_at") SELECT "id", "obra_id", "tipo", "nome_original", "storage_path", "mime_type", "tamanho_bytes", "uploaded_at" FROM `ficheiros_obra`;--> statement-breakpoint
DROP TABLE `ficheiros_obra`;--> statement-breakpoint
ALTER TABLE `__new_ficheiros_obra` RENAME TO `ficheiros_obra`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `ficheiros_obra_idx` ON `ficheiros_obra` (`obra_id`);