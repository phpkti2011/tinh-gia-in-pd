import { supabase } from '../../../lib/supabaseClient';

// Đọc bảng giá bao thư và KTS trong cùng một lượt, không dùng cache thay giá máy chủ.
export async function readEnvelopePrices() {
    if (!supabase) throw new Error('Chưa kết nối được máy chủ bảng giá.');
    const { data, error } = await supabase
        .from('price_configs')
        .select('module, data, current_version, schema_version')
        .in('module', ['envelope', 'small-print'])
        .abortSignal(AbortSignal.timeout(10000));
    if (error) throw new Error(error.message);
    if (!Array.isArray(data)) throw new Error('Máy chủ chưa trả về bảng giá.');
    return data;
}

// RPC riêng có kiểm tra phiên bản (docs/database/migration-envelope-module.sql).
export async function publishEnvelopePrices(data, schemaVersion, expectedVersion) {
    if (!supabase) throw new Error('Chưa kết nối được máy chủ bảng giá.');
    const { data: result, error } = await supabase
        .rpc('save_envelope_price_config', {
            p_data: data,
            p_schema_version: schemaVersion,
            p_expected_version: expectedVersion,
        })
        .abortSignal(AbortSignal.timeout(10000));
    if (error) throw new Error(error.message);
    if (!result?.ok) throw new Error('Máy chủ chưa xác nhận lưu bảng giá.');
    return result;
}
