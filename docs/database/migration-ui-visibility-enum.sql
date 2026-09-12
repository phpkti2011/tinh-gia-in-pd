-- Migration: thêm 'ui-visibility' vào CHECK enum cot module cua 3 bang price config.
--
-- TAI SAO CAN FILE RIENG:
--   docs/database/supabase-price-configs.sql da co 'ui-visibility' trong ca 4 cho, NHUNG chay
--   lai file do KHONG sua duoc DB dang chay: `create table if not exists` bo qua bang da ton tai
--   nen rang buoc CHECK cu van nguyen. (Rieng function save_price_config thi `create or replace`
--   nen no CO duoc cap nhat khi chay lai file goc.)
--
-- TAC DUNG: mo khoa dong bo dam may cho config 'ui-visibility' — gom ca an/hien tile LAN
--   ten module (MODULE_LABELS). Chua chay thi tinh nang van hoat dong nhung chi luu localStorage,
--   moi trinh duyet giu mot ban rieng.
--
-- Cach chay: copy toan bo file -> Supabase Dashboard -> SQL Editor -> Run.
-- Idempotent: chay lai nhieu lan khong pha data.
--
-- Ten rang buoc: 3 CHECK nay khai bao inline khong dat ten, nen Postgres tu dat theo quy uoc
-- <table>_<column>_check. Kiem tra truoc khi chay neu khong chac:
--   select conrelid::regclass as tbl, conname
--   from pg_constraint
--   where conrelid in (
--       'public.price_configs'::regclass,
--       'public.price_config_versions'::regclass,
--       'public.price_change_logs'::regclass
--   ) and contype = 'c';

begin;

alter table public.price_configs
    drop constraint if exists price_configs_module_check;
alter table public.price_configs
    add constraint price_configs_module_check
    check (module in ('decal','small-print','large-print','uvdtf','catalogue','spiral','sticker','card','flyer','cheapdecal','ui-visibility'));

alter table public.price_config_versions
    drop constraint if exists price_config_versions_module_check;
alter table public.price_config_versions
    add constraint price_config_versions_module_check
    check (module in ('decal','small-print','large-print','uvdtf','catalogue','spiral','sticker','card','flyer','cheapdecal','ui-visibility'));

alter table public.price_change_logs
    drop constraint if exists price_change_logs_module_check;
alter table public.price_change_logs
    add constraint price_change_logs_module_check
    check (module in ('decal','small-print','large-print','uvdtf','catalogue','spiral','sticker','card','flyer','cheapdecal','ui-visibility'));

commit;

-- ============================================================================
-- Verify (login bang tai khoan admin)
-- ============================================================================
-- select public.save_price_config(
--     'ui-visibility'::text,
--     '{"MODULE_VISIBILITY":{"small":true},"MODULE_LABELS":{"small":{"title":"Test"}}}'::jsonb,
--     '1.1.0'::text,
--     'test enum ui-visibility'::text
-- );
-- -- Expect: {"ok": true, "module": "ui-visibility", "new_version": 1, "action": "create"}
--
-- Truoc khi chay migration, cau lenh tren se bao:
--   ERROR: new row for relation "price_config_versions" violates check constraint
