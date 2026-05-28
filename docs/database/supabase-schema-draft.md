# Supabase schema draft

Bảng đề xuất:

```sql
price_configs
- id
- module
- active_version
- data jsonb
- created_at
- updated_at

price_config_versions
- id
- module
- version
- data jsonb
- created_by
- note
- created_at

price_change_logs
- id
- module
- changed_by
- old_data jsonb
- new_data jsonb
- note
- created_at

user_roles
- user_id
- role
- created_at
```

Role đề xuất:

```txt
admin: đọc/ghi bảng giá, publish, rollback.
staff: đọc bảng giá, tính giá.
viewer: chỉ xem nếu cần.
```
