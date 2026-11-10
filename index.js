/**
 * Host half of SQL Manager.
 *
 * It owns the JSON store, a loopback-only HTTP API for the page in client.js,
 * and an agent tool over the same store methods.
 */

import { SqlStore, SqlStoreError, VERSION } from './sql-store.js'

const ROUTE = '/api/sql-manager'
const MAX_BODY_BYTES = 512 * 1024

function sendJson(res, status, payload) {
  if (res.writableEnded) return
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.setHeader('x-content-type-options', 'nosniff')
  res.setHeader('content-length', Buffer.byteLength(body))
  res.end(body)
}

function isLoopback(req) {
  const address = req.socket && req.socket.remoteAddress
  if (!address) return false
  return address === '::1'
    || address === '127.0.0.1'
    || address.startsWith('127.')
    || address.startsWith('::ffff:127.')
}

function isSameOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true
  try {
    return new URL(origin).host.toLowerCase() === String(req.headers.host || '').toLowerCase()
  } catch {
    return false
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new SqlStoreError(413, 'BODY_TOO_LARGE', '请求内容过大'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim()
      if (!raw) {
        resolve({})
        return
      }
      try {
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          reject(new SqlStoreError(400, 'INVALID_BODY', '请求内容必须是 JSON 对象'))
          return
        }
        resolve(parsed)
      } catch {
        reject(new SqlStoreError(400, 'INVALID_BODY', '请求内容不是有效的 JSON'))
      }
    })
    req.on('error', (error) => {
      reject(new SqlStoreError(400, 'INVALID_BODY', '读取请求失败', String(error && error.message || error)))
    })
  })
}

function requireJson(req) {
  const contentType = String(req.headers['content-type'] || '').toLowerCase()
  if (!contentType.startsWith('application/json')) {
    throw new SqlStoreError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type 必须是 application/json')
  }
}

function sendError(res, error) {
  const known = error instanceof SqlStoreError
  const status = known ? error.status : 500
  const code = known ? error.code : 'INTERNAL_ERROR'
  const message = known ? error.message : '服务内部错误'
  const detail = known ? error.detail : String(error && error.message || error)
  if (!known) console.error('[sql-manager]', error)
  sendJson(res, status, { ok: false, code, message, detail })
}

function decodeParts(pathname) {
  return pathname.split('/').filter(Boolean).map((part) => {
    try {
      return decodeURIComponent(part)
    } catch {
      throw new SqlStoreError(400, 'VALIDATION', '路径参数编码无效')
    }
  })
}

async function handle(req, res, store) {
  if (!isLoopback(req)) {
    sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: '该接口只允许本机访问' })
    return
  }

  const method = String(req.method || 'GET').toUpperCase()
  if (method !== 'GET' && method !== 'HEAD' && !isSameOrigin(req)) {
    throw new SqlStoreError(403, 'FORBIDDEN', '请求来源与页面不一致')
  }

  const url = new URL(String(req.url || '/'), 'http://localhost')
  if (!url.pathname.startsWith(ROUTE)) {
    sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: '接口不存在' })
    return
  }
  const pathname = url.pathname.slice(ROUTE.length).replace(/\/+$/, '') || '/'
  const parts = decodeParts(pathname)

  if ((method === 'GET' || method === 'HEAD') && pathname === '/') {
    sendJson(res, 200, {
      ok: true,
      plugin: 'sql-manager',
      version: VERSION,
      route: ROUTE,
      registryPath: store.registryPath,
      suggestedFolder: store.suggestedFolder,
    })
    return
  }

  if (method === 'GET' && pathname === '/state') {
    const state = await store.state({
      q: url.searchParams.get('q') || '',
      system: url.searchParams.get('system') || '',
      limit: url.searchParams.get('limit') || undefined,
    })
    sendJson(res, 200, { ok: true, ...state })
    return
  }

  if (method === 'POST' && pathname === '/parse') {
    requireJson(req)
    const body = await readJson(req)
    const analysis = await store.parse(body.sql)
    sendJson(res, 200, { ok: true, ...analysis })
    return
  }

  if (method === 'POST' && pathname === '/systems') {
    requireJson(req)
    const body = await readJson(req)
    const result = await store.createSystem({
      name: body.name,
      description: body.description,
      path: body.path,
    })
    sendJson(res, 200, { ok: true, ...result })
    return
  }

  if (parts[0] === 'systems' && parts.length === 2) {
    if (method === 'PATCH' || method === 'PUT') {
      requireJson(req)
      const body = await readJson(req)
      const result = await store.updateSystem(parts[1], body)
      sendJson(res, 200, { ok: true, ...result })
      return
    }
    if (method === 'DELETE') {
      requireJson(req)
      const body = await readJson(req)
      const result = await store.deleteSystem(parts[1], body.confirmName)
      sendJson(res, 200, { ok: true, ...result })
      return
    }
  }

  if (method === 'POST' && pathname === '/sql') {
    requireJson(req)
    const body = await readJson(req)
    const result = await store.addSql({
      system: body.system,
      name: body.name,
      remark: body.remark,
      sql: body.sql,
      createSystemIfMissing: body.createSystemIfMissing === true,
      path: body.path,
      systemDescription: body.systemDescription,
    })
    sendJson(res, 200, { ok: true, ...result })
    return
  }

  if (parts[0] === 'sql' && parts.length === 3) {
    if (method === 'PUT' || method === 'PATCH') {
      requireJson(req)
      const body = await readJson(req)
      const result = await store.updateSql(parts[1], parts[2], body)
      sendJson(res, 200, { ok: true, ...result })
      return
    }
    if (method === 'DELETE') {
      requireJson(req)
      await readJson(req)
      const result = await store.deleteSql(parts[1], parts[2])
      sendJson(res, 200, { ok: true, ...result })
      return
    }
  }

  sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: '接口不存在' })
}

