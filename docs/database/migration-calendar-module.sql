-- Bổ sung riêng module calendar, không sửa dữ liệu/bảng giá của module cũ.
-- Chạy thủ công bằng SQL Editor khi triển khai đồng bộ lịch lên Supabase.
-- Giữ nguyên biểu thức CHECK cũ và thân RPC (bao gồm kiểm tra quyền admin).
begin;
do $migration$
declare
    tbl text;
    constraint_name text;
    old_expression text;
    function_oid oid;
    function_body text;
    patched_body text;
begin
    foreach tbl in array array['price_configs','price_config_versions','price_change_logs'] loop
        constraint_name := tbl || '_module_check';
        select pg_get_expr(conbin,conrelid) into old_expression
        from pg_constraint
        where conrelid = ('public.' || tbl)::regclass and conname = constraint_name and contype = 'c';
        if old_expression is null then
            raise exception 'Thiếu CHECK %. Dừng để kiểm tra schema trước.', constraint_name;
        end if;
        if position('''calendar''' in old_expression) = 0 then
            execute format('alter table public.%I drop constraint %I',tbl,constraint_name);
            execute format('alter table public.%I add constraint %I check ((%s) or module = ''calendar'')',tbl,constraint_name,old_expression);
        end if;
    end loop;
    select p.oid into strict function_oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='public' and p.proname='save_price_config';
    function_body := pg_get_functiondef(function_oid);
    if position('''calendar''' in function_body) = 0 then
        patched_body := regexp_replace(function_body,
            '(if\s+p_module\s+not\s+in\s*\([^)]*)\)', E'\\1,''calendar'')', 'i');
        if patched_body = function_body then
            raise exception 'Không nhận diện được danh sách module trong RPC. Dừng; không đổi kiểm tra quyền.';
        end if;
        execute patched_body;
    end if;
end;
$migration$;
commit;

-- Sau triển khai: đăng nhập admin, lưu cài đặt lịch; phải có thông báo đồng bộ thành công.
-- Chưa chạy migration: module vẫn tính bằng cấu hình local, báo rõ lỗi đồng bộ khi lưu.
