/**
 * Client half of SQL Manager.
 *
 * A main-panel page plus a sidebar entry:
 *   sidebar.panellist -> menu icon, id "sql-manager"
 *   main              -> page, key "sql-manager"
 *
 * All persistence lives in the Host half. This module talks only to the
 * loopback JSON route at /api/sql-manager.
 */

window.__ModuleLoader__.load({
  id: '@local/sql-manager',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useRef, useReducer, useCallback } = React

    const NS = 'sql-manager'
    const API = '/api/sql-manager'
    const PANEL_ID = 'sql-manager'
    const VERSION = '1.1.0'

    const MESSAGES = {
      zh: {
        appTitle: 'SQL 管理器',
        appSubtitle: '按系统维护常用 SQL。每个系统必须维护自己的 JSON 存储路径；搜索会同时匹配备注、SQL 中的表名、字段名和 SQL 文本。',
        jsonStore: '每系统独立 JSON',
        addSql: '添加 SQL',
        addSystem: '新建系统',
        refresh: '刷新',
        systemsTitle: '系统',
        allSql: '全部 SQL',
        noSystems: '还没有系统',
        noSystemsHint: '先创建一个系统，再往里面添加 SQL。',
        independentPaths: '系统路径独立维护',
        registry: '系统注册表',
        searchPlaceholder: '搜索备注、表名、字段名或 SQL…',
        searchHint: '按名称、备注、表名、字段名和 SQL 文本搜索',
        resultCount: '共 {count} 条 SQL',
        resultFiltered: '在「{system}」中共 {count} 条 SQL',
        searchEmptyTitle: '没有匹配的 SQL',
        searchEmptyBody: '换个关键词试试，或清除当前系统筛选。',
        emptyTitle: '还没有 SQL',
        emptyBody: '把常用的 SQL 存进来，之后按备注、表名或字段名就能快速找到。',
        emptySystemTitle: '这个系统还没有 SQL',
        emptySystemBody: '添加第一条 SQL，系统会自动识别其中的表名和字段名。',
        loading: '正在加载…',
        loadFailed: '加载失败',
        retry: '重试',
        issuesTitle: '有文件未能读取',
        issuesHint: '这些 JSON 文件会被跳过，其他系统不受影响。',
        copy: '复制',
        copied: 'SQL 已复制',
        copyFailed: '复制失败，请手动选择 SQL 文本。',
        edit: '编辑',
        delete: '删除',
        save: '保存',
        saving: '保存中…',
        cancel: '取消',
        sqlName: 'SQL 名称',
        sqlNamePlaceholder: '例如：按手机号查询用户',
        remark: '备注',
        remarkPlaceholder: '这条 SQL 用来做什么、什么时候用、有哪些注意点…',
        sqlText: 'SQL 内容',
        sqlPlaceholder: 'SELECT * FROM t_user WHERE mobile = #{mobile};',
        systemLabel: '所属系统',
        createSystemTitle: '新建系统',
        createSystemSubtitle: '每个系统必须填写自己的 JSON 存储路径，可以指向不同文件夹。',
        editSystemTitle: '编辑系统',
        editSystemSubtitle: '修改路径会移动现有 JSON 文件；只改名称和说明时路径保持不变。',
        systemName: '系统名称',
        systemNamePlaceholder: '例如：CRM 订单系统',
        systemDescription: '系统说明（可选）',
        systemDescriptionPlaceholder: '例如：订单中心和售后常用查询',
        pathLabel: '存储路径',
        pathPlaceholder: '例如：D:\\SQL\\crm.json 或 D:\\SQL\\crm',
        pathHint: '必填。可以填 JSON 文件路径；填文件夹时会在其中生成 <系统ID>.json。',
        pathImportHint: '如果路径已存在且是有效的系统 JSON，会导入该文件。',
        pathMoveHint: '修改路径会移动当前系统 JSON 文件。',
        pathRequired: '请填写系统存储路径。',
        suggestedFolder: '建议文件夹',
        useSuggestedFolder: '填入建议文件夹',
        browseFolder: '选择文件夹',
        systemImported: '已导入现有系统 JSON',
        systemPathMoved: '系统路径已更新，JSON 文件已移动',
        systemMissingTitle: '系统文件不可读',
        systemMissingBody: '找不到或无法读取这个系统的 JSON 文件：{path}',
        systemMissingMeta: '文件不可读',
        editPath: '编辑路径',
        noUsableSystem: '没有可用的系统，请先修复系统路径或新建系统。',
        systemFile: '系统 JSON',
        deleteSystemTitle: '删除系统',
        deleteSystemSubtitle: '系统及其中所有 SQL 会从 JSON 文件中移除。',
        deleteSqlTitle: '删除 SQL',
        deleteSqlSubtitle: '这条 SQL 会从所属系统的 JSON 文件中移除。',
        deleteSystemWarning: '确定删除「{name}」吗？其中有 {count} 条 SQL。此操作不可撤销。',
        deleteSqlWarning: '确定删除「{name}」吗？此操作不可撤销。',
        confirmDelete: '确认删除',
        nameRequired: '请填写名称。',
        sqlRequired: '请填写 SQL 内容。',
        systemRequired: '请选择所属系统。',
        detected: '自动识别',
        detectedNone: '暂时没有识别到表名或字段名；仍可保存，搜索会匹配 SQL 文本。',
        parsing: '正在识别…',
        parseHint: '保存时会自动识别表名和字段名，用于之后的搜索。',
        ctrlEnter: 'Ctrl / ⌘ + Enter 保存',
        saveFailed: '保存失败',
        systemCreated: '系统已创建',
        systemUpdated: '系统已更新',
        systemDeleted: '系统已删除',
        sqlAdded: 'SQL 已添加',
        sqlUpdated: 'SQL 已更新',
        sqlDeleted: 'SQL 已删除',
        tablesLabel: '表',
        fieldsLabel: '字段',
        matched: '匹配',
        matchName: '名称',
        matchRemark: '备注',
        matchTable: '表',
        matchField: '字段',
        matchSql: 'SQL',
        matchSystem: '系统',
        updatedAt: '更新于 {date}',
        createdAt: '创建于 {date}',
        noRemark: '未填写备注',
        expand: '展开 SQL',
        collapse: '收起 SQL',
        moreTags: '+{count}',
        search: '搜索',
        clear: '清除',
        close: '关闭',
        selectSystem: '选择系统',
        filterBySystem: '只看这个系统',
        removeFilter: '清除系统筛选',
        deleteSystemAction: '删除系统',
        renameSystem: '重命名系统',
        copySql: '复制 SQL',
        editSql: '编辑 SQL',
        deleteSql: '删除 SQL',
        emptyAdd: '添加 SQL',
        version: '版本',
        unknownError: '发生未知错误。',
        errorNetwork: '无法连接本地 SQL 管理器服务，请确认插件 Host 半边已加载。',
        errorForbidden: '该接口只允许本机页面访问。',
        errorNotFound: '目标不存在，可能已被删除或移动。',
        errorConflict: '名称或存储路径已被占用，请换一个。',
        errorValidation: '输入内容不完整或格式不正确。',
        errorIo: '无法读写系统存储路径，请检查路径和权限。',
        errorRegistry: '系统注册表损坏，请先修复或删除 systems.json。',
        errorBodyTooLarge: '请求内容过大。',
        errorInvalidBody: '请求内容格式不正确。',
        errorUnsupportedMediaType: '请求类型不正确。',
        errorInternal: '服务内部错误。',
        errorRender: '页面渲染失败，请刷新窗口后重试。',
        browseFailed: '无法打开文件夹选择器，请直接输入路径。',
        truncated: '结果较多，仅显示前 {count} 条。',
      },
      en: {
        appTitle: 'SQL Manager',
        appSubtitle: 'Keep reusable SQL per system. Every system must maintain its own JSON storage path; search matches notes, table names, field names, and the SQL text itself.',
        jsonStore: 'One JSON per system',
        addSql: 'Add SQL',
        addSystem: 'New system',
        refresh: 'Refresh',
        systemsTitle: 'Systems',
        allSql: 'All SQL',
        noSystems: 'No systems yet',
        noSystemsHint: 'Create a system first, then add SQL to it.',
        independentPaths: 'Independent system paths',
        registry: 'System registry',
        searchPlaceholder: 'Search notes, table names, field names, or SQL…',
        searchHint: 'Searches name, note, table, field, and SQL text',
        resultCount: '{count} SQL',
        resultFiltered: '{count} SQL in "{system}"',
        searchEmptyTitle: 'No matching SQL',
        searchEmptyBody: 'Try another keyword, or clear the current system filter.',
        emptyTitle: 'No SQL yet',
        emptyBody: 'Save the SQL you reuse, then find it by note, table, or field name.',
        emptySystemTitle: 'This system has no SQL yet',
        emptySystemBody: 'Add the first SQL; its table and field names are detected automatically.',
        loading: 'Loading…',
        loadFailed: 'Could not load',
        retry: 'Retry',
        issuesTitle: 'Some files could not be read',
        issuesHint: 'Those JSON files are skipped; the other systems are unaffected.',
        copy: 'Copy',
        copied: 'SQL copied',
        copyFailed: 'Copy failed; select the SQL text manually.',
        edit: 'Edit',
        delete: 'Delete',
        save: 'Save',
        saving: 'Saving…',
        cancel: 'Cancel',
        sqlName: 'SQL name',
        sqlNamePlaceholder: 'e.g. Find user by mobile',
        remark: 'Note',
        remarkPlaceholder: 'What this SQL does, when to use it, and any caveats…',
        sqlText: 'SQL',
        sqlPlaceholder: 'SELECT * FROM t_user WHERE mobile = #{mobile};',
        systemLabel: 'System',
        createSystemTitle: 'New system',
        createSystemSubtitle: 'Every system must have its own JSON storage path; systems can live in different folders.',
        editSystemTitle: 'Edit system',
        editSystemSubtitle: 'Changing the path moves the existing JSON file. Changing only name or note keeps the path.',
        systemName: 'System name',
        systemNamePlaceholder: 'e.g. CRM orders',
        systemDescription: 'Description (optional)',
        systemDescriptionPlaceholder: 'e.g. Queries used by order support',
        pathLabel: 'Storage path',
        pathPlaceholder: 'e.g. D:\\SQL\\crm.json or D:\\SQL\\crm',
        pathHint: 'Required. Enter a JSON file path, or a folder path where <system-id>.json is created.',
        pathImportHint: 'If the path exists and is a valid system JSON, that file is imported.',
        pathMoveHint: 'Changing the path moves the current system JSON file.',
        pathRequired: 'Enter the system storage path.',
        suggestedFolder: 'Suggested folder',
        useSuggestedFolder: 'Use suggested folder',
        browseFolder: 'Choose folder',
        systemImported: 'Existing system JSON imported',
        systemPathMoved: 'System path updated and JSON file moved',
        systemMissingTitle: 'System file is unreadable',
        systemMissingBody: 'The JSON file for this system is missing or unreadable: {path}',
        systemMissingMeta: 'File unreadable',
        editPath: 'Edit path',
        noUsableSystem: 'No usable system. Repair a system path or create a new system first.',
        systemFile: 'System JSON',
        deleteSystemTitle: 'Delete system',
        deleteSystemSubtitle: 'The system and all its SQL are removed from the JSON file.',
        deleteSqlTitle: 'Delete SQL',
        deleteSqlSubtitle: 'This SQL is removed from the system JSON file.',
        deleteSystemWarning: 'Delete "{name}"? It contains {count} SQL. This cannot be undone.',
        deleteSqlWarning: 'Delete "{name}"? This cannot be undone.',
        confirmDelete: 'Delete',
        nameRequired: 'Enter a name.',
        sqlRequired: 'Enter SQL text.',
        systemRequired: 'Choose a system.',
        detected: 'Detected',
        detectedNone: 'No table or field names detected yet. You can still save; search will match the SQL text.',
        parsing: 'Detecting…',
        parseHint: 'Table and field names are detected when saving and used for search.',
        ctrlEnter: 'Ctrl / ⌘ + Enter to save',
        saveFailed: 'Could not save',
        systemCreated: 'System created',
        systemUpdated: 'System updated',
        systemDeleted: 'System deleted',
        sqlAdded: 'SQL added',
        sqlUpdated: 'SQL updated',
        sqlDeleted: 'SQL deleted',
        tablesLabel: 'Tables',
        fieldsLabel: 'Fields',
        matched: 'Matched',
        matchName: 'name',
        matchRemark: 'note',
        matchTable: 'table',
        matchField: 'field',
        matchSql: 'SQL',
        matchSystem: 'system',
        updatedAt: 'Updated {date}',
        createdAt: 'Created {date}',
        noRemark: 'No note',
        expand: 'Expand SQL',
        collapse: 'Collapse SQL',
        moreTags: '+{count}',
        search: 'Search',
        clear: 'Clear',
        close: 'Close',
        selectSystem: 'Choose a system',
        filterBySystem: 'Filter by this system',
        removeFilter: 'Clear system filter',
        deleteSystemAction: 'Delete system',
        renameSystem: 'Rename system',
        copySql: 'Copy SQL',
        editSql: 'Edit SQL',
        deleteSql: 'Delete SQL',
        emptyAdd: 'Add SQL',
        version: 'Version',
        unknownError: 'An unknown error occurred.',
        errorNetwork: 'Could not reach the local SQL Manager service. Check that the plugin Host half is loaded.',
        errorForbidden: 'This endpoint accepts local page requests only.',
        errorNotFound: 'That item no longer exists; it may have been deleted or moved.',
        errorConflict: 'That name or storage path is already in use.',
        errorValidation: 'The input is incomplete or malformed.',
        errorIo: 'Could not read or write the system storage path. Check the path and permissions.',
        errorRegistry: 'The system registry is corrupted. Repair or remove systems.json first.',
        errorBodyTooLarge: 'The request body is too large.',
        errorInvalidBody: 'The request body is malformed.',
        errorUnsupportedMediaType: 'The request content type is not supported.',
        errorInternal: 'Internal service error.',
        errorRender: 'The page failed to render. Refresh the window and try again.',
        browseFailed: 'Could not open the folder picker; type the path directly.',
        truncated: 'Showing the first {count} results.',
      },
    }

    const ERROR_KEYS = {
      NETWORK: 'errorNetwork',
      FORBIDDEN: 'errorForbidden',
      NOT_FOUND: 'errorNotFound',
      CONFLICT: 'errorConflict',
      VALIDATION: 'errorValidation',
      IO_ERROR: 'errorIo',
      REGISTRY_INVALID: 'errorRegistry',
      BODY_TOO_LARGE: 'errorBodyTooLarge',
      INVALID_BODY: 'errorInvalidBody',
      UNSUPPORTED_MEDIA_TYPE: 'errorUnsupportedMediaType',
      INTERNAL_ERROR: 'errorInternal',
      HTTP_403: 'errorForbidden',
      HTTP_404: 'errorNetwork',
    }

    function isZh(localeId) {
      return String(localeId || '').toLowerCase().startsWith('zh')
    }

    function useLocaleTick(ctx) {
      const [, forceRender] = useReducer((value) => value + 1, 0)
      useEffect(() => ctx.locale.subscribe(forceRender), [ctx])
    }

    function makeTranslator(ctx) {
      const bound = ctx.locale.bind(NS)
      return (key, values) => {
        let text = bound(key)
        if (!text || text === key) {
          const active = String(ctx.locale.getSnapshot().active || '')
          const dictionary = isZh(active) ? MESSAGES.zh : MESSAGES.en
          text = dictionary[key] || MESSAGES.en[key] || key
        }
        if (values && typeof text === 'string') {
          for (const [name, value] of Object.entries(values)) {
            text = text.replaceAll(`{${name}}`, String(value))
          }
        }
        return text
      }
    }

    async function request(path, options = {}) {
      const init = { cache: 'no-store', ...options }
      if (init.body !== undefined && init.body !== null) {
        init.headers = { 'content-type': 'application/json', ...(init.headers || {}) }
      }
      let response
      try {
        response = await fetch(API + path, init)
      } catch (cause) {
        const error = new Error('network request failed')
        error.code = 'NETWORK'
        error.cause = cause
        throw error
      }

      let payload = null
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        try { payload = await response.json() } catch { payload = null }
      }
      if (!response.ok || !payload || payload.ok === false) {
        const error = new Error((payload && payload.message) || `HTTP ${response.status}`)
        error.code = (payload && payload.code) || `HTTP_${response.status}`
        error.status = response.status
        error.detail = payload && payload.detail
        throw error
      }
      return payload
    }

    function formatDate(value, lang) {
      if (!value) return null
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return null
      try {
        return new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
      } catch {
        return date.toLocaleString()
      }
    }

    function errorCopy(error, t) {
      const key = error && error.code ? ERROR_KEYS[error.code] : null
      let message = key ? t(key) : null
      if (!message) {
        message = error && error.code && error.code.startsWith('HTTP_')
          ? t('errorInternal')
          : (error && error.message ? error.message : t('unknownError'))
      }
      let detail = error && error.detail ? String(error.detail).trim() : ''
      if (detail.length > 400) detail = `${detail.slice(0, 397)}…`
      return { message, detail }
    }

    function copyToClipboard(text) {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        return navigator.clipboard.writeText(text)
      }
      return new Promise((resolve, reject) => {
        const area = document.createElement('textarea')
        area.value = text
        area.setAttribute('readonly', '')
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        try {
          const ok = document.execCommand('copy')
          document.body.removeChild(area)
          ok ? resolve() : reject(new Error('copy failed'))
        } catch (error) {
          document.body.removeChild(area)
          reject(error)
        }
      })
    }

    function Glyph({ size = 18, children, ...rest }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          focusable: false,
          ...rest,
        },
        children,
      )
    }

    function DatabaseGlyph({ size = 18 }) {
      return h(Glyph, { size },
        h('ellipse', { cx: 12, cy: 5.5, rx: 7, ry: 3 }),
        h('path', { d: 'M5 5.5v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6' }),
        h('path', { d: 'M5 11.5v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6' }),
      )
    }

    function SearchGlyph({ size = 18 }) {
      return h(Glyph, { size }, h('circle', { cx: 10.5, cy: 10.5, r: 6.5 }), h('path', { d: 'm15.4 15.4 4.1 4.1' }))
    }

    function PlusGlyph({ size = 18 }) {
      return h(Glyph, { size }, h('path', { d: 'M12 5v14M5 12h14' }))
    }

    function CloseGlyph({ size = 16 }) {
      return h(Glyph, { size }, h('path', { d: 'm6 6 12 12M18 6 6 18' }))
    }

    function CopyGlyph({ size = 16 }) {
      return h(Glyph, { size },
        h('rect', { x: 8, y: 8, width: 11, height: 11, rx: 2 }),
        h('path', { d: 'M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2' }),
      )
    }

    function EditGlyph({ size = 16 }) {
      return h(Glyph, { size },
        h('path', { d: 'M4 20h4.5L20 8.5a2.1 2.1 0 0 0-3-3L5.5 17 4 20Z' }),
        h('path', { d: 'm14.5 6.5 3 3' }),
      )
    }

    function TrashGlyph({ size = 16 }) {
      return h(Glyph, { size },
        h('path', { d: 'M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13' }),
        h('path', { d: 'M10 11v5M14 11v5' }),
      )
    }

    function RefreshGlyph({ size = 16 }) {
      return h(Glyph, { size },
        h('path', { d: 'M20 7v5h-5' }),
        h('path', { d: 'M4 17v-5h5' }),
        h('path', { d: 'M6.1 9a7 7 0 0 1 11.3-2L20 12M4 12l2.6 5A7 7 0 0 0 17.9 15' }),
      )
    }

    function FolderGlyph({ size = 16 }) {
      return h(Glyph, { size },
        h('path', { d: 'M3.5 7.5A2.5 2.5 0 0 1 6 5h3l2 2h7a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5v-9Z' }),
      )
    }

    function TableGlyph({ size = 14 }) {
      return h(Glyph, { size },
        h('rect', { x: 3.5, y: 5, width: 17, height: 14, rx: 2 }),
        h('path', { d: 'M3.5 9.5h17M9 9.5V19' }),
      )
    }

    function FieldGlyph({ size = 14 }) {
      return h(Glyph, { size },
        h('path', { d: 'M4 7h16M4 12h10M4 17h13' }),
        h('circle', { cx: 19, cy: 12, r: 1.5 }),
      )
    }

    function AlertGlyph({ size = 18 }) {
      return h(Glyph, { size },
        h('path', { d: 'M12 3.5 21 20H3L12 3.5Z' }),
        h('path', { d: 'M12 9v5' }),
        h('circle', { cx: 12, cy: 17.2, r: 0.9, fill: 'currentColor', stroke: 'none' }),
      )
    }

    function CheckGlyph({ size = 16 }) {
      return h(Glyph, { size }, h('path', { d: 'm5 12.5 4.2 4.2L19 6.8' }))
    }

    function ChevronGlyph({ size = 14, up = false }) {
      return h(Glyph, { size }, h('path', { d: up ? 'm6 14.5 6-6 6 6' : 'm6 9.5 6 6 6-6' }))
    }

    function SparkGlyph({ size = 15 }) {
      return h(Glyph, { size },
        h('path', { d: 'M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z' }),
        h('path', { d: 'M18.5 15.5 19.3 18l2.5.8-2.5.8-.8 2.5-.8-2.5-2.5-.8 2.5-.8.8-2.5Z' }),
      )
    }

    function Spinner({ small = false }) {
      return h('span', { className: `sqm-spinner${small ? ' small' : ''}`, 'aria-hidden': true })
    }

    function ErrorLine({ error, t, onRetry }) {
      if (!error) return null
      const copy = errorCopy(error, t)
      return h(
        'div',
        { className: 'sqm-error', role: 'alert' },
        h(AlertGlyph, { size: 17 }),
        h(
          'div',
          { className: 'sqm-error-text' },
          h('span', null, copy.message),
          copy.detail ? h('span', { className: 'sqm-error-detail' }, copy.detail) : null,
        ),
        onRetry ? h('button', { type: 'button', className: 'sqm-btn tiny', onClick: onRetry }, t('retry')) : null,
      )
    }

    function EmptyState({ icon, title, body, action }) {
      return h(
        'div',
        { className: 'sqm-empty' },
        h('div', { className: 'sqm-empty-icon' }, icon),
        h('h3', null, title),
        body ? h('p', null, body) : null,
        action || null,
      )
    }

    function Modal({ t, title, subtitle, icon, children, footer, onClose, busy = false, danger = false, width = 620 }) {
      const panelRef = useRef(null)

      useEffect(() => {
        const previous = document.activeElement
        const panel = panelRef.current
        const focusable = panel
          ? Array.from(panel.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'))
          : []
        const target = panel && panel.querySelector('[data-autofocus]')
        if (target && typeof target.focus === 'function') target.focus()
        else if (focusable[0]) focusable[0].focus()

        const onKey = (event) => {
          if (event.key === 'Escape' && !busy) {
            event.preventDefault()
            onClose()
            return
          }
          if (event.key !== 'Tab' || focusable.length === 0) return
          const first = focusable[0]
          const last = focusable[focusable.length - 1]
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
          }
        }

        document.addEventListener('keydown', onKey, true)
        return () => {
          document.removeEventListener('keydown', onKey, true)
          if (previous && typeof previous.focus === 'function') previous.focus()
        }
      }, [busy, onClose])

      return h(
        'div',
        {
          className: 'sqm-backdrop',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget && !busy) onClose()
          },
        },
        h(
          'div',
          {
            ref: panelRef,
            className: `sqm-modal${danger ? ' danger' : ''}`,
            style: { maxWidth: `${width}px` },
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': title,
            tabIndex: -1,
          },
          h(
            'div',
            { className: 'sqm-modal-head' },
            icon ? h('div', { className: 'sqm-modal-icon' }, icon) : null,
            h(
              'div',
              { className: 'sqm-modal-title' },
              h('h2', null, title),
              subtitle ? h('p', null, subtitle) : null,
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'sqm-icon-btn',
                onClick: () => { if (!busy) onClose() },
                title: t('close'),
                'aria-label': t('close'),
                disabled: busy,
              },
              h(CloseGlyph),
            ),
          ),
          h('div', { className: 'sqm-modal-body' }, children),
          footer ? h('div', { className: 'sqm-modal-foot' }, footer) : null,
        ),
      )
    }

    function Tag({ kind = 'table', children, title }) {
      return h(
        'span',
        { className: `sqm-tag ${kind}`, title },
        kind === 'table' ? h(TableGlyph, { size: 12 }) : h(FieldGlyph, { size: 12 }),
        h('span', null, children),
      )
    }

    function SqlCard({ item, t, lang, onCopy, onEdit, onDelete, onFilterSystem, query }) {
      const [expanded, setExpanded] = useState(false)
      const sql = item.sql || ''
      const lines = sql.split('\n').length
      const needsToggle = sql.length > 700 || lines > 9
      const tables = item.tables || []
      const fields = item.fields || []
      const visibleTables = expanded ? tables : tables.slice(0, 6)
      const visibleFields = expanded ? fields : fields.slice(0, 10)
      const updated = formatDate(item.updatedAt || item.createdAt, lang)
      const matchParts = []
      if (query && item.matches) {
        if (item.matches.name) matchParts.push(t('matchName'))
        if (item.matches.remark) matchParts.push(t('matchRemark'))
        if (item.matches.table) {
          const names = (item.matchedTables || []).slice(0, 3)
          matchParts.push(names.length ? `${t('matchTable')} ${names.join(', ')}` : t('matchTable'))
        }
        if (item.matches.field) {
          const names = (item.matchedFields || []).slice(0, 3)
          matchParts.push(names.length ? `${t('matchField')} ${names.join(', ')}` : t('matchField'))
        }
        if (item.matches.sql) matchParts.push(t('matchSql'))
        if (item.matches.system) matchParts.push(t('matchSystem'))
      }

      return h(
        'article',
        { className: 'sqm-sql-card' },
        h(
          'div',
          { className: 'sqm-sql-head' },
          h(
            'div',
            { className: 'sqm-sql-title-wrap' },
            h('h3', { className: 'sqm-sql-title' }, item.name),
            h(
              'button',
              {
                type: 'button',
                className: 'sqm-system-pill',
                onClick: () => onFilterSystem(item.systemId),
                title: t('filterBySystem'),
              },
              h(DatabaseGlyph, { size: 12 }),
              item.systemName,
            ),
            updated ? h('span', { className: 'sqm-sql-time' }, t('updatedAt', { date: updated })) : null,
          ),
          h(
            'div',
            { className: 'sqm-sql-actions' },
            h(
              'button',
              { type: 'button', className: 'sqm-icon-btn', onClick: () => onCopy(item), title: t('copySql'), 'aria-label': t('copySql') },
              h(CopyGlyph),
            ),
            h(
              'button',
              { type: 'button', className: 'sqm-icon-btn', onClick: () => onEdit(item), title: t('editSql'), 'aria-label': t('editSql') },
              h(EditGlyph),
            ),
            h(
              'button',
              { type: 'button', className: 'sqm-icon-btn danger', onClick: () => onDelete(item), title: t('deleteSql'), 'aria-label': t('deleteSql') },
              h(TrashGlyph),
            ),
          ),
        ),
        h('p', { className: `sqm-remark${item.remark ? '' : ' muted'}` }, item.remark || t('noRemark')),
        matchParts.length > 0
          ? h(
              'div',
              { className: 'sqm-match-row' },
              h('span', { className: 'sqm-match-label' }, t('matched')),
              ...matchParts.map((part, index) => h('span', { className: 'sqm-match-chip', key: `${part}-${index}` }, part)),
            )
          : null,
        h(
          'div',
          { className: `sqm-code${expanded ? ' expanded' : ''}${needsToggle && !expanded ? ' faded' : ''}` },
          h('pre', { className: 'sqm-code-pre' }, h('code', null, sql)),
        ),
        needsToggle
          ? h(
              'button',
              { type: 'button', className: 'sqm-more-btn', onClick: () => setExpanded((value) => !value) },
              h(ChevronGlyph, { up: expanded, size: 13 }),
              expanded ? t('collapse') : t('expand'),
            )
          : null,
        tables.length || fields.length
          ? h(
              'div',
              { className: 'sqm-tags' },
              tables.length
                ? h(
                    'div',
                    { className: 'sqm-tag-row' },
                    h('span', { className: 'sqm-tag-label' }, t('tablesLabel')),
                    ...visibleTables.map((table) => h(Tag, { key: `t-${table}`, kind: 'table', title: table }, table)),
                    tables.length > visibleTables.length
                      ? h('span', { className: 'sqm-tag-more' }, t('moreTags', { count: tables.length - visibleTables.length }))
                      : null,
                  )
                : null,
              fields.length
                ? h(
                    'div',
                    { className: 'sqm-tag-row' },
                    h('span', { className: 'sqm-tag-label' }, t('fieldsLabel')),
                    ...visibleFields.map((field) => h(Tag, { key: `f-${field}`, kind: 'field', title: field }, field)),
                    fields.length > visibleFields.length
                      ? h('span', { className: 'sqm-tag-more' }, t('moreTags', { count: fields.length - visibleFields.length }))
                      : null,
                  )
                : null,
            )
          : null,
      )
    }

    function SkeletonCard() {
      return h(
        'div',
        { className: 'sqm-skeleton-card' },
        h('div', { className: 'sqm-skeleton line w40' }),
        h('div', { className: 'sqm-skeleton line w75' }),
        h('div', { className: 'sqm-skeleton code' }),
      )
    }

    function SearchPanel({ t, query, onQuery, onClear, refreshing, activeSystem, onClearSystem, total, truncated }) {
      return h(
        'section',
        { className: 'sqm-search-panel' },
        h(
          'div',
          { className: 'sqm-search-box' },
          h(SearchGlyph, { size: 18 }),
          h('input', {
            className: 'sqm-search-input',
            value: query,
            onChange: (event) => onQuery(event.target.value),
            placeholder: t('searchPlaceholder'),
            'aria-label': t('searchPlaceholder'),
            spellCheck: false,
            type: 'search',
            maxLength: 240,
          }),
          query
            ? h(
                'button',
                { type: 'button', className: 'sqm-icon-btn', onClick: onClear, title: t('clear'), 'aria-label': t('clear') },
                h(CloseGlyph),
              )
            : null,
          refreshing ? h(Spinner, { small: true }) : null,
        ),
        h(
          'div',
          { className: 'sqm-search-meta' },
          h('span', { className: 'sqm-search-hint' }, t('searchHint')),
          activeSystem
            ? h(
                'span',
                { className: 'sqm-filter-chip' },
                h(DatabaseGlyph, { size: 12 }),
                activeSystem.name,
                h(
                  'button',
                  { type: 'button', onClick: onClearSystem, title: t('removeFilter'), 'aria-label': t('removeFilter') },
                  h(CloseGlyph, { size: 12 }),
                ),
              )
            : null,
          h(
            'span',
            { className: 'sqm-result-count', 'aria-live': 'polite' },
            activeSystem
              ? t('resultFiltered', { count: total, system: activeSystem.name })
              : t('resultCount', { count: total }),
          ),
          truncated ? h('span', { className: 'sqm-truncated' }, t('truncated', { count: 200 })) : null,
        ),
      )
    }

    function SqlEditorModal({ t, mode, record, systems, defaultSystemId, onClose, onSaved }) {
      const [systemId, setSystemId] = useState(record ? record.systemId : (defaultSystemId || (systems[0] && systems[0].id) || ''))
      const [name, setName] = useState(record ? record.name : '')
      const [remark, setRemark] = useState(record ? record.remark : '')
      const [sql, setSql] = useState(record ? record.sql : '')
      const [saving, setSaving] = useState(false)
      const [error, setError] = useState(null)
      const [parsed, setParsed] = useState(null)
      const [parsing, setParsing] = useState(false)
      const formRef = useRef(null)

      useEffect(() => {
        if (!sql.trim()) {
          setParsed(null)
          setParsing(false)
          return undefined
        }
        let alive = true
        setParsing(true)
        const timer = window.setTimeout(async () => {
          try {
            const payload = await request('/parse', { method: 'POST', body: JSON.stringify({ sql }) })
            if (alive) setParsed({ tables: payload.tables || [], fields: payload.fields || [] })
          } catch {
            if (alive) setParsed(null)
          } finally {
            if (alive) setParsing(false)
          }
        }, 320)
        return () => {
          alive = false
          window.clearTimeout(timer)
        }
      }, [sql])

      const submit = async (event) => {
        if (event) event.preventDefault()
        if (saving) return
        setError(null)
        if (!systemId) {
          setError({ message: t('systemRequired') })
          return
        }
        if (!name.trim()) {
          setError({ message: t('nameRequired') })
          return
        }
        if (!sql.trim()) {
          setError({ message: t('sqlRequired') })
          return
        }
        setSaving(true)
        try {
          let payload
          if (mode === 'edit' && record) {
            payload = await request(`/sql/${encodeURIComponent(record.systemId)}/${encodeURIComponent(record.id)}`, {
              method: 'PUT',
              body: JSON.stringify({ name: name.trim(), remark, sql }),
            })
            onSaved(payload, 'update')
          } else {
            payload = await request('/sql', {
              method: 'POST',
              body: JSON.stringify({ system: systemId, name: name.trim(), remark, sql }),
            })
            onSaved(payload, 'add')
          }
        } catch (cause) {
          setError(cause)
        } finally {
          setSaving(false)
        }
      }

      const onFormKeyDown = (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault()
          submit(event)
        }
      }

      const currentSystem = systems.find((system) => system.id === systemId)
      const parseTables = parsed ? parsed.tables : []
      const parseFields = parsed ? parsed.fields : []

      return h(
        Modal,
        {
          t,
          title: mode === 'edit' ? t('editSql') : t('addSql'),
          subtitle: mode === 'edit' ? (record && record.systemName) : t('parseHint'),
          icon: h(DatabaseGlyph, { size: 19 }),
          onClose,
          busy: saving,
          width: 760,
          footer: h(
            React.Fragment,
            null,
            h('span', { className: 'sqm-kbd-hint' }, t('ctrlEnter')),
            h('span', { className: 'sqm-foot-spacer' }),
            h('button', { type: 'button', className: 'sqm-btn', onClick: onClose, disabled: saving }, t('cancel')),
            h(
              'button',
              { type: 'submit', form: 'sqm-sql-form', className: 'sqm-btn primary', disabled: saving },
              saving ? h(Spinner, { small: true }) : h(CheckGlyph, { size: 15 }),
              saving ? t('saving') : t('save'),
            ),
          ),
        },
        h(
          'form',
          { id: 'sqm-sql-form', ref: formRef, className: 'sqm-form', onSubmit: submit, onKeyDown: onFormKeyDown },
          h(
            'div',
            { className: 'sqm-form-grid' },
            h(
              'div',
              { className: 'sqm-field' },
              h('label', { htmlFor: 'sqm-system-select' }, t('systemLabel')),
              mode === 'edit'
                ? h('div', { className: 'sqm-fixed-field' }, h(DatabaseGlyph, { size: 14 }), currentSystem ? currentSystem.name : record.systemName)
                : h(
                    'select',
                    {
                      id: 'sqm-system-select',
                      className: 'sqm-select',
                      value: systemId,
                      onChange: (event) => setSystemId(event.target.value),
                      disabled: saving,
                    },
                    systems.map((system) => h('option', { key: system.id, value: system.id }, system.name)),
                  ),
              currentSystem && currentSystem.path
                ? h('span', { className: 'sqm-field-note mono', title: currentSystem.path }, currentSystem.path)
                : null,
            ),
            h(
              'div',
              { className: 'sqm-field' },
              h('label', { htmlFor: 'sqm-sql-name' }, t('sqlName')),
              h('input', {
                id: 'sqm-sql-name',
                className: 'sqm-input',
                value: name,
                onChange: (event) => setName(event.target.value),
                placeholder: t('sqlNamePlaceholder'),
                maxLength: 160,
                disabled: saving,
                'data-autofocus': true,
              }),
            ),
          ),
          h(
            'div',
            { className: 'sqm-field' },
            h('label', { htmlFor: 'sqm-sql-remark' }, t('remark')),
            h('textarea', {
              id: 'sqm-sql-remark',
              className: 'sqm-textarea remark',
              value: remark,
              onChange: (event) => setRemark(event.target.value),
              placeholder: t('remarkPlaceholder'),
              rows: 2,
              maxLength: 4000,
              disabled: saving,
            }),
          ),
          h(
            'div',
            { className: 'sqm-field' },
            h(
              'div',
              { className: 'sqm-label-row' },
              h('label', { htmlFor: 'sqm-sql-text' }, t('sqlText')),
              h('span', { className: 'sqm-label-hint' }, t('parseHint')),
            ),
            h('textarea', {
              id: 'sqm-sql-text',
              className: 'sqm-textarea code',
              value: sql,
              onChange: (event) => setSql(event.target.value),
              placeholder: t('sqlPlaceholder'),
              rows: 11,
              spellCheck: false,
              disabled: saving,
            }),
          ),
          h(
            'div',
            { className: 'sqm-parse-box' },
            h(
              'div',
              { className: 'sqm-parse-head' },
              parsing ? h(Spinner, { small: true }) : h(SparkGlyph, { size: 15 }),
              h('span', null, parsing ? t('parsing') : t('detected')),
            ),
            parseTables.length || parseFields.length
              ? h(
                  'div',
                  { className: 'sqm-parse-tags' },
                  parseTables.length
                    ? h(
                        'div',
                        { className: 'sqm-tag-row' },
                        h('span', { className: 'sqm-tag-label' }, t('tablesLabel')),
                        ...parseTables.slice(0, 12).map((table) => h(Tag, { key: `pt-${table}`, kind: 'table' }, table)),
                        parseTables.length > 12 ? h('span', { className: 'sqm-tag-more' }, t('moreTags', { count: parseTables.length - 12 })) : null,
                      )
                    : null,
                  parseFields.length
                    ? h(
                        'div',
                        { className: 'sqm-tag-row' },
                        h('span', { className: 'sqm-tag-label' }, t('fieldsLabel')),
                        ...parseFields.slice(0, 18).map((field) => h(Tag, { key: `pf-${field}`, kind: 'field' }, field)),
                        parseFields.length > 18 ? h('span', { className: 'sqm-tag-more' }, t('moreTags', { count: parseFields.length - 18 })) : null,
                      )
                    : null,
                )
              : h('p', { className: 'sqm-parse-empty' }, t('detectedNone')),
          ),
          error ? h(ErrorLine, { error, t }) : null,
        ),
      )
    }

    function SystemModal({ t, ctx, mode, system, thenAdd, suggestedFolder, onClose, onSaved }) {
      const [name, setName] = useState(system ? system.name : '')
      const [description, setDescription] = useState(system ? system.description : '')
      const [path, setPath] = useState(system ? (system.path || '') : '')
      const [picking, setPicking] = useState(false)
      const [saving, setSaving] = useState(false)
      const [error, setError] = useState(null)

      const browse = async () => {
        if (picking || saving) return
        const uiWorkspace = (ctx.get && ctx.get('uiWorkspace')) || ctx.uiWorkspace
        if (!uiWorkspace || typeof uiWorkspace.pickDirectory !== 'function') {
          setError({ message: t('browseFailed') })
          return
        }
        setPicking(true)
        setError(null)
        try {
          const picked = await uiWorkspace.pickDirectory()
          if (picked) setPath(picked)
        } catch {
          setError({ message: t('browseFailed') })
        } finally {
          setPicking(false)
        }
      }

      const submit = async (event) => {
        event.preventDefault()
        if (saving) return
        if (!name.trim()) {
          setError({ message: t('nameRequired') })
          return
        }
        if (!path.trim()) {
          setError({ message: t('pathRequired') })
          return
        }
        setSaving(true)
        setError(null)
        try {
          let payload
          if (mode === 'edit' && system) {
            payload = await request(`/systems/${encodeURIComponent(system.id)}`, {
              method: 'PATCH',
              body: JSON.stringify({ name: name.trim(), description, path: path.trim() }),
            })
            onSaved(payload, 'update', false)
          } else {
            payload = await request('/systems', {
              method: 'POST',
              body: JSON.stringify({ name: name.trim(), description, path: path.trim() }),
            })
            onSaved(payload, 'create', thenAdd === true)
          }
        } catch (cause) {
          setError(cause)
        } finally {
          setSaving(false)
        }
      }

      return h(
        Modal,
        {
          t,
          title: mode === 'edit' ? t('editSystemTitle') : t('createSystemTitle'),
          subtitle: mode === 'edit' ? t('editSystemSubtitle') : t('createSystemSubtitle'),
          icon: h(DatabaseGlyph, { size: 19 }),
          onClose,
          busy: saving,
          width: 640,
          footer: h(
            React.Fragment,
            null,
            h('span', { className: 'sqm-foot-spacer' }),
            h('button', { type: 'button', className: 'sqm-btn', onClick: onClose, disabled: saving }, t('cancel')),
            h(
              'button',
              { type: 'submit', form: 'sqm-system-form', className: 'sqm-btn primary', disabled: saving },
              saving ? h(Spinner, { small: true }) : h(CheckGlyph, { size: 15 }),
              saving ? t('saving') : t('save'),
            ),
          ),
        },
        h(
          'form',
          { id: 'sqm-system-form', className: 'sqm-form', onSubmit: submit },
          mode === 'edit' && system && system.missing
            ? h(
                'div',
                { className: 'sqm-inline-warning', role: 'status' },
                h(AlertGlyph, { size: 16 }),
                h('span', null, t('systemMissingBody', { path: system.path })),
              )
            : null,
          h(
            'div',
            { className: 'sqm-field' },
            h('label', { htmlFor: 'sqm-system-name' }, t('systemName')),
            h('input', {
              id: 'sqm-system-name',
              className: 'sqm-input',
              value: name,
              onChange: (event) => setName(event.target.value),
              placeholder: t('systemNamePlaceholder'),
              maxLength: 120,
              disabled: saving,
              'data-autofocus': true,
            }),
          ),
          h(
            'div',
            { className: 'sqm-field' },
            h(
              'div',
              { className: 'sqm-label-row' },
              h('label', { htmlFor: 'sqm-system-path' }, t('pathLabel')),
              h('span', { className: 'sqm-label-hint' }, t('pathHint')),
            ),
            h(
              'div',
              { className: 'sqm-path-row' },
              h('input', {
                id: 'sqm-system-path',
                className: 'sqm-input mono',
                value: path,
                onChange: (event) => setPath(event.target.value),
                placeholder: t('pathPlaceholder'),
                spellCheck: false,
                maxLength: 1024,
                disabled: saving,
              }),
              h(
                'button',
                { type: 'button', className: 'sqm-btn', onClick: browse, disabled: saving || picking },
                picking ? h(Spinner, { small: true }) : h(FolderGlyph, { size: 15 }),
                t('browseFolder'),
              ),
            ),
            suggestedFolder
              ? h(
                  'div',
                  { className: 'sqm-path-suggestion' },
                  h('span', { className: 'sqm-mono-line' }, `${t('suggestedFolder')}: ${suggestedFolder}`),
                  h(
                    'button',
                    { type: 'button', className: 'sqm-link-btn', onClick: () => setPath(suggestedFolder), disabled: saving },
                    t('useSuggestedFolder'),
                  ),
                )
              : null,
            h('p', { className: 'sqm-path-hint' }, mode === 'edit' ? t('pathMoveHint') : t('pathImportHint')),
          ),
          h(
            'div',
            { className: 'sqm-field' },
            h('label', { htmlFor: 'sqm-system-desc' }, t('systemDescription')),
            h('textarea', {
              id: 'sqm-system-desc',
              className: 'sqm-textarea remark',
              value: description,
              onChange: (event) => setDescription(event.target.value),
              placeholder: t('systemDescriptionPlaceholder'),
              rows: 3,
              maxLength: 1000,
              disabled: saving,
            }),
          ),
          error ? h(ErrorLine, { error, t }) : null,
        ),
      )
    }

    function ConfirmModal({ t, kind, item, onClose, onConfirm }) {
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState(null)
      const isSystem = kind === 'system'
      const title = isSystem ? t('deleteSystemTitle') : t('deleteSqlTitle')
      const subtitle = isSystem ? t('deleteSystemSubtitle') : t('deleteSqlSubtitle')
      const warning = isSystem
        ? t('deleteSystemWarning', { name: item.name, count: item.count })
        : t('deleteSqlWarning', { name: item.name })

      const submit = async () => {
        if (busy) return
        setBusy(true)
        setError(null)
        try {
          if (isSystem) {
            const payload = await request(`/systems/${encodeURIComponent(item.id)}`, {
              method: 'DELETE',
              body: JSON.stringify({ confirmName: item.name }),
            })
            onConfirm(payload, 'system')
          } else {
            const payload = await request(`/sql/${encodeURIComponent(item.systemId)}/${encodeURIComponent(item.id)}`, {
              method: 'DELETE',
              body: '{}',
            })
            onConfirm(payload, 'sql')
          }
        } catch (cause) {
          setError(cause)
        } finally {
          setBusy(false)
        }
      }

      return h(
        Modal,
        {
          t,
          title,
          subtitle,
          icon: h(AlertGlyph, { size: 19 }),
          onClose,
          busy,
          danger: true,
          width: 520,
          footer: h(
            React.Fragment,
            null,
            h('span', { className: 'sqm-foot-spacer' }),
            h('button', { type: 'button', className: 'sqm-btn', onClick: onClose, disabled: busy }, t('cancel')),
            h(
              'button',
              { type: 'button', className: 'sqm-btn danger', onClick: submit, disabled: busy },
              busy ? h(Spinner, { small: true }) : h(TrashGlyph, { size: 15 }),
              busy ? t('saving') : t('confirmDelete'),
            ),
          ),
        },
        h('p', { className: 'sqm-warning-text' }, warning),
        error ? h(ErrorLine, { error, t }) : null,
      )
    }

    function SidebarIcon({ size = 20, active = false }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          style: { display: 'block', opacity: active ? 1 : 0.86 },
        },
        h('ellipse', { cx: 10.5, cy: 5.6, rx: 6.3, ry: 2.7 }),
        h('path', { d: 'M4.2 5.6v6c0 1.5 2.8 2.7 6.3 2.7 1.3 0 2.5-.2 3.5-.5' }),
        h('path', { d: 'M4.2 11.6v5.6c0 1.5 2.8 2.7 6.3 2.7 1 0 2-.1 2.8-.4' }),
        h('circle', { cx: 16.7, cy: 15.5, r: 4.1 }),
        h('path', { d: 'm19.7 18.5 2.6 2.6' }),
      )
    }

    function SqlManagerApp({ ctx, t }) {
      useLocaleTick(ctx)
      const activeLocale = String(ctx.locale.getSnapshot().active || 'zh-CN')
      const lang = isZh(activeLocale) ? 'zh-CN' : 'en-US'

      const [data, setData] = useState(null)
      const [query, setQuery] = useState('')
      const [debounced, setDebounced] = useState('')
      const [systemFilter, setSystemFilter] = useState('')
      const [loading, setLoading] = useState(true)
      const [refreshing, setRefreshing] = useState(false)
      const [error, setError] = useState(null)
      const [toast, setToast] = useState(null)
      const [modal, setModal] = useState(null)

      const dataRef = useRef(null)
      const mounted = useRef(true)
      const requestSeq = useRef(0)
      const toastTimer = useRef(null)

      useEffect(() => {
        dataRef.current = data
      }, [data])

      useEffect(() => {
        mounted.current = true
        return () => {
          mounted.current = false
          if (toastTimer.current) window.clearTimeout(toastTimer.current)
        }
      }, [])

      const showToast = useCallback((text, tone = 'success') => {
        setToast({ text, tone })
        if (toastTimer.current) window.clearTimeout(toastTimer.current)
        toastTimer.current = window.setTimeout(() => setToast(null), 2600)
      }, [])

      const loadState = useCallback(async (nextQuery, nextFilter, quiet = false) => {
        const seq = ++requestSeq.current
        if (!dataRef.current) setLoading(true)
        else if (!quiet) setRefreshing(true)
        setError(null)
        try {
          const params = new URLSearchParams()
          if (nextQuery) params.set('q', nextQuery)
          if (nextFilter) params.set('system', nextFilter)
          params.set('limit', '200')
          const payload = await request(`/state?${params.toString()}`)
          if (!mounted.current || seq !== requestSeq.current) return
          setData(payload)
        } catch (cause) {
          if (!mounted.current || seq !== requestSeq.current) return
          if (cause && cause.code === 'NOT_FOUND' && nextFilter) {
            setSystemFilter('')
            return
          }
          setError(cause)
        } finally {
          if (mounted.current && seq === requestSeq.current) {
            setLoading(false)
            setRefreshing(false)
          }
        }
      }, [])

      useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(query.trim()), 220)
        return () => window.clearTimeout(timer)
      }, [query])

      useEffect(() => {
        loadState(debounced, systemFilter)
      }, [debounced, systemFilter, loadState])

      const systems = data && Array.isArray(data.systems) ? data.systems : []
      const validSystems = systems.filter((system) => !system.missing)
      const items = data && Array.isArray(data.items) ? data.items : []
      const total = data && Number.isFinite(data.total) ? data.total : 0
      const activeSystem = systemFilter ? systems.find((system) => system.id === systemFilter) : null
      const issues = data && Array.isArray(data.issues) ? data.issues : []
      const suggestedFolder = data && data.suggestedFolder ? data.suggestedFolder : ''
      const registryPath = data && data.registryPath ? data.registryPath : ''

      const reload = async (nextFilter = systemFilter) => {
        await loadState(debounced, nextFilter, true)
      }

      const openAddSql = () => {
        if (!data) return
        if (systems.length === 0) {
          setModal({ type: 'system', mode: 'create', thenAdd: true })
          return
        }
        if (validSystems.length === 0) {
          showToast(t('noUsableSystem'), 'error')
          setModal({ type: 'system', mode: 'edit', system: systems[0] })
          return
        }
        const preferred = activeSystem && !activeSystem.missing ? activeSystem.id : validSystems[0].id
        setModal({
          type: 'sql',
          mode: 'create',
          systemId: preferred,
        })
      }

      const handleSystemSaved = async (payload, mode, thenAdd) => {
        await reload()
        if (thenAdd && payload && payload.system) {
          setModal({ type: 'sql', mode: 'create', systemId: payload.system.id })
          showToast(payload.imported ? t('systemImported') : t('systemCreated'))
        } else {
          setModal(null)
          if (mode === 'edit') {
            showToast(payload && payload.moved ? t('systemPathMoved') : t('systemUpdated'))
          } else {
            showToast(payload && payload.imported ? t('systemImported') : t('systemCreated'))
          }
        }
      }

      const handleSqlSaved = async (_payload, mode) => {
        setModal(null)
        await reload()
        showToast(mode === 'edit' ? t('sqlUpdated') : t('sqlAdded'))
      }

      const handleDelete = async (_payload, kind) => {
        const deletingSystem = kind === 'system' && modal && modal.item
        setModal(null)
        if (deletingSystem && systemFilter === deletingSystem.id) {
          setSystemFilter('')
          await loadState(debounced, '', true)
        } else {
          await reload()
        }
        showToast(kind === 'system' ? t('systemDeleted') : t('sqlDeleted'))
      }

      const copySql = async (item) => {
        try {
          await copyToClipboard(item.sql)
          showToast(t('copied'))
        } catch {
          showToast(t('copyFailed'), 'error')
        }
      }

      const clearSearch = () => {
        setQuery('')
        setDebounced('')
      }

      const clearSystem = () => setSystemFilter('')

      const issueText = (issue) => {
        if (!issue) return ''
        return `${issue.file || ''}${issue.message ? ` — ${issue.message}` : ''}`
      }

      return h(
        'div',
        { className: 'sqm-page' },
        h('style', null, CSS),
        h(
          'div',
          { className: 'sqm-shell' },
          h(
            'header',
            { className: 'sqm-hero' },
            h('div', { className: 'sqm-hero-mark' }, h(DatabaseGlyph, { size: 24 })),
            h(
              'div',
              { className: 'sqm-hero-text' },
              h(
                'div',
                { className: 'sqm-hero-title-row' },
                h('h1', null, t('appTitle')),
                h('span', { className: 'sqm-pill' }, h('span', { className: 'sqm-dot' }), t('jsonStore')),
              ),
              h('p', null, t('appSubtitle')),
            ),
            h(
              'div',
              { className: 'sqm-hero-actions' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'sqm-btn',
                  onClick: () => loadState(debounced, systemFilter, true),
                  disabled: refreshing,
                  title: t('refresh'),
                },
                h(RefreshGlyph, { size: 15 }),
                t('refresh'),
              ),
              h(
                'button',
                { type: 'button', className: 'sqm-btn primary', onClick: openAddSql, disabled: !data },
                h(PlusGlyph, { size: 16 }),
                t('addSql'),
              ),
            ),
          ),
          h(
            'div',
            { className: 'sqm-statbar' },
            h('span', { className: 'sqm-stat' }, h('strong', null, data ? data.totalSystems : '—'), t('systemsTitle')),
            h('span', { className: 'sqm-stat-divider' }),
            h('span', { className: 'sqm-stat' }, h('strong', null, data ? data.totalSqls : '—'), t('allSql')),
            h('span', { className: 'sqm-stat-divider' }),
            h(
              'span',
              { className: 'sqm-path-note', title: registryPath ? `${t('registry')}: ${registryPath}` : '' },
              h(FolderGlyph, { size: 14 }),
              t('independentPaths'),
            ),
          ),
          h(
            'div',
            { className: 'sqm-workspace' },
            h(
              'aside',
              { className: 'sqm-rail', 'aria-label': t('systemsTitle') },
              h(
                'div',
                { className: 'sqm-rail-head' },
                h('span', null, t('systemsTitle')),
                h(
                  'button',
                  { type: 'button', className: 'sqm-icon-btn', onClick: () => setModal({ type: 'system', mode: 'create' }), title: t('addSystem'), 'aria-label': t('addSystem'), disabled: !data },
                  h(PlusGlyph, { size: 15 }),
                ),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: `sqm-system-card all${systemFilter === '' ? ' active' : ''}`,
                  onClick: clearSystem,
                  'aria-pressed': systemFilter === '',
                },
                h('span', { className: 'sqm-system-avatar all' }, h(DatabaseGlyph, { size: 15 })),
                h(
                  'span',
                  { className: 'sqm-system-text' },
                  h('span', { className: 'sqm-system-name' }, t('allSql')),
                  h('span', { className: 'sqm-system-meta' }, data ? `${data.totalSqls} SQL` : '—'),
                ),
              ),
              h(
                'div',
                { className: 'sqm-system-list' },
                systems.length === 0
                  ? h(
                      'div',
                      { className: 'sqm-rail-empty' },
                      h('p', null, t('noSystems')),
                      h('span', null, t('noSystemsHint')),
                      h(
                        'button',
                        { type: 'button', className: 'sqm-btn tiny', onClick: () => setModal({ type: 'system', mode: 'create' }), disabled: !data },
                        h(PlusGlyph, { size: 14 }),
                        t('addSystem'),
                      ),
                    )
                  : systems.map((system) => h(
                      'div',
                      {
                        key: system.id,
                        className: `sqm-system-card${systemFilter === system.id ? ' active' : ''}${system.missing ? ' missing' : ''}`,
                      },
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'sqm-system-main',
                          onClick: () => setSystemFilter(systemFilter === system.id ? '' : system.id),
                          'aria-pressed': systemFilter === system.id,
                          title: `${system.name}\n${system.path || ''}${system.error ? `\n${system.error}` : ''}`,
                        },
                        h(
                          'span',
                          { className: `sqm-system-avatar${system.missing ? ' missing' : ''}` },
                          system.missing ? h(AlertGlyph, { size: 13 }) : (Array.from(system.name)[0] || 'S'),
                        ),
                        h(
                          'span',
                          { className: 'sqm-system-text' },
                          h('span', { className: 'sqm-system-name' }, system.name),
                          h(
                            'span',
                            { className: `sqm-system-meta${system.missing ? ' missing' : ''}` },
                            system.missing ? t('systemMissingMeta') : `${system.count} SQL`,
                          ),
                          system.path
                            ? h('span', { className: 'sqm-system-path', title: system.path }, system.path)
                            : null,
                        ),
                      ),
                      h(
                        'span',
                        { className: 'sqm-system-actions' },
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'sqm-icon-btn tiny',
                            onClick: () => setModal({ type: 'system', mode: 'edit', system }),
                            title: t('renameSystem'),
                            'aria-label': t('renameSystem'),
                          },
                          h(EditGlyph, { size: 13 }),
                        ),
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'sqm-icon-btn tiny danger',
                            onClick: () => setModal({ type: 'confirm-system', item: system }),
                            title: t('deleteSystemAction'),
                            'aria-label': t('deleteSystemAction'),
                          },
                          h(TrashGlyph, { size: 13 }),
                        ),
                      ),
                    )),
              ),
              h(
                'div',
                { className: 'sqm-rail-foot', title: registryPath ? `${t('registry')}: ${registryPath}` : '' },
                h(FolderGlyph, { size: 13 }),
                h('span', null, t('independentPaths')),
              ),
            ),
            h(
              'section',
              { className: 'sqm-main', 'aria-label': t('appTitle') },
              h(SearchPanel, {
                t,
                query,
                onQuery: setQuery,
                onClear: clearSearch,
                refreshing,
                activeSystem,
                onClearSystem: clearSystem,
                total,
                truncated: Boolean(data && data.truncated),
              }),
              error && data ? h(ErrorLine, { error, t, onRetry: () => loadState(debounced, systemFilter) }) : null,
              issues.length
                ? h(
                    'div',
                    { className: 'sqm-issue-box', role: 'status' },
                    h(AlertGlyph, { size: 17 }),
                    h(
                      'div',
                      { className: 'sqm-issue-text' },
                      h('strong', null, t('issuesTitle')),
                      h('span', null, t('issuesHint')),
                      h(
                        'ul',
                        null,
                        issues.slice(0, 4).map((issue, index) => h('li', { key: `${issue.file || 'issue'}-${index}` }, issueText(issue))),
                      ),
                    ),
                  )
                : null,
              loading
                ? h(
                    'div',
                    { className: 'sqm-sql-list', 'aria-busy': 'true', 'aria-label': t('loading') },
                    h(SkeletonCard, { key: 'skeleton-1' }),
                    h(SkeletonCard, { key: 'skeleton-2' }),
                    h(SkeletonCard, { key: 'skeleton-3' }),
                  )
                : !data
                  ? h(
                      'div',
                      { className: 'sqm-card' },
                      h(EmptyState, {
                        icon: h(AlertGlyph, { size: 24 }),
                        title: t('loadFailed'),
                        body: error ? errorCopy(error, t).message : t('unknownError'),
                        action: h('button', { type: 'button', className: 'sqm-btn', onClick: () => loadState(debounced, systemFilter) }, t('retry')),
                      }),
                      error ? h(ErrorLine, { error, t }) : null,
                    )
                  : activeSystem && activeSystem.missing
                    ? h(
                        'div',
                        { className: 'sqm-card' },
                        h(EmptyState, {
                          icon: h(AlertGlyph, { size: 24 }),
                          title: t('systemMissingTitle'),
                          body: t('systemMissingBody', { path: activeSystem.path || '' }),
                          action: h(
                            'div',
                            { className: 'sqm-empty-actions' },
                            h(
                              'button',
                              { type: 'button', className: 'sqm-btn primary', onClick: () => setModal({ type: 'system', mode: 'edit', system: activeSystem }) },
                              h(EditGlyph, { size: 15 }),
                              t('editPath'),
                            ),
                            h(
                              'button',
                              { type: 'button', className: 'sqm-btn danger', onClick: () => setModal({ type: 'confirm-system', item: activeSystem }) },
                              h(TrashGlyph, { size: 15 }),
                              t('deleteSystemAction'),
                            ),
                            h(
                              'button',
                              { type: 'button', className: 'sqm-btn', onClick: clearSystem },
                              h(CloseGlyph, { size: 15 }),
                              t('removeFilter'),
                            ),
                          ),
                        }),
                      )
                    : items.length === 0
                    ? h(
                        'div',
                        { className: 'sqm-card' },
                        h(EmptyState, {
                          icon: query ? h(SearchGlyph, { size: 24 }) : h(DatabaseGlyph, { size: 24 }),
                          title: query ? t('searchEmptyTitle') : (activeSystem ? t('emptySystemTitle') : t('emptyTitle')),
                          body: query ? t('searchEmptyBody') : (activeSystem ? t('emptySystemBody') : t('emptyBody')),
                          action: h(
                            'button',
                            {
                              type: 'button',
                              className: 'sqm-btn primary',
                              onClick: query
                                ? () => {
                                    clearSearch()
                                    if (activeSystem) clearSystem()
                                  }
                                : openAddSql,
                            },
                            query ? h(CloseGlyph, { size: 15 }) : h(PlusGlyph, { size: 15 }),
                            query ? t('clear') : t('emptyAdd'),
                          ),
                        }),
                      )
                    : h(
                        'div',
                        { className: 'sqm-sql-list' },
                        items.map((item) => h(SqlCard, {
                          key: `${item.systemId}:${item.id}`,
                          item,
                          t,
                          lang,
                          query: debounced,
                          onCopy: copySql,
                          onEdit: (record) => setModal({ type: 'sql', mode: 'edit', record }),
                          onDelete: (record) => setModal({ type: 'confirm-sql', item: record }),
                          onFilterSystem: (systemId) => setSystemFilter(systemId),
                        })),
                      ),
              h(
                'footer',
                { className: 'sqm-footer' },
                h('span', null, 'SQL Manager', h('span', { className: 'sqm-footer-dot' }, '·'), `v${VERSION}`),
                h('span', null, t('jsonStore')),
              ),
            ),
          ),
        ),
        toast
          ? h(
              'div',
              { className: `sqm-toast ${toast.tone === 'error' ? 'error' : ''}`, role: 'status' },
              toast.tone === 'error' ? h(AlertGlyph, { size: 16 }) : h(CheckGlyph, { size: 16 }),
              h('span', null, toast.text),
            )
          : null,
        modal && modal.type === 'sql'
          ? h(SqlEditorModal, {
              t,
              mode: modal.mode,
              record: modal.record,
              systems: validSystems,
              defaultSystemId: modal.systemId,
              onClose: () => setModal(null),
              onSaved: handleSqlSaved,
            })
          : null,
        modal && modal.type === 'system'
          ? h(SystemModal, {
              t,
              ctx,
              mode: modal.mode,
              system: modal.system,
              thenAdd: modal.thenAdd,
              suggestedFolder,
              onClose: () => setModal(null),
              onSaved: handleSystemSaved,
            })
          : null,
        modal && modal.type === 'confirm-system'
          ? h(ConfirmModal, {
              t,
              kind: 'system',
              item: modal.item,
              onClose: () => setModal(null),
              onConfirm: handleDelete,
            })
          : null,
        modal && modal.type === 'confirm-sql'
          ? h(ConfirmModal, {
              t,
              kind: 'sql',
              item: modal.item,
              onClose: () => setModal(null),
              onConfirm: handleDelete,
            })
          : null,
      )
    }

    class Boundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { failed: false }
      }

      static getDerivedStateFromError() {
        return { failed: true }
      }

      render() {
        if (this.state.failed) {
          const t = this.props.t || ((key) => key)
          return h(
            'div',
            { className: 'sqm-page' },
            h('style', null, CSS),
            h(
              'div',
              { className: 'sqm-shell' },
              h(
                'div',
                { className: 'sqm-card' },
                h(EmptyState, {
                  icon: h(AlertGlyph, { size: 24 }),
                  title: t('errorRender'),
                }),
              ),
            ),
          )
        }
        return this.props.children
      }
    }

    const CSS = `
.sqm-page {
  --sqm-line: var(--dsw-alias-border-l1);
  --sqm-line-strong: var(--dsw-alias-border-l2);
  --sqm-fg: var(--dsw-alias-label-primary);
  --sqm-dim: var(--dsw-alias-label-secondary);
  --sqm-card: var(--dsw-alias-bg-layer-1);
  --sqm-nested: var(--dsw-alias-bg-layer-2);
  --sqm-overlay: var(--dsw-alias-bg-overlay);
  --sqm-brand: var(--dsw-alias-brand-primary);
  --sqm-success: var(--dsw-alias-state-success-primary);
  --sqm-danger: var(--dsw-alias-state-error-primary);
  --sqm-warn: var(--dsw-alias-state-warn-primary);
  height: 100%;
  min-height: 0;
  overflow: auto;
  box-sizing: border-box;
  background: var(--dsw-alias-bg-base);
  color: var(--sqm-fg);
  padding: 26px clamp(16px, 4vw, 44px) 38px;
  font-size: 13px;
  line-height: 1.55;
}
.sqm-page *, .sqm-page *::before, .sqm-page *::after { box-sizing: border-box; }
.sqm-page button, .sqm-page input, .sqm-page select, .sqm-page textarea { font: inherit; }
.sqm-page button { color: inherit; }
.sqm-shell { width: 100%; max-width: 1320px; margin: 0 auto; display: flex; flex-direction: column; gap: 14px; }
.sqm-hero { display: flex; align-items: center; gap: 14px; padding: 2px 2px 4px; }
.sqm-hero-mark {
  width: 46px; height: 46px; flex: 0 0 46px; display: grid; place-items: center;
  border-radius: 13px; color: var(--sqm-brand);
  background: var(--sqm-card); border: 1px solid var(--sqm-line);
}
.sqm-hero-text { min-width: 0; flex: 1 1 auto; }
.sqm-hero-title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.sqm-hero h1 { margin: 0; font-size: 22px; line-height: 1.25; font-weight: 650; letter-spacing: -.015em; }
.sqm-hero p { margin: 4px 0 0; color: var(--sqm-dim); font-size: 12.5px; line-height: 1.55; max-width: 900px; }
.sqm-hero-actions { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; flex-wrap: wrap; }
.sqm-pill {
  display: inline-flex; align-items: center; gap: 5px; height: 22px; padding: 0 8px;
  border-radius: 999px; border: 1px solid var(--sqm-line);
  background: var(--sqm-card); color: var(--sqm-dim);
  font-size: 10.5px; font-weight: 500; white-space: nowrap;
}
.sqm-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex: 0 0 auto; }
.sqm-pill .sqm-dot { background: var(--sqm-success); }
.sqm-statbar {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 7px 12px; border: 1px solid var(--sqm-line); border-radius: 10px;
  background: var(--sqm-card); color: var(--sqm-dim); font-size: 11px;
}
.sqm-stat { display: inline-flex; align-items: baseline; gap: 5px; white-space: nowrap; }
.sqm-stat strong { color: var(--sqm-fg); font-size: 13px; font-weight: 650; font-variant-numeric: tabular-nums; }
.sqm-stat-divider { width: 1px; height: 12px; background: var(--sqm-line); }
.sqm-path-note {
  display: inline-flex; align-items: center; gap: 6px; min-width: 0; max-width: 100%;
  margin-left: auto; padding: 4px 7px; color: var(--sqm-dim); font-size: 10.5px;
  white-space: nowrap;
}
.sqm-workspace { display: grid; grid-template-columns: 268px minmax(0, 1fr); gap: 16px; align-items: start; }
.sqm-rail {
  position: sticky; top: 0; display: flex; flex-direction: column; gap: 9px;
  padding: 10px; border: 1px solid var(--sqm-line); border-radius: 14px;
  background: var(--sqm-card); max-height: calc(100vh - 120px); overflow: auto;
}
.sqm-rail-head { display: flex; align-items: center; justify-content: space-between; padding: 1px 3px 2px; color: var(--sqm-dim); font-size: 10.5px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
.sqm-system-list { display: flex; flex-direction: column; gap: 3px; }
.sqm-system-card {
  display: flex; align-items: center; gap: 2px; min-width: 0;
  border: 1px solid transparent; border-radius: 9px; background: transparent;
  transition: background .14s ease, border-color .14s ease;
}
.sqm-system-card:hover { background: var(--sqm-nested); }
.sqm-system-card.active { background: var(--sqm-nested); border-color: var(--sqm-line-strong); }
.sqm-system-card.missing { border-color: color-mix(in srgb, var(--sqm-warn) 28%, transparent); }
.sqm-system-card.all { width: 100%; padding: 7px 8px; text-align: left; cursor: pointer; }
.sqm-system-main {
  display: flex; align-items: center; gap: 8px; flex: 1 1 auto; min-width: 0;
  padding: 7px 8px; border: 0; border-radius: 9px; background: transparent;
  text-align: left; cursor: pointer;
}
.sqm-system-main:focus-visible, .sqm-system-card.all:focus-visible { outline: 2px solid var(--sqm-brand); outline-offset: -1px; }
.sqm-system-avatar {
  width: 24px; height: 24px; flex: 0 0 24px; display: grid; place-items: center;
  border-radius: 7px; background: color-mix(in srgb, var(--sqm-brand) 13%, var(--sqm-nested));
  color: var(--sqm-brand); font-size: 11px; font-weight: 700; text-transform: uppercase;
}
.sqm-system-avatar.all { background: var(--sqm-nested); color: var(--sqm-dim); }
.sqm-system-avatar.missing { background: color-mix(in srgb, var(--sqm-warn) 12%, var(--sqm-nested)); color: var(--sqm-warn); }
.sqm-system-text { display: flex; flex-direction: column; min-width: 0; gap: 0; }
.sqm-system-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 550; }
.sqm-system-meta { color: var(--sqm-dim); font-size: 9.8px; white-space: nowrap; }
.sqm-system-meta.missing { color: var(--sqm-warn); }
.sqm-system-path {
  max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: var(--sqm-dim); opacity: .72;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 8.8px;
}
.sqm-system-actions { display: flex; align-items: center; gap: 0; opacity: 0; padding-right: 4px; transition: opacity .12s ease; }
.sqm-system-card:hover .sqm-system-actions, .sqm-system-card.active .sqm-system-actions, .sqm-system-card:focus-within .sqm-system-actions { opacity: 1; }
.sqm-rail-empty { padding: 14px 8px; text-align: center; color: var(--sqm-dim); }
.sqm-rail-empty p { margin: 0 0 2px; color: var(--sqm-fg); font-size: 12px; font-weight: 600; }
.sqm-rail-empty span { display: block; margin-bottom: 9px; font-size: 10.5px; line-height: 1.45; }
.sqm-rail-foot { display: flex; align-items: center; gap: 5px; margin-top: 2px; padding: 8px 4px 1px; border-top: 1px solid var(--sqm-line); color: var(--sqm-dim); font-size: 9.8px; }
.sqm-main { min-width: 0; display: flex; flex-direction: column; gap: 12px; }
.sqm-search-panel { padding: 11px 12px 8px; border: 1px solid var(--sqm-line); border-radius: 13px; background: var(--sqm-card); }
.sqm-search-box {
  display: flex; align-items: center; gap: 8px; min-height: 38px; padding: 0 9px;
  border: 1px solid var(--sqm-line); border-radius: 9px; background: var(--sqm-nested);
  color: var(--sqm-dim);
}
.sqm-search-box:focus-within { border-color: var(--sqm-brand); }
.sqm-search-input {
  flex: 1 1 auto; min-width: 0; height: 36px; padding: 0; border: 0; outline: 0;
  background: transparent; color: var(--sqm-fg); font-size: 13px;
}
.sqm-search-input::placeholder { color: var(--sqm-dim); opacity: .8; }
.sqm-search-input::-webkit-search-cancel-button { display: none; }
.sqm-search-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 7px 2px 0; color: var(--sqm-dim); font-size: 10.5px; }
.sqm-search-hint { min-width: 0; }
.sqm-filter-chip {
  display: inline-flex; align-items: center; gap: 5px; height: 21px; padding: 0 5px 0 7px;
  border: 1px solid var(--sqm-line); border-radius: 999px; background: var(--sqm-nested);
  color: var(--sqm-fg); font-size: 10px; white-space: nowrap;
}
.sqm-filter-chip button { display: inline-grid; place-items: center; width: 17px; height: 17px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--sqm-dim); cursor: pointer; }
.sqm-filter-chip button:hover { background: var(--sqm-card); color: var(--sqm-fg); }
.sqm-result-count { margin-left: auto; color: var(--sqm-fg); font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
.sqm-truncated { color: var(--sqm-warn); }
.sqm-error {
  display: flex; align-items: flex-start; gap: 8px; margin: 2px 0;
  padding: 9px 11px; border: 1px solid color-mix(in srgb, var(--sqm-danger) 30%, var(--sqm-line));
  border-radius: 9px; background: color-mix(in srgb, var(--sqm-danger) 6%, transparent);
  color: var(--sqm-danger); font-size: 11.5px; line-height: 1.5;
}
.sqm-error > svg { flex: 0 0 auto; margin-top: 1px; }
.sqm-error-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1 1 auto; }
.sqm-error-detail { color: var(--sqm-dim); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 10.5px; word-break: break-word; }
.sqm-error .sqm-btn { flex: 0 0 auto; }
.sqm-issue-box {
  display: flex; align-items: flex-start; gap: 8px; padding: 9px 11px;
  border: 1px solid color-mix(in srgb, var(--sqm-warn) 32%, var(--sqm-line));
  border-radius: 9px; background: color-mix(in srgb, var(--sqm-warn) 6%, transparent);
  color: var(--sqm-warn); font-size: 11px;
}
.sqm-issue-box > svg { flex: 0 0 auto; margin-top: 1px; }
.sqm-issue-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.sqm-issue-text strong { font-weight: 650; }
.sqm-issue-text span { color: var(--sqm-dim); }
.sqm-issue-text ul { margin: 3px 0 0; padding-left: 16px; color: var(--sqm-dim); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 10px; }
.sqm-card { background: var(--sqm-card); border: 1px solid var(--sqm-line); border-radius: 14px; padding: 18px; }
.sqm-sql-list { display: flex; flex-direction: column; gap: 11px; }
.sqm-sql-card {
  background: var(--sqm-card); border: 1px solid var(--sqm-line); border-radius: 13px;
  padding: 14px 15px 13px; transition: border-color .14s ease;
}
.sqm-sql-card:hover { border-color: var(--sqm-line-strong); }
.sqm-sql-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.sqm-sql-title-wrap { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
.sqm-sql-title { margin: 0; font-size: 14px; line-height: 1.35; font-weight: 650; letter-spacing: -.005em; overflow-wrap: anywhere; }
.sqm-system-pill {
  display: inline-flex; align-items: center; gap: 4px; height: 21px; padding: 0 7px;
  border: 1px solid var(--sqm-line); border-radius: 999px; background: var(--sqm-nested);
  color: var(--sqm-dim); font-size: 10px; white-space: nowrap; cursor: pointer;
}
.sqm-system-pill:hover { color: var(--sqm-fg); border-color: var(--sqm-line-strong); }
.sqm-sql-time { color: var(--sqm-dim); font-size: 9.8px; white-space: nowrap; }
.sqm-sql-actions { display: flex; align-items: center; gap: 1px; flex: 0 0 auto; }
.sqm-icon-btn {
  display: inline-grid; place-items: center; width: 28px; height: 28px; padding: 0;
  border: 1px solid transparent; border-radius: 7px; background: transparent;
  color: var(--sqm-dim); cursor: pointer; flex: 0 0 auto;
  transition: background .12s ease, color .12s ease, border-color .12s ease;
}
.sqm-icon-btn:hover:not(:disabled) { background: var(--sqm-nested); border-color: var(--sqm-line); color: var(--sqm-fg); }
.sqm-icon-btn.danger:hover:not(:disabled) { color: var(--sqm-danger); border-color: color-mix(in srgb, var(--sqm-danger) 28%, var(--sqm-line)); background: color-mix(in srgb, var(--sqm-danger) 7%, transparent); }
.sqm-icon-btn.tiny { width: 23px; height: 23px; border-radius: 6px; }
.sqm-icon-btn:focus-visible, .sqm-btn:focus-visible, .sqm-system-pill:focus-visible, .sqm-more-btn:focus-visible {
  outline: 2px solid var(--sqm-brand); outline-offset: 1px;
}
.sqm-remark { margin: 5px 0 0; color: var(--sqm-dim); font-size: 11.5px; line-height: 1.55; overflow-wrap: anywhere; }
.sqm-remark.muted { opacity: .7; font-style: italic; }
.sqm-match-row { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-top: 8px; }
.sqm-match-label { color: var(--sqm-dim); font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.sqm-match-chip {
  display: inline-flex; align-items: center; height: 19px; padding: 0 6px;
  border: 1px solid color-mix(in srgb, var(--sqm-brand) 25%, var(--sqm-line));
  border-radius: 5px; background: color-mix(in srgb, var(--sqm-brand) 7%, transparent);
  color: var(--sqm-brand); font-size: 9.8px; white-space: nowrap;
}
.sqm-code {
  position: relative; margin-top: 10px; border: 1px solid var(--sqm-line); border-radius: 9px;
  background: var(--sqm-nested); overflow: hidden;
}
.sqm-code:not(.expanded) { max-height: 176px; }
.sqm-code.faded::after {
  content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 48px;
  background: linear-gradient(to bottom, transparent, var(--sqm-nested));
  pointer-events: none;
}
.sqm-code-pre {
  margin: 0; padding: 10px 12px; overflow: auto; max-height: 520px;
  color: var(--sqm-fg); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px; line-height: 1.55; white-space: pre; tab-size: 2;
}
.sqm-code-pre code { font: inherit; }
.sqm-more-btn {
  display: inline-flex; align-items: center; gap: 4px; margin-top: 7px; padding: 2px 1px;
  border: 0; background: transparent; color: var(--sqm-dim); font-size: 10px; cursor: pointer;
}
.sqm-more-btn:hover { color: var(--sqm-fg); }
.sqm-tags { display: flex; flex-direction: column; gap: 5px; margin-top: 10px; padding-top: 9px; border-top: 1px solid var(--sqm-line); }
.sqm-tag-row { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; min-width: 0; }
.sqm-tag-label { min-width: 28px; color: var(--sqm-dim); font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.sqm-tag {
  display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 6px;
  border: 1px solid var(--sqm-line); border-radius: 5px; background: var(--sqm-nested);
  color: var(--sqm-dim); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 9.8px; white-space: nowrap; max-width: 240px; overflow: hidden; text-overflow: ellipsis;
}
.sqm-tag.table { color: color-mix(in srgb, var(--sqm-brand) 78%, var(--sqm-fg)); }
.sqm-tag.field { color: var(--sqm-dim); }
.sqm-tag svg { flex: 0 0 auto; opacity: .8; }
.sqm-tag-more { color: var(--sqm-dim); font-size: 9.8px; }
.sqm-empty { text-align: center; padding: 36px 18px 38px; color: var(--sqm-dim); }
.sqm-empty-icon {
  width: 46px; height: 46px; margin: 0 auto 11px; display: grid; place-items: center;
  border-radius: 13px; background: var(--sqm-nested); border: 1px solid var(--sqm-line); color: var(--sqm-dim);
}
.sqm-empty h3 { margin: 0; color: var(--sqm-fg); font-size: 13.5px; font-weight: 650; }
.sqm-empty p { margin: 5px auto 0; max-width: 520px; font-size: 11.5px; line-height: 1.6; }
.sqm-empty .sqm-btn { margin-top: 14px; }
.sqm-skeleton-card { padding: 15px; border: 1px solid var(--sqm-line); border-radius: 13px; background: var(--sqm-card); }
.sqm-skeleton { background: var(--sqm-nested); border-radius: 5px; animation: sqm-pulse 1.2s ease-in-out infinite; }
.sqm-skeleton.line { height: 11px; margin-bottom: 9px; }
.sqm-skeleton.line.w40 { width: 40%; }
.sqm-skeleton.line.w75 { width: 75%; }
.sqm-skeleton.code { height: 92px; margin-top: 12px; }
.sqm-spinner {
  width: 15px; height: 15px; border-radius: 50%; flex: 0 0 auto;
  border: 2px solid color-mix(in srgb, var(--sqm-brand) 24%, transparent);
  border-top-color: var(--sqm-brand);
  animation: sqm-spin .7s linear infinite;
}
.sqm-spinner.small { width: 12px; height: 12px; border-width: 1.8px; }
.sqm-footer { display: flex; justify-content: space-between; gap: 12px; padding: 2px 2px 0; color: var(--sqm-dim); font-size: 9.8px; }
.sqm-footer-dot { margin: 0 5px; opacity: .55; }
.sqm-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  height: 32px; padding: 0 12px; border-radius: 8px;
  border: 1px solid var(--sqm-line); background: var(--sqm-nested); color: var(--sqm-fg);
  font-size: 12px; font-weight: 550; line-height: 1; cursor: pointer; white-space: nowrap;
  transition: background .14s ease, border-color .14s ease, filter .14s ease, opacity .14s ease;
}
.sqm-btn:hover:not(:disabled) { background: var(--sqm-card); border-color: var(--sqm-line-strong); }
.sqm-btn.primary { background: var(--sqm-brand); border-color: var(--sqm-brand); color: var(--dsw-alias-bg-base); }
.sqm-btn.primary:hover:not(:disabled) { filter: brightness(1.06); background: var(--sqm-brand); border-color: var(--sqm-brand); }
.sqm-btn.danger {
  color: var(--sqm-danger); border-color: color-mix(in srgb, var(--sqm-danger) 35%, var(--sqm-line));
  background: color-mix(in srgb, var(--sqm-danger) 7%, transparent);
}
.sqm-btn.danger:hover:not(:disabled) { background: color-mix(in srgb, var(--sqm-danger) 12%, transparent); border-color: var(--sqm-danger); }
.sqm-btn.tiny { height: 26px; padding: 0 8px; border-radius: 7px; font-size: 10.5px; }
.sqm-btn:disabled { opacity: .45; cursor: not-allowed; }
.sqm-backdrop {
  position: fixed; inset: 0; z-index: 80; display: flex; align-items: flex-start; justify-content: center;
  padding: 7vh 16px 24px; overflow: auto;
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 24%, transparent);
  animation: sqm-fade-in .14s ease-out;
}
.sqm-modal {
  width: 100%; border: 1px solid var(--sqm-line-strong); border-radius: 15px;
  background: var(--sqm-overlay); color: var(--sqm-fg);
  box-shadow: 0 18px 60px color-mix(in srgb, var(--dsw-alias-label-primary) 24%, transparent);
  animation: sqm-rise-in .16s ease-out;
  outline: none;
}
.sqm-modal-head { display: flex; align-items: flex-start; gap: 11px; padding: 16px 18px 0; }
.sqm-modal-icon {
  width: 36px; height: 36px; flex: 0 0 36px; display: grid; place-items: center;
  border-radius: 10px; background: var(--sqm-nested); border: 1px solid var(--sqm-line); color: var(--sqm-brand);
}
.sqm-modal.danger .sqm-modal-icon { color: var(--sqm-danger); }
.sqm-modal-title { flex: 1 1 auto; min-width: 0; }
.sqm-modal-title h2 { margin: 0; font-size: 15.5px; line-height: 1.35; font-weight: 650; }
.sqm-modal-title p { margin: 3px 0 0; color: var(--sqm-dim); font-size: 11px; line-height: 1.5; }
.sqm-modal-body { padding: 14px 18px 17px; }
.sqm-modal-foot {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 11px 18px; border-top: 1px solid var(--sqm-line);
  background: color-mix(in srgb, var(--sqm-nested) 45%, transparent);
  border-radius: 0 0 15px 15px;
}
.sqm-foot-spacer { flex: 1 1 auto; }
.sqm-kbd-hint { color: var(--sqm-dim); font-size: 9.8px; }
.sqm-form { display: flex; flex-direction: column; gap: 12px; }
.sqm-form-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: 12px; }
.sqm-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.sqm-field label { color: var(--sqm-dim); font-size: 10.5px; font-weight: 550; }
.sqm-label-row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.sqm-label-hint { color: var(--sqm-dim); font-size: 9.8px; }
.sqm-input, .sqm-select, .sqm-textarea {
  width: 100%; border: 1px solid var(--sqm-line); border-radius: 8px;
  background: var(--sqm-nested); color: var(--sqm-fg); outline: none;
}
.sqm-input, .sqm-select { height: 36px; padding: 0 10px; font-size: 12.5px; }
.sqm-select { cursor: pointer; }
.sqm-textarea { padding: 8px 10px; font-size: 12.5px; line-height: 1.5; resize: vertical; }
.sqm-textarea.remark { min-height: 58px; }
.sqm-textarea.code { min-height: 190px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11.5px; line-height: 1.55; tab-size: 2; }
.sqm-input.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11.5px; }
.sqm-input:focus, .sqm-select:focus, .sqm-textarea:focus { border-color: var(--sqm-brand); }
.sqm-input::placeholder, .sqm-textarea::placeholder { color: var(--sqm-dim); opacity: .76; }
.sqm-input:disabled, .sqm-select:disabled, .sqm-textarea:disabled { opacity: .6; }
.sqm-fixed-field {
  display: flex; align-items: center; gap: 6px; height: 36px; padding: 0 10px;
  border: 1px solid var(--sqm-line); border-radius: 8px; background: var(--sqm-nested);
  color: var(--sqm-dim); font-size: 12px;
}
.sqm-parse-box { margin-top: 1px; padding: 9px 10px; border: 1px solid var(--sqm-line); border-radius: 9px; background: var(--sqm-nested); }
.sqm-parse-head { display: flex; align-items: center; gap: 6px; color: var(--sqm-dim); font-size: 10px; font-weight: 600; letter-spacing: .03em; text-transform: uppercase; }
.sqm-parse-tags { display: flex; flex-direction: column; gap: 5px; margin-top: 7px; }
.sqm-parse-empty { margin: 6px 0 0; color: var(--sqm-dim); font-size: 10.5px; line-height: 1.5; }
.sqm-warning-text { margin: 0; color: var(--sqm-fg); font-size: 12.5px; line-height: 1.65; overflow-wrap: anywhere; }
.sqm-path-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sqm-path-row .sqm-input { flex: 1 1 240px; }
.sqm-path-suggestion { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; color: var(--sqm-dim); font-size: 10px; }
.sqm-path-suggestion .sqm-mono-line { min-width: 0; overflow-wrap: anywhere; }
.sqm-link-btn { padding: 1px 0; border: 0; background: transparent; color: var(--sqm-brand); font-size: 10px; cursor: pointer; }
.sqm-link-btn:hover:not(:disabled) { text-decoration: underline; }
.sqm-link-btn:disabled { opacity: .45; cursor: not-allowed; }
.sqm-path-hint { margin: 0; color: var(--sqm-dim); font-size: 10px; line-height: 1.45; }
.sqm-field-note { color: var(--sqm-dim); font-size: 9.8px; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sqm-field-note.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.sqm-inline-warning {
  display: flex; align-items: flex-start; gap: 7px; padding: 9px 10px;
  border: 1px solid color-mix(in srgb, var(--sqm-warn) 32%, var(--sqm-line));
  border-radius: 8px; background: color-mix(in srgb, var(--sqm-warn) 7%, transparent);
  color: var(--sqm-warn); font-size: 10.5px; line-height: 1.5;
}
.sqm-inline-warning svg { flex: 0 0 auto; margin-top: 1px; }
.sqm-empty-actions { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
.sqm-empty-actions .sqm-btn { margin-top: 0; }
.sqm-mono-line { overflow-wrap: anywhere; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 10px; }
.sqm-toast {
  position: fixed; left: 50%; bottom: 22px; z-index: 90; transform: translateX(-50%);
  display: flex; align-items: center; gap: 7px; max-width: min(520px, calc(100vw - 32px));
  padding: 9px 13px; border: 1px solid color-mix(in srgb, var(--sqm-success) 34%, var(--sqm-line));
  border-radius: 9px; background: var(--sqm-overlay); color: var(--sqm-success);
  box-shadow: 0 10px 32px color-mix(in srgb, var(--dsw-alias-label-primary) 20%, transparent);
  font-size: 11.5px; line-height: 1.4;
  animation: sqm-rise-in .16s ease-out;
}
.sqm-toast.error { color: var(--sqm-danger); border-color: color-mix(in srgb, var(--sqm-danger) 34%, var(--sqm-line)); }
@keyframes sqm-spin { to { transform: rotate(360deg); } }
@keyframes sqm-pulse { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
@keyframes sqm-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes sqm-rise-in { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: none; } }
@media (max-width: 980px) {
  .sqm-workspace { grid-template-columns: 220px minmax(0, 1fr); }
  .sqm-hero { align-items: flex-start; flex-wrap: wrap; }
  .sqm-hero-actions { width: 100%; justify-content: flex-end; }
}
@media (max-width: 760px) {
  .sqm-page { padding: 18px 12px 28px; }
  .sqm-workspace { grid-template-columns: 1fr; }
  .sqm-rail { position: static; max-height: none; }
  .sqm-system-list { flex-direction: row; overflow-x: auto; padding-bottom: 2px; }
  .sqm-system-card { flex: 0 0 auto; min-width: 146px; }
  .sqm-system-actions { opacity: 1; }
  .sqm-system-card.all { width: auto; min-width: 146px; }
  .sqm-rail-empty { width: 100%; }
  .sqm-rail-foot { display: none; }
  .sqm-form-grid { grid-template-columns: 1fr; }
  .sqm-hero h1 { font-size: 19px; }
  .sqm-hero-actions .sqm-btn { flex: 1 1 auto; }
  .sqm-search-hint { display: none; }
  .sqm-result-count { margin-left: 0; }
  .sqm-sql-head { gap: 6px; }
  .sqm-sql-time { display: none; }
  .sqm-modal-foot .sqm-kbd-hint { display: none; }
  .sqm-backdrop { padding: 3vh 8px 16px; }
  .sqm-modal-head, .sqm-modal-body, .sqm-modal-foot { padding-left: 13px; padding-right: 13px; }
  .sqm-footer { flex-direction: column; gap: 2px; }
}
@media (prefers-reduced-motion: reduce) {
  .sqm-spinner, .sqm-skeleton, .sqm-backdrop, .sqm-modal, .sqm-toast { animation: none; }
  .sqm-page * { transition: none !important; }
}
`

    function apply(ctx) {
      const locale = (ctx.get && ctx.get('locale')) || ctx.locale
      const slots = (ctx.get && ctx.get('slots')) || ctx.slots
      if (!locale || !slots) {
        console.error('[sql-manager] locale or slots service is unavailable')
        return
      }

      ctx.effect(() => {
        const snapshot = locale.getSnapshot()
        const disposers = snapshot.locales.map((item) => (
          locale.register(NS, item.id, isZh(item.id) ? MESSAGES.zh : MESSAGES.en)
        ))
        return () => {
          for (const dispose of disposers) dispose()
        }
      }, 'sql-manager: dictionaries')

      const t = makeTranslator(ctx)

      function Page() {
        return h(Boundary, { t }, h(SqlManagerApp, { ctx, t }))
      }

      ctx.effect(() => slots.inject('sidebar.panellist', () => slots.register({
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 62,
        label: () => t('appTitle'),
      }, (props) => h(SidebarIcon, {
        size: (props && props.size) || 20,
        active: Boolean(props && props.active),
      }))), 'sql-manager: sidebar entry')

      ctx.effect(() => slots.inject('main', () => slots.register({
        name: 'main',
        key: PANEL_ID,
      }, Page)), 'sql-manager: main page')

      console.log('[sql-manager] client registered')
    }

    return {
      inject: ['slots', 'locale'],
      apply,
      __test: { MESSAGES, errorCopy, formatDate },
    }
  },
})