function textContent(text) {
  return [{ type: 'text', text }]
}

function toolMessage(value) {
  const lines = [value.message]
  const result = value.result || {}
  if (Array.isArray(result.items)) {
    if (result.items.length === 0) {
      lines.push('No matching SQL.')
    } else {
      for (const item of result.items) {
        lines.push('')
        lines.push(`[${item.systemName}] ${item.name}${item.remark ? ` — ${item.remark}` : ''}`)
        lines.push(`id: ${item.id} (system: ${item.systemId})`)
        if (item.systemPath) lines.push(`system JSON: ${item.systemPath}`)
        if (item.tables && item.tables.length) lines.push(`tables: ${item.tables.join(', ')}`)
        if (item.fields && item.fields.length) lines.push(`fields: ${item.fields.join(', ')}`)
        lines.push(item.sql)
      }
      if (result.truncated) lines.push('', 'More rows exist; narrow the query or raise limit.')
    }
  } else if (result.systems) {
    for (const system of result.systems) {
      lines.push(`- ${system.name} (${system.id}) — ${system.count} SQL${system.missing ? ' [missing]' : ''}`)
      if (system.path) lines.push(`  ${system.path}`)
    }
  } else if (result.record) {
    lines.push('', `[${result.record.systemName}] ${result.record.name}`)
    if (result.record.systemPath) lines.push(`system JSON: ${result.record.systemPath}`)
    if (result.record.remark) lines.push(result.record.remark)
    if (result.record.tables && result.record.tables.length) lines.push(`tables: ${result.record.tables.join(', ')}`)
    if (result.record.fields && result.record.fields.length) lines.push(`fields: ${result.record.fields.join(', ')}`)
    lines.push(result.record.sql)
  } else if (result.system) {
    lines.push('', `system: ${result.system.name} (${result.system.id}), ${result.system.count} SQL`)
    if (result.system.path) lines.push(`system JSON: ${result.system.path}`)
  }
  if (result.registryPath) lines.push('', `registry: ${result.registryPath}`)
  return textContent(lines.join('\n'))
}

