-- Diagnóstico rápido: triggers sobre customers y funciones con >>
SELECT t.tgname AS trigger_name,
       c.relname AS table_name,
       n.nspname AS schema_name,
       p.proname AS function_name,
       pg_get_functiondef(p.oid) AS function_def
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal
  AND n.nspname = 'public'
  AND c.relname = 'customers';

SELECT n.nspname, p.proname, pg_get_functiondef(p.oid) AS function_def
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f' -- solo funciones normales (evita aggregates como array_agg)
  AND pg_get_functiondef(p.oid) ILIKE '%>>%';
