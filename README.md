# SQL Manager

A DeepSeek Harness plugin that keeps reusable SQL grouped by system. **Every system must have its own JSON storage path**; systems can live in different folders. The page searches notes, table names, field names, and raw SQL text.

Repository: <https://github.com/sijunmanyue/dsh-plugin-sql-manager>

## Install

```bash
git clone https://github.com/sijunmanyue/dsh-plugin-sql-manager.git
```

Then install the cloned directory as a DSH bundle through the Plugin Manager (or `plugin_manager install_bundle` with the absolute directory path), and enable **SQL Manager** if it is not enabled automatically.

## Use

1. Open **SQL Manager** from the sidebar.
2. Create a system and fill in its required **Storage path**:
   - a JSON file path such as `D:\SQL\crm.json`, or
   - a folder path such as `D:\SQL\crm`; the plugin creates `<system-id>.json` inside it.
3. Add SQL to the system.
4. Search by a note such as `客服`, a table such as `t_user`, or a field such as `user_id`.

Editing a system path moves its existing JSON file to the new location. If the entered path already points at a valid system JSON, that file is imported instead of overwritten.

The page also exposes the same library through the `sql_manager` agent tool (`search`, `list_systems`, `add`, `update`, `delete`, `create_system`, `update_system`, `delete_system`).

## Storage

Each system is one self-contained JSON file. A small registry at `$DSH_HOME/sql-manager/systems.json` remembers the path of every system; it is an index, not a global storage folder. `DSH_HOME` defaults to `~/.dsh`.

The suggested folder is `$DSH_HOME/sql-manager/sqls`, but it is only a convenience for new systems; each system path is stored and edited separately.

A system file follows this shape:

```json
{
  "schema": "dsh.sql-manager.system/v1",
  "id": "crm",
  "name": "CRM 订单系统",
  "description": "订单域",
  "path": "D:\\SQL\\crm.json",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "sqls": [
    {
      "id": "sql-0123456789ab",
      "name": "按手机号查用户",
      "remark": "客服常用；按手机号精确查询",
      "sql": "SELECT u.id, u.mobile FROM t_user u WHERE u.mobile = ?",
      "tables": ["t_user"],
      "fields": ["id", "mobile"],
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

`path` is descriptive; the registry is authoritative. `tables` and `fields` are refreshed from the SQL text whenever the file is read, so hand-editing the SQL keeps search accurate. A missing or unreadable system file is shown as a broken system with an **Edit path** action, so it can be repaired or removed.

If an older installation used one global storage folder, the first run with no registry scans the legacy `settings.json` folder, `SQL_MANAGER_DIR`, and the suggested folder, then registers those system JSONs automatically.

## Notes

- The HTTP API is `/api/sql-manager` and accepts loopback requests only.
- Deleting a system removes its JSON file and registry entry.
- There is no global storage folder setting.
