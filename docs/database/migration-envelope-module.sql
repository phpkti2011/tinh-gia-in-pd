-- Bổ sung riêng module envelope (bao thư), không sửa dữ liệu/bảng giá của module cũ.
-- Chạy thủ công bằng SQL Editor khi triển khai đồng bộ bao thư lên Supabase.
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
        if position('''envelope''' in old_expression) = 0 then
            execute format('alter table public.%I drop constraint %I',tbl,constraint_name);
            execute format('alter table public.%I add constraint %I check ((%s) or module = ''envelope'')',tbl,constraint_name,old_expression);
        end if;
    end loop;
    select p.oid into strict function_oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='public' and p.proname='save_price_config';
    function_body := pg_get_functiondef(function_oid);
    if position('''envelope''' in function_body) = 0 then
        patched_body := regexp_replace(function_body,
            '(if\s+p_module\s+not\s+in\s*\([^)]*)\)', E'\\1,''envelope'')', 'i');
        if patched_body = function_body then
            raise exception 'Không nhận diện được danh sách module trong RPC. Dừng; không đổi kiểm tra quyền.';
        end if;
        execute patched_body;
    end if;
end;
$migration$;

-- Lưu riêng bao thư có kiểm tra phiên bản: an toàn khi tự gửi lại sau mất mạng.
-- Không thay chữ ký/cách lưu của các module cũ.
create or replace function public.save_envelope_price_config(
    p_data jsonb,
    p_schema_version text,
    p_expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $envelope_save$
declare
    v_current public.price_configs%rowtype;
begin
    if not public.is_admin() then
        raise exception 'forbidden: admin role required' using errcode = '42501';
    end if;
    if p_expected_version is null or p_expected_version < 0 or
       p_data is null or jsonb_typeof(p_data) <> 'object' or
       p_schema_version is null or p_schema_version not in ('1.0.0') then
        raise exception 'invalid envelope price payload' using errcode = '22023';
    end if;
    -- Khóa cả lần lưu đầu tiên, khi chưa có hàng hiện tại.
    perform pg_advisory_xact_lock(hashtextextended('envelope-price-config', 0));
    select * into v_current from public.price_configs where module = 'envelope' for update;
    -- Phản hồi có thể mất sau khi commit: gửi lại y hệt không tạo tác dụng phụ mới.
    if v_current.data = p_data and v_current.schema_version = p_schema_version then
        return jsonb_build_object('ok', true, 'new_version', v_current.current_version);
    end if;
    if coalesce(v_current.current_version, 0) <> p_expected_version then
        raise exception 'envelope_version_conflict' using errcode = '40001';
    end if;
    return public.save_price_config('envelope', p_data, p_schema_version, 'Envelope synchronized save');
end;
$envelope_save$;

revoke all on function public.save_envelope_price_config(jsonb, text, integer) from public, anon;
grant execute on function public.save_envelope_price_config(jsonb, text, integer) to authenticated;
notify pgrst, 'reload schema';
commit;

-- Sau triển khai: đăng nhập admin, mở Tính Giá Bao Thư → Cài Đặt, lưu bảng giá lần đầu;
-- phải có thông báo đồng bộ thành công. Chưa chạy migration hoặc chưa có giá trên máy chủ:
-- module chặn báo giá, giữ nháp để tự thử lại.
