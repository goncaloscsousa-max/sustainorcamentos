CREATE TABLE `analises_ia` (
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
	CONSTRAINT "analises_tipo_check" CHECK("analises_ia"."tipo" IN ('extracao_trabalhos', 'riscos', 'sugestao_preco'))
);
--> statement-breakpoint
CREATE INDEX `analises_orcamento_idx` ON `analises_ia` (`orcamento_id`);--> statement-breakpoint
CREATE TABLE `clientes` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`nif` text,
	`email` text,
	`telefone` text,
	`morada` text,
	`notas` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `execucao_obra` (
	`id` text PRIMARY KEY NOT NULL,
	`obra_id` text NOT NULL,
	`data_inicio_real` text,
	`data_conclusao_real` text,
	`custo_real_total_cents` integer,
	`faturacao_real_total_cents` integer,
	`margem_real_bps` integer,
	`notas` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`obra_id`) REFERENCES `obras`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `execucao_obra_obra_id_unique` ON `execucao_obra` (`obra_id`);--> statement-breakpoint
CREATE TABLE `ficheiros_obra` (
	`id` text PRIMARY KEY NOT NULL,
	`obra_id` text NOT NULL,
	`tipo` text NOT NULL,
	`nome_original` text NOT NULL,
	`storage_path` text NOT NULL,
	`mime_type` text,
	`tamanho_bytes` integer,
	`uploaded_at` integer NOT NULL,
	FOREIGN KEY (`obra_id`) REFERENCES `obras`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ficheiros_tipo_check" CHECK("ficheiros_obra"."tipo" IN ('foto_estado_atual', 'mtq', 'projeto_3d', 'projeto_eletricidade', 'projeto_hidraulica', 'projeto_carpintaria', 'projeto_avac', 'outro'))
);
--> statement-breakpoint
CREATE INDEX `ficheiros_obra_idx` ON `ficheiros_obra` (`obra_id`);--> statement-breakpoint
CREATE TABLE `linhas_orcamento` (
	`id` text PRIMARY KEY NOT NULL,
	`orcamento_id` text NOT NULL,
	`categoria` text NOT NULL,
	`ordem` integer NOT NULL,
	`descricao` text NOT NULL,
	`unidade` text NOT NULL,
	`quantidade` real NOT NULL,
	`preco_cliente_unit_cents` integer NOT NULL,
	`custo_interno_unit_cents` integer,
	`total_cliente_cents` integer DEFAULT 0 NOT NULL,
	`total_custo_interno_cents` integer DEFAULT 0 NOT NULL,
	`origem` text DEFAULT 'manual' NOT NULL,
	`tabela_preco_id` text,
	`notas` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`orcamento_id`) REFERENCES `orcamentos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tabela_preco_id`) REFERENCES `tabela_precos`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "linhas_origem_check" CHECK("linhas_orcamento"."origem" IN ('tabela', 'ia_sugestao', 'manual'))
);
--> statement-breakpoint
CREATE INDEX `linhas_orcamento_idx` ON `linhas_orcamento` (`orcamento_id`);--> statement-breakpoint
CREATE TABLE `obras` (
	`id` text PRIMARY KEY NOT NULL,
	`cliente_id` text NOT NULL,
	`referencia` text NOT NULL,
	`titulo` text NOT NULL,
	`morada_obra` text NOT NULL,
	`tipo` text NOT NULL,
	`estado` text DEFAULT 'orcamentado' NOT NULL,
	`data_visita` text,
	`data_inicio_prevista` text,
	`data_conclusao_prevista` text,
	`notas` text,
	`criado_por` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`criado_por`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "obras_tipo_check" CHECK("obras"."tipo" IN ('remodelacao_total', 'remodelacao_parcial', 'cozinha', 'wc', 'exterior', 'comercial', 'outro')),
	CONSTRAINT "obras_estado_check" CHECK("obras"."estado" IN ('orcamentado', 'adjudicado', 'em_execucao', 'concluido', 'perdido', 'cancelado'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `obras_referencia_unique` ON `obras` (`referencia`);--> statement-breakpoint
CREATE INDEX `obras_cliente_idx` ON `obras` (`cliente_id`);--> statement-breakpoint
CREATE INDEX `obras_estado_idx` ON `obras` (`estado`);--> statement-breakpoint
CREATE TABLE `orcamentos` (
	`id` text PRIMARY KEY NOT NULL,
	`obra_id` text NOT NULL,
	`versao` integer DEFAULT 1 NOT NULL,
	`estado` text DEFAULT 'rascunho' NOT NULL,
	`data_emissao` text NOT NULL,
	`validade_dias` integer DEFAULT 30 NOT NULL,
	`iva_percentagem_bps` integer DEFAULT 2300 NOT NULL,
	`subtotal_cents` integer DEFAULT 0 NOT NULL,
	`iva_total_cents` integer DEFAULT 0 NOT NULL,
	`total_cents` integer DEFAULT 0 NOT NULL,
	`custo_interno_total_cents` integer DEFAULT 0 NOT NULL,
	`margem_teorica_bps` integer DEFAULT 0 NOT NULL,
	`condicoes_pagamento` text DEFAULT '40% início / 40% meio de obra / 20% conclusão' NOT NULL,
	`observacoes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`obra_id`) REFERENCES `obras`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "orcamentos_estado_check" CHECK("orcamentos"."estado" IN ('rascunho', 'enviado', 'aprovado', 'rejeitado', 'substituido'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orcamentos_obra_versao_idx` ON `orcamentos` (`obra_id`,`versao`);--> statement-breakpoint
CREATE TABLE `riscos_identificados` (
	`id` text PRIMARY KEY NOT NULL,
	`orcamento_id` text NOT NULL,
	`descricao` text NOT NULL,
	`severidade` text NOT NULL,
	`impacto_estimado` text,
	`custo_adicional_estimado_cents` integer,
	`recomendacao` text,
	`fonte` text,
	`resolvido` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`orcamento_id`) REFERENCES `orcamentos`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "riscos_severidade_check" CHECK("riscos_identificados"."severidade" IN ('baixa', 'media', 'alta'))
);
--> statement-breakpoint
CREATE INDEX `riscos_orcamento_idx` ON `riscos_identificados` (`orcamento_id`);--> statement-breakpoint
CREATE TABLE `tabela_precos` (
	`id` text PRIMARY KEY NOT NULL,
	`codigo` text NOT NULL,
	`categoria` text NOT NULL,
	`descricao` text NOT NULL,
	`unidade` text NOT NULL,
	`preco_cliente_base_cents` integer NOT NULL,
	`custo_interno_base_cents` integer,
	`rendimento_diario` real,
	`observacoes` text,
	`ativo` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tabela_precos_codigo_unique` ON `tabela_precos` (`codigo`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'admin' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "users_role_check" CHECK("users"."role" IN ('admin', 'orcamentista', 'gestor'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);