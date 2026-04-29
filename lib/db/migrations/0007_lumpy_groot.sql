PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_analises_ia` (
	`id` text PRIMARY KEY NOT NULL,
	`orcamento_id` text NOT NULL,
	`tipo` text NOT NULL,
	`input_resumo` text,
	`output_raw` text,
	`tokens_input` integer,
	`tokens_output` integer,
	`custo_estimado_cents` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`orcamento_id`) REFERENCES `orcamentos`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "analises_tipo_check" CHECK("__new_analises_ia"."tipo" IN ('extracao_trabalhos', 'riscos', 'sugestao_preco', 'sugestao_materiais'))
);
--> statement-breakpoint
INSERT INTO `__new_analises_ia`("id", "orcamento_id", "tipo", "input_resumo", "output_raw", "tokens_input", "tokens_output", "custo_estimado_cents", "created_at") SELECT "id", "orcamento_id", "tipo", "input_resumo", "output_raw", "tokens_input", "tokens_output", "custo_estimado_cents", "created_at" FROM `analises_ia`;--> statement-breakpoint
DROP TABLE `analises_ia`;--> statement-breakpoint
ALTER TABLE `__new_analises_ia` RENAME TO `analises_ia`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `analises_orcamento_idx` ON `analises_ia` (`orcamento_id`);