function createTool(store) {
  const actions = ['search', 'list_systems', 'add', 'update', 'delete', 'create_system', 'update_system', 'delete_system']
  return {
    name: 'sql_manager',
    description: [
      'Maintain the user\'s reusable SQL library, grouped by system.',
      'Every system is one JSON file at its own required path; there is no global folder.',
      'Search matches SQL name, remark, table names, field names, and raw SQL text.',
      'Call search first to obtain a SQL id, then update or delete it. Adding to a missing system fails unless createSystemIfMissing is true and path is supplied.',
    ].join(' '),
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['action'],
      properties: {
        action: {
          type: 'string',
          enum: actions,
          description: 'Operation to perform.',
        },
        query: {
          type: 'string',
          description: 'Search words for action=search; matches name, remark, table, field, and SQL text. Empty lists recent SQL.',
        },
        system: {
          type: 'string',
          description: 'System id or exact name. Required for add/update/delete/update_system/delete_system, optional as a filter for search.',
        },
        id: {
          type: 'string',
          description: 'SQL id from search. Required for update and delete.',
        },
        name: {
          type: 'string',
          description: 'SQL display name for add/update, or system name for create_system/update_system.',
        },
        remark: {
          type: 'string',
          description: 'Optional searchable note for the SQL.',
        },
        sql: {
          type: 'string',
          description: 'SQL text for add/update.',
        },
        description: {
          type: 'string',
          description: 'Optional system description for create_system/update_system.',
        },
        path: {
          type: 'string',
          description: 'Required for create_system and for add with createSystemIfMissing. Absolute JSON file path, or a folder path in which <system-id>.json is created. For update_system, the new path; changing it moves the JSON file.',
        },
        createSystemIfMissing: {
          type: 'boolean',
          description: 'For action=add, create the named system when it does not exist. Requires path.',
        },
        limit: {
          type: 'number',
          description: 'Maximum search results (1-100, default 20).',
        },
        confirmName: {
          type: 'string',
          description: 'For delete_system, the exact system name as a deletion confirmation.',
        },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['ok', 'message'],
        properties: {
          ok: { type: 'boolean' },
          message: { type: 'string' },
          result: {
            type: 'object',
            additionalProperties: true,
            properties: {},
          },
        },
      },
      render: (_args, value) => toolMessage(value),
    },
    async execute(args) {
      const action = args && args.action
      switch (action) {
        case 'search': {
          const limitValue = Number(args.limit)
          const limit = Number.isInteger(limitValue) && limitValue > 0 ? Math.min(limitValue, 100) : 20
          const state = await store.state({ q: args.query || '', system: args.system || '', limit })
          return {
            ok: true,
            message: `Found ${state.total} SQL${state.query ? ` matching "${state.query}"` : ''}.`,
            result: {
              items: state.items,
              total: state.total,
              truncated: state.truncated,
              systems: state.systems,
              registryPath: state.registryPath,
            },
          }
        }
        case 'list_systems': {
          const state = await store.state({ limit: 1 })
          return {
            ok: true,
            message: `${state.totalSystems} systems, ${state.totalSqls} SQL.`,
            result: {
              systems: state.systems,
              totalSystems: state.totalSystems,
              totalSqls: state.totalSqls,
              registryPath: state.registryPath,
            },
          }
        }
        case 'create_system': {
          if (!args.name) throw new Error('create_system requires name')
          if (!args.path) throw new Error('create_system requires path (JSON file or folder)')
          const created = await store.createSystem({
            name: args.name,
            description: args.description,
            path: args.path,
          })
          return {
            ok: true,
            message: created.imported
              ? `Imported system "${created.system.name}" from ${created.system.path}.`
              : `Created system "${created.system.name}" at ${created.system.path}.`,
            result: created,
          }
        }
        case 'update_system': {
          if (!args.system) throw new Error('update_system requires system')
          const updated = await store.updateSystem(args.system, {
            name: args.name,
            description: args.description,
            path: args.path,
          })
          return {
            ok: true,
            message: updated.moved
              ? `Updated system "${updated.system.name}" and moved its JSON to ${updated.system.path}.`
              : `Updated system "${updated.system.name}".`,
            result: updated,
          }
        }
        case 'add': {
          if (!args.system) throw new Error('add requires system (id or name)')
          const added = await store.addSql({
            system: args.system,
            name: args.name,
            remark: args.remark,
            sql: args.sql,
            createSystemIfMissing: args.createSystemIfMissing === true,
            path: args.path,
            systemDescription: args.description,
          })
          return {
            ok: true,
            message: `Added SQL "${added.record.name}" to system "${added.system.name}".`,
            result: added,
          }
        }
        case 'update': {
          if (!args.system) throw new Error('update requires system')
          if (!args.id) throw new Error('update requires id from search')
          const updated = await store.updateSql(args.system, args.id, {
            name: args.name,
            remark: args.remark,
            sql: args.sql,
          })
          return {
            ok: true,
            message: `Updated SQL "${updated.record.name}".`,
            result: updated,
          }
        }
        case 'delete': {
          if (!args.system) throw new Error('delete requires system')
          if (!args.id) throw new Error('delete requires id from search')
          const deleted = await store.deleteSql(args.system, args.id)
          return {
            ok: true,
            message: `Deleted SQL "${deleted.record.name}" from system "${deleted.system.name}".`,
            result: deleted,
          }
        }
        case 'delete_system': {
          if (!args.system) throw new Error('delete_system requires system')
          if (!args.confirmName) throw new Error('delete_system requires confirmName with the exact system name')
          const deleted = await store.deleteSystem(args.system, args.confirmName)
          return {
            ok: true,
            message: `Deleted system "${deleted.system.name}" and its ${deleted.system.count} SQL.`,
            result: deleted,
          }
        }
        default:
          throw new Error(`unknown action "${String(action)}"; expected one of: ${actions.join(', ')}`)
      }
    },
  }
}

export const inject = ['webServer']

export function apply(ctx) {
  const webServer = (ctx.get && ctx.get('webServer')) || ctx.webServer
  if (!webServer || typeof webServer.register !== 'function') {
    console.error('[sql-manager] webServer service is unavailable')
    return
  }

  const store = new SqlStore()

  ctx.effect(
    () => webServer.register({
      kind: 'prefix',
      path: ROUTE,
      handler: async (req, res) => {
        try {
          await handle(req, res, store)
        } catch (error) {
          sendError(res, error)
        }
      },
    }),
    'sql-manager: HTTP route',
  )

  const tools = (ctx.get && ctx.get('tools')) || ctx.tools
  if (tools && typeof tools.register === 'function') {
    ctx.effect(() => tools.register(createTool(store)), 'sql-manager: agent tool')
  } else {
    console.warn('[sql-manager] tools service is unavailable; agent tool not registered')
  }

  console.log(`[sql-manager] v${VERSION} ready at ${ROUTE}`)
}

export const __test = {
  createTool,
  handle,
  isSameOrigin,
  isLoopback,
}
