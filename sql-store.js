/**
 * SQL Manager storage.
 *
 * Each system is one self-contained JSON file at its own path. A small
 * registry under $DSH_HOME/sql-manager/systems.json remembers those paths;
 * there is no single global data folder.
 */

import { copyFile, mkdir, readFile, readdir, rename, rm, stat, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export const VERSION = '1.1.0'
export const SYSTEM_SCHEMA = 'dsh.sql-manager.system/v1'
export const REGISTRY_SCHEMA = 'dsh.sql-manager.registry/v1'

const MAX_SYSTEM_NAME = 120
const MAX_SYSTEM_DESCRIPTION = 1000
const MAX_SQL_NAME = 160
const MAX_SQL_REMARK = 4000
const MAX_SQL_TEXT = 200000
const MAX_PATH_LENGTH = 1024
const MAX_QUERY_LENGTH = 240
const MAX_RESULT_LIMIT = 500
const MAX_TABLES = 80
const MAX_FIELDS = 300

const HOME = process.env.DSH_HOME || path.join(homedir(), '.dsh')

export const REGISTRY_PATH = path.join(HOME, 'sql-manager', 'systems.json')
export const SUGGESTED_FOLDER = path.join(HOME, 'sql-manager', 'sqls')

const LEGACY_ENV_FOLDER = process.env.SQL_MANAGER_DIR
  ? path.resolve(process.env.SQL_MANAGER_DIR)
  : null

const SQL_KEYWORDS = new Set([
  'select', 'from', 'where', 'and', 'or', 'not', 'null', 'is', 'in', 'like', 'ilike',
  'between', 'exists', 'group', 'by', 'order', 'having', 'limit', 'offset', 'fetch',
  'join', 'left', 'right', 'inner', 'outer', 'full', 'cross', 'natural', 'lateral',
  'on', 'using', 'as', 'distinct', 'distinctrow', 'union', 'all', 'any', 'some',
  'insert', 'into', 'values', 'value', 'update', 'set', 'delete', 'create', 'table',
  'drop', 'alter', 'add', 'column', 'primary', 'key', 'foreign', 'references', 'index',
  'unique', 'view', 'with', 'recursive', 'case', 'when', 'then', 'else', 'end', 'asc',
  'desc', 'nulls', 'first', 'last', 'over', 'partition', 'window', 'rows', 'range',
  'returning', 'merge', 'matched', 'source', 'target', 'truncate', 'replace', 'ignore',
  'only', 'unnest', 'generate_series', 'json_each', 'jsonb_each', 'openjson', 'string_split',
  'begin', 'commit', 'rollback', 'transaction', 'explain', 'analyze', 'vacuum', 'grant',
  'revoke', 'use', 'show', 'describe', 'declare', 'cursor', 'loop', 'while', 'if',
  'count', 'sum', 'avg', 'min', 'max', 'coalesce', 'concat', 'substr', 'substring',
  'date_format', 'ifnull', 'nullif', 'cast', 'convert', 'round', 'floor', 'ceil',
  'ceiling', 'upper', 'lower', 'trim', 'ltrim', 'rtrim', 'length', 'now', 'current_date',
  'current_timestamp', 'current_time', 'interval', 'row_number', 'rank', 'dense_rank',
  'date', 'time', 'timestamp', 'varchar', 'char', 'text', 'int', 'integer', 'bigint',
  'smallint', 'decimal', 'numeric', 'float', 'double', 'boolean', 'bool', 'json',
  'jsonb', 'blob', 'binary', 'default', 'constraint', 'check', 'auto_increment',
])

const FALSE_ALIASES = new Set([
  ...SQL_KEYWORDS,
  'where', 'set', 'on', 'using', 'group', 'order', 'having', 'limit', 'offset',
  'union', 'returning', 'join', 'left', 'right', 'inner', 'outer', 'full', 'cross',
])

const IDENT = '(?:[A-Za-z_\\u0080-\\uFFFF][\\w$\\u0080-\\uFFFF]*|"[^"]+"|`[^`]+`|\\[[^\\]]+\\])'
const QUALIFIED = `${IDENT}(?:\\s*\\.\\s*${IDENT})*`

export class SqlStoreError extends Error {
  constructor(status, code, message, detail) {
    super(message)
    this.name = 'SqlStoreError'
    this.status = status
    this.code = code
    this.detail = detail
  }
}

function fail(status, code, message, detail) {
  throw new SqlStoreError(status, code, message, detail)
}

function cleanText(value, max) {
  if (typeof value !== 'string') return ''
  return value.replace(/\r\n?/g, '\n').trim().slice(0, max)
}

function cleanLine(value, max) {
  return cleanText(value, max).replace(/\s+/g, ' ')
}

function normalizeStoragePath(value, home = HOME) {
  const raw = cleanText(value, MAX_PATH_LENGTH + 1)
  if (!raw) fail(400, 'VALIDATION', '存储路径不能为空')
  if (raw.length > MAX_PATH_LENGTH) fail(400, 'VALIDATION', '存储路径过长')
  if (raw.includes('\0')) fail(400, 'VALIDATION', '存储路径包含无效字符')

  let expanded = raw
  if (expanded === '~') expanded = home
  else if (expanded.startsWith('~/') || expanded.startsWith('~\\')) {
    expanded = path.join(home, expanded.slice(2))
  }
  return path.normalize(path.isAbsolute(expanded) ? expanded : path.resolve(home, expanded))
}

function pathKey(filePath) {
  const resolved = path.resolve(filePath)
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved
}

function fallbackSystemName(filePath) {
  return path.basename(filePath, path.extname(filePath)) || 'system'
}

function sanitizeId(value) {
  if (typeof value !== 'string') return ''
  const id = value
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
  if (!id || id === '.' || id === '..') return ''
  return id
}

function slugify(value) {
  const slug = String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/['’"]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return sanitizeId(slug) || 'system'
}

function nowIso() {
  return new Date().toISOString()
}

function isoOrNull(value) {
  if (typeof value !== 'string') return null
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? null : new Date(ms).toISOString()
}

function stringArray(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const out = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const text = item.trim()
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(text)
    if (out.length >= MAX_FIELDS) break
  }
  return out
}

function mergeNames(primary, secondary, cap) {
  const seen = new Set()
  const out = []
  for (const list of [primary, secondary]) {
    for (const item of list) {
      const key = item.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(item)
      if (out.length >= cap) return out
    }
  }
  return out
}

/* ------------------------------------------------------------- analysis --- */

function maskSql(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\r\n]*/g, ' ')
    .replace(/#(?![->])[^\r\n]*/g, ' ')
    .replace(/'(?:''|\\.|[^'])*'/g, "''")
}

function unquoteIdentifier(token) {
  let text = String(token || '').trim()
  if (text.length >= 2) {
    const first = text[0]
    const last = text[text.length - 1]
    if ((first === '"' && last === '"') || (first === '`' && last === '`')) {
      text = text.slice(1, -1).replace(first === '"' ? /""/g : /``/g, first)
    } else if (first === '[' && last === ']') {
      text = text.slice(1, -1).replace(/]]/g, ']')
    }
  }
  return text.trim()
}

function normalizeQualified(token) {
  return String(token || '')
    .split(/\s*\.\s*/)
    .map(unquoteIdentifier)
    .filter(Boolean)
    .join('.')
}

function baseName(token) {
  const parts = normalizeQualified(token).split('.')
  return parts[parts.length - 1] || ''
}

function isKeyword(token) {
  return SQL_KEYWORDS.has(unquoteIdentifier(token).toLowerCase())
}

function findTopLevelKeyword(source, keyword, start) {
  let depth = 0
  let quote = ''
  for (let index = start; index < source.length; index += 1) {
    const char = source[index]
    if (quote) {
      if (char === quote) {
        if (source[index + 1] === quote) index += 1
        else quote = ''
      }
      continue
    }
    if (char === '"' || char === '`' || char === '[') {
      quote = char === '[' ? ']' : char
      continue
    }
    if (char === '(') depth += 1
    else if (char === ')') depth = Math.max(0, depth - 1)
    else if (depth === 0) {
      const slice = source.slice(index, index + keyword.length)
      if (slice.toLowerCase() === keyword) {
        const before = index === 0 ? '' : source[index - 1]
        const after = source[index + keyword.length] || ''
        if (!/[\w$]/.test(before) && !/[\w$]/.test(after)) return index
      }
    }
  }
  return -1
}

function splitTopLevel(source) {
  const parts = []
  let depth = 0
  let quote = ''
  let start = 0
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (quote) {
      if (char === quote) {
        if (source[index + 1] === quote) index += 1
        else quote = ''
      }
      continue
    }
    if (char === '"' || char === '`' || char === '[') {
      quote = char === '[' ? ']' : char
      continue
    }
    if (char === '(') depth += 1
    else if (char === ')') depth = Math.max(0, depth - 1)
    else if (char === ',' && depth === 0) {
      parts.push(source.slice(start, index))
      start = index + 1
    }
  }
  parts.push(source.slice(start))
  return parts
}

function firstIdentifier(expression) {
  const re = new RegExp(`^\\s*(${IDENT})`, 'u')
  const match = re.exec(expression)
  return match ? match[1] : ''
}

function firstQualified(expression) {
  const re = new RegExp(`^\\s*(${QUALIFIED})`, 'u')
  const match = re.exec(expression)
  return match ? match[1] : ''
}

function enclosingParenIsSubquery(source, index) {
  const stack = []
  let quote = ''
  for (let cursor = 0; cursor < index; cursor += 1) {
    const char = source[cursor]
    if (quote) {
      if (char === quote) {
        if (source[cursor + 1] === quote) cursor += 1
        else quote = ''
      }
      continue
    }
    if (char === '"' || char === '`' || char === '[') {
      quote = char === '[' ? ']' : char
      continue
    }
    if (char === '(') stack.push(cursor)
    else if (char === ')') stack.pop()
  }
  if (stack.length === 0) return true
  const open = stack[stack.length - 1]
  return /^\s*(?:select|with)\b/iu.test(source.slice(open + 1, index))
}

/**
 * Extract table and field names from a SQL statement. This intentionally keeps
 * a deterministic, regex/scanner-based parser: it never executes SQL and only
 * needs to produce a useful search index.
 */
export function analyzeSql(sql) {
  const source = typeof sql === 'string' ? sql : ''
  const masked = maskSql(source)
  if (!masked.trim()) return { tables: [], fields: [] }

  const tables = new Map()
  const fields = new Map()
  const aliases = new Map()
  const cteNames = new Set()

  const addTable = (token) => {
    const table = normalizeQualified(token)
    if (!table || table.startsWith('(') || isKeyword(table)) return
    const key = table.toLowerCase()
    if (!tables.has(key)) tables.set(key, table)
  }
  const addField = (token) => {
    const field = unquoteIdentifier(token)
    if (!field || field === '*' || field.includes('.')) return
    if (isKeyword(field)) return
    const key = field.toLowerCase()
    if (!fields.has(key)) fields.set(key, field)
  }

  const cteRe = new RegExp(`\\bwith\\s+(?:recursive\\s+)?(${IDENT})|,\\s*(${IDENT})\\s*(?:\\([^)]*\\))?\\s+as\\s*\\(`, 'giu')
  let cte
  while ((cte = cteRe.exec(masked)) !== null) {
    const token = cte[1] || cte[2]
    if (token) cteNames.add(unquoteIdentifier(token).toLowerCase())
  }

  const occurrenceRe = new RegExp(
    `\\b(?:from|join|update|into|merge\\s+into|truncate\\s+(?:table\\s+)?|alter\\s+table|drop\\s+table|create\\s+table(?:\\s+if\\s+not\\s+exists)?)\\s+(${QUALIFIED})`,
    'giu',
  )
  let occurrence
  while ((occurrence = occurrenceRe.exec(masked)) !== null) {
    if (!enclosingParenIsSubquery(masked, occurrence.index)) continue
    if (/^update\b/iu.test(occurrence[0])) {
      const before = masked.slice(Math.max(0, occurrence.index - 16), occurrence.index)
      if (/(?:\bfor|\bkey)\s*$/iu.test(before)) continue
    }
    const tableToken = occurrence[1]
    const table = normalizeQualified(tableToken)
    if (!table || table.startsWith('(')) continue
    if (isKeyword(table)) continue
    addTable(table)
    aliases.set(baseName(table).toLowerCase(), table)
    aliases.set(table.toLowerCase(), table)
    const after = masked.slice(occurrenceRe.lastIndex)
    const aliasMatch = new RegExp(`^\\s+(?:as\\s+)?(${IDENT})`, 'iu').exec(after)
    if (aliasMatch) {
      const alias = unquoteIdentifier(aliasMatch[1])
      if (!FALSE_ALIASES.has(alias.toLowerCase())) aliases.set(alias.toLowerCase(), table)
    }
  }

  for (const alias of cteNames) {
    tables.delete(alias)
    aliases.delete(alias)
  }

  const fromStops = ['where', 'group', 'order', 'having', 'limit', 'offset', 'union', 'except', 'intersect', 'returning']
  let fromSearch = 0
  while (fromSearch < masked.length) {
    const fromIndex = findTopLevelKeyword(masked, 'from', fromSearch)
    if (fromIndex < 0) break
    let end = masked.length
    for (const stop of fromStops) {
      const at = findTopLevelKeyword(masked, stop, fromIndex + 4)
      if (at >= 0 && at < end) end = at
    }
    const semicolon = masked.indexOf(';', fromIndex + 4)
    if (semicolon >= 0 && semicolon < end) end = semicolon
    const clause = masked.slice(fromIndex + 4, end)
    for (const part of splitTopLevel(clause)) {
      const identifier = firstQualified(part)
      if (!identifier) continue
      if (cteNames.has(unquoteIdentifier(identifier).toLowerCase())) continue
      addTable(identifier)
      aliases.set(baseName(identifier).toLowerCase(), normalizeQualified(identifier))
    }
    fromSearch = Math.max(end, fromIndex + 4)
  }

  const qualifiedFieldRe = new RegExp(
    `(?<![\\w$])(${IDENT})\\s*\\.\\s*(${IDENT})(?:\\s*\\.\\s*(${IDENT}))?`,
    'giu',
  )
  let qualified
  while ((qualified = qualifiedFieldRe.exec(masked)) !== null) {
    const field = qualified[3] || qualified[2]
    if (!field || field === '*') continue
    const qualifiedTable = `${unquoteIdentifier(qualified[1])}.${unquoteIdentifier(qualified[2])}`
    if (!qualified[3] && tables.has(qualifiedTable.toLowerCase())) continue
    addField(field)
    if (qualified[3]) {
      addTable(qualifiedTable)
      aliases.set(unquoteIdentifier(qualified[2]).toLowerCase(), qualifiedTable)
    }
  }

  const insertRe = new RegExp(`\\binsert\\s+into\\s+${QUALIFIED}\\s*\\(([^)]*)\\)`, 'giu')
  let insert
  while ((insert = insertRe.exec(masked)) !== null) {
    for (const part of splitTopLevel(insert[1])) {
      const identifier = firstIdentifier(part)
      if (identifier) addField(identifier)
    }
  }

  const setRe = /\bset\s+([\s\S]*?)(?=\bwhere\b|\bfrom\b|\breturning\b|;|$)/giu
  let set
  while ((set = setRe.exec(masked)) !== null) {
    for (const part of splitTopLevel(set[1])) {
      const match = new RegExp(`^\\s*(${IDENT})\\s*=`, 'u').exec(part)
      if (match) addField(match[1])
    }
  }

  const conditionRe = new RegExp(
    `(${IDENT})\\s*(?:(?:=|<>|!=|<=|>=|<|>)|\\b(?:like|ilike|in|is|between)\\b)`,
    'giu',
  )
  let condition
  while ((condition = conditionRe.exec(masked)) !== null) {
    addField(condition[1])
  }

  const orderedRe = /\b(?:group\s+by|order\s+by)\s+([\s\S]*?)(?=\bhaving\b|\blimit\b|\boffset\b|\bunion\b|;|$)/giu
  let ordered
  while ((ordered = orderedRe.exec(masked)) !== null) {
    const expression = ordered[1].replace(/\b(?:asc|desc|nulls\s+(?:first|last))\b/giu, ' ')
    const identifierRe = new RegExp(IDENT, 'gu')
    let identifier
    while ((identifier = identifierRe.exec(expression)) !== null) {
      if (!aliases.has(unquoteIdentifier(identifier[0]).toLowerCase())) addField(identifier[0])
    }
  }

  const selectIndex = findTopLevelKeyword(masked, 'select', 0)
  if (selectIndex >= 0) {
    const fromIndex = findTopLevelKeyword(masked, 'from', selectIndex + 6)
    if (fromIndex > selectIndex) {
      const list = masked.slice(selectIndex + 6, fromIndex)
      for (const rawPart of splitTopLevel(list)) {
        let expression = rawPart
          .replace(/^\s*(?:distinct|distinctrow|all)\b/iu, ' ')
          .replace(new RegExp(`\\s+as\\s+${IDENT}\\s*$`, 'iu'), ' ')
          .replace(new RegExp(`\\s+${IDENT}\\s*$`, 'u'), ' ')
          .trim()
        if (!expression) continue
        if (new RegExp(`^${QUALIFIED}$`, 'u').test(expression)) {
          const field = baseName(expression)
          if (field && field !== '*' && !aliases.has(field.toLowerCase())) addField(field)
        }
      }
    }
  }

  const returningRe = /\breturning\s+([\s\S]*?)(?=;|$)/giu
  let returning
  while ((returning = returningRe.exec(masked)) !== null) {
    const identifierRe = new RegExp(IDENT, 'gu')
    let identifier
    while ((identifier = identifierRe.exec(returning[1])) !== null) {
      const token = unquoteIdentifier(identifier[0])
      if (!isKeyword(token) && !aliases.has(token.toLowerCase())) addField(token)
    }
  }

  return {
    tables: [...tables.values()].slice(0, MAX_TABLES),
    fields: [...fields.values()].slice(0, MAX_FIELDS),
  }
}

/* --------------------------------------------------------------- records --- */

function normalizeSqlRecord(raw, systemId, index) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const sql = typeof raw.sql === 'string' ? raw.sql.slice(0, MAX_SQL_TEXT) : ''
  if (!sql.trim()) return null
  const analysis = analyzeSql(sql)
  const storedTables = stringArray(raw.tables)
  const storedFields = stringArray(raw.fields)
  return {
    id: sanitizeId(raw.id) || `sql-${systemId}-${index + 1}`,
    name: cleanLine(raw.name, MAX_SQL_NAME) || `SQL ${index + 1}`,
    remark: cleanText(raw.remark, MAX_SQL_REMARK),
    sql,
    tables: mergeNames(analysis.tables, storedTables, MAX_TABLES),
    fields: mergeNames(analysis.fields, storedFields, MAX_FIELDS),
    createdAt: isoOrNull(raw.createdAt),
    updatedAt: isoOrNull(raw.updatedAt),
  }
}

function isSystemDocument(value) {
  return Array.isArray(value)
    || (value && typeof value === 'object' && (value.schema === SYSTEM_SCHEMA || Array.isArray(value.sqls)))
}

function normalizeSystem(raw, fileName, forcedId) {
  const listOnly = Array.isArray(raw)
  const looksLikeSystem = isSystemDocument(raw)
  if (!looksLikeSystem) return null
  if (listOnly) raw = { sqls: raw }
  if (!raw || typeof raw !== 'object') return null
  const fallbackId = path.basename(fileName, path.extname(fileName))
  const id = sanitizeId(forcedId) || sanitizeId(raw.id) || sanitizeId(fallbackId)
  if (!id) return null
  const name = cleanLine(raw.name, MAX_SYSTEM_NAME) || fallbackId
  const description = cleanText(raw.description, MAX_SYSTEM_DESCRIPTION)
  const seen = new Set()
  const sqls = []
  if (Array.isArray(raw.sqls)) {
    raw.sqls.forEach((item, index) => {
      const record = normalizeSqlRecord(item, id, index)
      if (!record) return
      let recordId = record.id
      let suffix = 2
      while (seen.has(recordId.toLowerCase())) {
        recordId = `${record.id}-${suffix}`
        suffix += 1
      }
      seen.add(recordId.toLowerCase())
      record.id = recordId
      sqls.push(record)
    })
  }
  return {
    schema: SYSTEM_SCHEMA,
    id,
    name,
    description,
    createdAt: isoOrNull(raw.createdAt),
    updatedAt: isoOrNull(raw.updatedAt),
    sqls,
  }
}

function publicSql(record, system) {
  return {
    ...record,
    systemId: system.id,
    systemName: system.name,
    systemPath: system.path || null,
  }
}

function systemSummary(system) {
  return {
    id: system.id,
    name: system.name,
    description: system.description,
    count: system.sqls.length,
    createdAt: system.createdAt,
    updatedAt: system.updatedAt,
    path: system.path || null,
    file: system.file || null,
    missing: system.missing === true,
    error: system.error || null,
  }
}

function locateSystem(systems, reference) {
  const value = cleanLine(reference, MAX_SYSTEM_NAME)
  if (!value) return null
  const lower = value.toLowerCase()
  return systems.find((system) => system.id.toLowerCase() === lower)
    || systems.find((system) => system.name.toLowerCase() === lower)
    || null
}

function buildMatch(record, system, query) {
  const tokens = cleanLine(query, MAX_QUERY_LENGTH).toLowerCase().split(' ').filter(Boolean)
  const matchedTables = []
  const matchedFields = []
  const flags = { name: false, remark: false, table: false, field: false, sql: false, system: false }
  if (tokens.length === 0) {
    return { score: 0, flags, matchedTables, matchedFields }
  }

  const name = record.name.toLowerCase()
  const remark = record.remark.toLowerCase()
  const sql = record.sql.toLowerCase()
  const systemName = system.name.toLowerCase()
  const tableKeys = record.tables.map((table) => ({ text: table, lower: table.toLowerCase() }))
  const fieldKeys = record.fields.map((field) => ({ text: field, lower: field.toLowerCase() }))
  let score = 0

  for (const token of tokens) {
    let hit = false
    if (name.includes(token)) {
      flags.name = true
      hit = true
      score += name === token ? 70 : 28
    }
    if (remark.includes(token)) {
      flags.remark = true
      hit = true
      score += 14
    }
    const exactTable = tableKeys.find((table) => table.lower === token || table.lower.split('.').includes(token))
    if (exactTable) {
      flags.table = true
      hit = true
      score += 46
    } else {
      const prefixTable = tableKeys.find((table) => table.lower.startsWith(token) || table.lower.split('.').some((part) => part.startsWith(token)))
      if (prefixTable) {
        flags.table = true
        hit = true
        score += 30
      }
    }
    const exactField = fieldKeys.find((field) => field.lower === token)
    if (exactField) {
      flags.field = true
      hit = true
      score += 40
    } else {
      const prefixField = fieldKeys.find((field) => field.lower.startsWith(token))
      if (prefixField) {
        flags.field = true
        hit = true
        score += 26
      }
    }
    if (sql.includes(token)) {
      flags.sql = true
      hit = true
      score += 6
    }
    if (systemName.includes(token)) {
      flags.system = true
      hit = true
      score += 4
    }
    if (!hit) return null
  }

  for (const table of tableKeys) {
    if (tokens.some((token) => table.lower.includes(token))) matchedTables.push(table.text)
  }
  for (const field of fieldKeys) {
    if (tokens.some((token) => field.lower.includes(token))) matchedFields.push(field.text)
  }
  return { score, flags, matchedTables, matchedFields }
}

function systemPayload(system, filePath) {
  return {
    schema: SYSTEM_SCHEMA,
    id: system.id,
    name: system.name,
    description: system.description,
    path: filePath,
    createdAt: system.createdAt || null,
    updatedAt: system.updatedAt || null,
    sqls: system.sqls,
  }
}

function registryEntry(system) {
  return { id: system.id, name: system.name, path: system.path }
}

function nextSystemId(entries, name) {
  const base = slugify(name) || 'system'
  const used = new Set(entries.map((entry) => entry.id.toLowerCase()))
  let id = base
  let suffix = 2
  while (used.has(id.toLowerCase())) {
    id = `${base}-${suffix}`
    suffix += 1
  }
  return id
}

function registryEntryName(entry) {
  return cleanLine(entry.name, MAX_SYSTEM_NAME) || fallbackSystemName(entry.path)
}

/* ----------------------------------------------------------------- store --- */

export class SqlStore {
  constructor(options = {}) {
    this.home = options.home ? path.resolve(options.home) : HOME
    this.registryPath = options.registryPath || path.join(this.home, 'sql-manager', 'systems.json')
    this.suggestedFolder = options.suggestedFolder || path.join(this.home, 'sql-manager', 'sqls')
    this.writeQueue = Promise.resolve()
  }

  withWriteLock(operation) {
    const run = this.writeQueue.then(operation, operation)
    this.writeQueue = run.then(() => undefined, () => undefined)
    return run
  }

  async atomicWrite(filePath, value) {
    const directory = path.dirname(filePath)
    await mkdir(directory, { recursive: true })
    const tempPath = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`)
    await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
    try {
      await rename(tempPath, filePath)
    } catch (error) {
      if (error && (error.code === 'EEXIST' || error.code === 'EPERM')) {
        await unlink(filePath).catch(() => {})
        await rename(tempPath, filePath)
      } else {
        await unlink(tempPath).catch(() => {})
        throw error
      }
    }
  }

  async fileExists(filePath) {
    try {
      await stat(filePath)
      return true
    } catch (error) {
      if (error && error.code === 'ENOENT') return false
      return false
    }
  }

  async readLegacySettingsFolder() {
    try {
      const legacySettingsPath = path.join(this.home, 'sql-manager', 'settings.json')
      const raw = await readFile(legacySettingsPath, 'utf8')
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && typeof parsed.directory === 'string') {
        return normalizeStoragePath(parsed.directory, this.home)
      }
    } catch {
      // No legacy settings, or they are unreadable; migration simply skips them.
    }
    return null
  }

  async migrateLegacy() {
    const directories = []
    const addDirectory = (directory) => {
      if (!directory) return
      if (directories.some((item) => pathKey(item) === pathKey(directory))) return
      directories.push(directory)
    }

    addDirectory(await this.readLegacySettingsFolder())
    addDirectory(LEGACY_ENV_FOLDER)
    addDirectory(this.suggestedFolder)

    const entries = []
    const issues = []
    const seenIds = new Set()
    const seenPaths = new Set()

    for (const directory of directories) {
      let names
      try {
        names = await readdir(directory)
      } catch {
        continue
      }
      for (const name of names) {
        if (!name.toLowerCase().endsWith('.json')) continue
        const filePath = path.join(directory, name)
        if (pathKey(filePath) === pathKey(this.registryPath)) continue
        if (seenPaths.has(pathKey(filePath))) continue
        try {
          const parsed = JSON.parse(await readFile(filePath, 'utf8'))
          if (!isSystemDocument(parsed)) continue
          const system = normalizeSystem(parsed, name)
          if (!system) continue
          let id = system.id
          let suffix = 2
          while (seenIds.has(id.toLowerCase())) {
            id = `${system.id}-${suffix}`
            suffix += 1
          }
          seenIds.add(id.toLowerCase())
          seenPaths.add(pathKey(filePath))
          entries.push({ id, name: system.name, path: filePath })
        } catch (error) {
          issues.push({
            file: filePath,
            message: `旧系统 JSON 无法迁移：${error && error.message ? error.message : String(error)}`,
          })
        }
      }
    }

    try {
      await this.writeRegistry(entries)
    } catch (error) {
      issues.push({
        file: this.registryPath,
        message: `无法写入系统注册表：${error && error.message ? error.message : String(error)}`,
      })
    }
    return { entries, issues }
  }

  async readRegistry() {
    try {
      const raw = await readFile(this.registryPath, 'utf8')
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.systems)) {
        throw new Error('注册表结构无效')
      }

      const entries = []
      const issues = []
      const seenIds = new Set()
      const seenPaths = new Set()
      for (const item of parsed.systems) {
        if (!item || typeof item !== 'object') {
          issues.push({ file: this.registryPath, message: '注册表包含无效条目' })
          continue
        }
        const id = sanitizeId(item.id)
        let filePath = ''
        try {
          filePath = typeof item.path === 'string' ? normalizeStoragePath(item.path, this.home) : ''
        } catch (error) {
          issues.push({ file: this.registryPath, message: `注册表路径无效：${error.message}` })
          continue
        }
        if (!id || !filePath) {
          issues.push({ file: this.registryPath, message: '注册表条目缺少系统 ID 或路径' })
          continue
        }
        if (seenIds.has(id.toLowerCase()) || seenPaths.has(pathKey(filePath))) {
          issues.push({ file: this.registryPath, message: `注册表存在重复的系统 ${id}` })
          continue
        }
        seenIds.add(id.toLowerCase())
        seenPaths.add(pathKey(filePath))
        entries.push({
          id,
          name: cleanLine(item.name, MAX_SYSTEM_NAME) || fallbackSystemName(filePath),
          path: filePath,
        })
      }
      return { entries, issues }
    } catch (error) {
      if (error && error.code === 'ENOENT') return this.migrateLegacy()
      return {
        entries: [],
        invalid: true,
        issues: [{
          file: this.registryPath,
          message: `系统注册表无法读取：${error && error.message ? error.message : String(error)}`,
        }],
      }
    }
  }

  async writeRegistry(entries) {
    const payload = {
      schema: REGISTRY_SCHEMA,
      systems: entries.map((entry) => ({
        id: entry.id,
        name: entry.name,
        path: entry.path,
      })),
      updatedAt: nowIso(),
    }
    await this.atomicWrite(this.registryPath, payload)
  }

  async resolveStoragePath(value, id) {
    const input = normalizeStoragePath(value, this.home)
    let info = null
    try {
      info = await stat(input)
    } catch (error) {
      if (!error || error.code !== 'ENOENT') {
        fail(500, 'IO_ERROR', '无法检查存储路径', String(error && error.message || error))
      }
    }
    if (info && info.isDirectory()) {
      return { filePath: path.join(input, `${id}.json`), isFolder: true }
    }
    if (info && info.isFile()) {
      return { filePath: input, isFolder: false }
    }
    const raw = String(value || '').trim()
    const endsWithSeparator = /[\\/]$/.test(raw)
    if (endsWithSeparator || path.extname(input).toLowerCase() !== '.json') {
      return { filePath: path.join(input, `${id}.json`), isFolder: true }
    }
    return { filePath: input, isFolder: false }
  }

  async ensureParent(filePath) {
    try {
      await mkdir(path.dirname(filePath), { recursive: true })
    } catch (error) {
      fail(500, 'IO_ERROR', '无法创建存储文件夹', String(error && error.message || error))
    }
  }

  async moveFile(from, to) {
    try {
      await rename(from, to)
    } catch (error) {
      if (error && ['EXDEV', 'EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) {
        await copyFile(from, to)
        await unlink(from)
        return
      }
      throw error
    }
  }

  async readSystemAt(entry) {
    const raw = await readFile(entry.path, 'utf8')
    const parsed = JSON.parse(raw)
    if (!isSystemDocument(parsed)) throw new Error('文件不是有效的 SQL Manager 系统 JSON')
    const system = normalizeSystem(parsed, path.basename(entry.path), entry.id)
    if (!system) throw new Error('文件缺少有效的系统结构')
    system.path = entry.path
    system.file = path.basename(entry.path)
    system.missing = false
    return system
  }

  async readAll() {
    const registry = await this.readRegistry()
    const systems = []
    const broken = []
    const issues = [...registry.issues]

    for (const entry of registry.entries) {
      try {
        systems.push(await this.readSystemAt(entry))
      } catch (error) {
        const message = error && error.message ? error.message : String(error)
        broken.push({
          schema: SYSTEM_SCHEMA,
          id: entry.id,
          name: registryEntryName(entry),
          description: '',
          createdAt: null,
          updatedAt: null,
          path: entry.path,
          file: path.basename(entry.path),
          missing: true,
          error: message,
          sqls: [],
        })
        issues.push({ file: entry.path, message: `系统 JSON 无法读取：${message}` })
      }
    }

    return {
      registryPath: this.registryPath,
      suggestedFolder: this.suggestedFolder,
      entries: registry.entries,
      systems,
      broken,
      issues,
    }
  }

  async state(options = {}) {
    const query = cleanLine(options.q, MAX_QUERY_LENGTH)
    const limitValue = Number(options.limit)
    const limit = Number.isInteger(limitValue) && limitValue > 0
      ? Math.min(limitValue, MAX_RESULT_LIMIT)
      : 200
    const listing = await this.readAll()
    const allSystems = [...listing.systems, ...listing.broken]

    let selected = null
    let eligible = listing.systems
    if (options.system) {
      selected = locateSystem(allSystems, options.system)
      if (!selected) fail(404, 'NOT_FOUND', '系统不存在', String(options.system))
      eligible = selected.missing ? [] : [selected]
    }

    const rows = []
    for (const system of eligible) {
      for (const record of system.sqls) {
        const match = buildMatch(record, system, query)
        if (!match) continue
        rows.push({
          ...publicSql(record, system),
          score: match.score,
          matches: match.flags,
          matchedTables: match.matchedTables,
          matchedFields: match.matchedFields,
        })
      }
    }

    rows.sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      const leftTime = Date.parse(left.updatedAt || left.createdAt || '') || 0
      const rightTime = Date.parse(right.updatedAt || right.createdAt || '') || 0
      if (rightTime !== leftTime) return rightTime - leftTime
      return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    })

    return {
      registryPath: listing.registryPath,
      suggestedFolder: listing.suggestedFolder,
      systems: (selected ? [selected] : allSystems).map(systemSummary),
      issues: listing.issues,
      query,
      systemFilter: selected ? selected.id : null,
      items: rows.slice(0, limit),
      total: rows.length,
      totalSystems: allSystems.length,
      totalSqls: listing.systems.reduce((sum, system) => sum + system.sqls.length, 0),
      truncated: rows.length > limit,
      parsedAt: nowIso(),
    }
  }

  async createSystem(input) {
    return this.withWriteLock(() => this.createSystemLocked(input))
  }

  async createSystemLocked(input) {
    const name = cleanLine(input && input.name, MAX_SYSTEM_NAME)
    if (!name) fail(400, 'VALIDATION', '系统名称不能为空')
    const description = cleanText(input && input.description, MAX_SYSTEM_DESCRIPTION)
    const pathValue = input && input.path
    if (typeof pathValue !== 'string' || !pathValue.trim()) {
      fail(400, 'VALIDATION', '每个系统必须填写独立的存储路径')
    }

    const registry = await this.readRegistry()
    if (registry.invalid) {
      fail(500, 'REGISTRY_INVALID', '系统注册表损坏，请先修复或删除 systems.json', this.registryPath)
    }
    const id = nextSystemId(registry.entries, name)
    const target = await this.resolveStoragePath(pathValue, id)
    const pathConflict = registry.entries.find((entry) => pathKey(entry.path) === pathKey(target.filePath))
    if (pathConflict) {
      fail(409, 'CONFLICT', '该存储路径已被其他系统使用', pathConflict.name)
    }

    const exists = await this.fileExists(target.filePath)
    if (exists) {
      let parsed
      try {
        parsed = JSON.parse(await readFile(target.filePath, 'utf8'))
      } catch (error) {
        fail(409, 'CONFLICT', '目标路径已存在，但不是可读取的 JSON', String(error && error.message || error))
      }
      if (!isSystemDocument(parsed)) {
        fail(409, 'CONFLICT', '目标路径已存在，但不是 SQL Manager 系统 JSON')
      }
      const imported = normalizeSystem(parsed, path.basename(target.filePath))
      if (!imported) fail(409, 'CONFLICT', '目标 JSON 缺少有效的系统结构')

      let importId = imported.id
      if (registry.entries.some((entry) => entry.id.toLowerCase() === importId.toLowerCase())) {
        importId = nextSystemId(registry.entries, imported.name)
      }
      imported.id = importId
      imported.path = target.filePath
      imported.file = path.basename(target.filePath)
      imported.updatedAt = nowIso()
      await this.atomicWrite(target.filePath, systemPayload(imported, target.filePath))
      const entries = [...registry.entries, registryEntry(imported)]
      await this.writeRegistry(entries)
      return { system: systemSummary(imported), imported: true }
    }

    await this.ensureParent(target.filePath)
    const now = nowIso()
    const system = {
      schema: SYSTEM_SCHEMA,
      id,
      name,
      description,
      path: target.filePath,
      file: path.basename(target.filePath),
      createdAt: now,
      updatedAt: now,
      missing: false,
      sqls: [],
    }
    await this.atomicWrite(target.filePath, systemPayload(system, target.filePath))
    await this.writeRegistry([...registry.entries, registryEntry(system)])
    return { system: systemSummary(system), imported: false }
  }

  async updateSystem(reference, input) {
    return this.withWriteLock(() => this.updateSystemLocked(reference, input))
  }

  async updateSystemLocked(reference, input) {
    const listing = await this.readAll()
    const system = locateSystem([...listing.systems, ...listing.broken], reference)
    if (!system) fail(404, 'NOT_FOUND', '系统不存在', String(reference))
    const entry = listing.entries.find((item) => item.id === system.id)
    if (!entry) fail(404, 'NOT_FOUND', '系统注册信息不存在', String(reference))

    const name = input && input.name !== undefined
      ? cleanLine(input.name, MAX_SYSTEM_NAME)
      : system.name
    if (!name) fail(400, 'VALIDATION', '系统名称不能为空')
    const description = input && input.description !== undefined
      ? cleanText(input.description, MAX_SYSTEM_DESCRIPTION)
      : system.description
    const pathValue = input && input.path !== undefined ? input.path : entry.path
    if (typeof pathValue !== 'string' || !pathValue.trim()) {
      fail(400, 'VALIDATION', '每个系统必须填写独立的存储路径')
    }

    const target = await this.resolveStoragePath(pathValue, system.id)
    const moved = pathKey(target.filePath) !== pathKey(entry.path)
    const replacedEntry = { id: system.id, name, path: target.filePath }

    if (moved) {
      if (system.missing) {
        const targetExists = await this.fileExists(target.filePath)
        if (!targetExists) {
          fail(404, 'NOT_FOUND', '当前系统 JSON 文件不存在，无法移动；请先恢复文件或删除系统')
        }
        let parsed
        try {
          parsed = JSON.parse(await readFile(target.filePath, 'utf8'))
        } catch (error) {
          fail(409, 'CONFLICT', '目标路径已存在，但不是可读取的 JSON', String(error && error.message || error))
        }
        if (!isSystemDocument(parsed)) {
          fail(409, 'CONFLICT', '目标路径已存在，但不是 SQL Manager 系统 JSON')
        }
        const rawId = sanitizeId(parsed.id)
        if (rawId && rawId.toLowerCase() !== system.id.toLowerCase()) {
          fail(409, 'CONFLICT', '目标 JSON 属于另一个系统，不能用于修复当前系统')
        }
        const adopted = normalizeSystem(parsed, path.basename(target.filePath), system.id)
        if (!adopted) fail(409, 'CONFLICT', '目标 JSON 缺少有效的系统结构')
        adopted.name = name
        adopted.description = description
        adopted.path = target.filePath
        adopted.file = path.basename(target.filePath)
        adopted.updatedAt = nowIso()
        await this.atomicWrite(target.filePath, systemPayload(adopted, target.filePath))
        await this.writeRegistry(listing.entries.map((item) => (item.id === system.id ? replacedEntry : item)))
        return { system: systemSummary(adopted), moved: true, repaired: true }
      }

      const targetConflict = listing.entries.find((item) => (
        item.id !== system.id && pathKey(item.path) === pathKey(target.filePath)
      ))
      if (targetConflict) {
        fail(409, 'CONFLICT', '目标存储路径已被其他系统使用', targetConflict.name)
      }
      if (await this.fileExists(target.filePath)) {
        fail(409, 'CONFLICT', '目标路径已存在文件，不能覆盖', target.filePath)
      }
      await this.ensureParent(target.filePath)
      try {
        await this.moveFile(entry.path, target.filePath)
      } catch (error) {
        fail(500, 'IO_ERROR', '无法移动系统 JSON 文件', String(error && error.message || error))
      }
      system.path = target.filePath
      system.file = path.basename(target.filePath)
    }

    if (system.missing) {
      fail(404, 'NOT_FOUND', '当前系统 JSON 文件不存在，请先恢复文件或删除系统')
    }

    system.name = name
    system.description = description
    system.updatedAt = nowIso()
    await this.atomicWrite(target.filePath, systemPayload(system, target.filePath))
    await this.writeRegistry(listing.entries.map((item) => (item.id === system.id ? replacedEntry : item)))
    return { system: systemSummary(system), moved, repaired: false }
  }

  async deleteSystem(reference, confirmName) {
    return this.withWriteLock(async () => {
      const listing = await this.readAll()
      const system = locateSystem([...listing.systems, ...listing.broken], reference)
      if (!system) fail(404, 'NOT_FOUND', '系统不存在', String(reference))
      if (String(confirmName || '').trim() !== system.name) {
        fail(400, 'VALIDATION', '删除系统需要提供完全匹配的系统名称')
      }
      const entry = listing.entries.find((item) => item.id === system.id)
      if (!entry) fail(404, 'NOT_FOUND', '系统注册信息不存在', String(reference))
      try {
        await rm(entry.path, { force: true })
      } catch (error) {
        fail(500, 'IO_ERROR', '无法删除系统 JSON 文件', String(error && error.message || error))
      }
      await this.writeRegistry(listing.entries.filter((item) => item.id !== system.id))
      return { system: systemSummary(system) }
    })
  }

  async addSql(input) {
    return this.withWriteLock(async () => {
      const reference = cleanLine(input && input.system, MAX_SYSTEM_NAME)
      if (!reference) fail(400, 'VALIDATION', '请选择所属系统')
      const name = cleanLine(input && input.name, MAX_SQL_NAME)
      if (!name) fail(400, 'VALIDATION', 'SQL 名称不能为空')
      const sql = typeof (input && input.sql) === 'string' ? input.sql.slice(0, MAX_SQL_TEXT) : ''
      if (!sql.trim()) fail(400, 'VALIDATION', 'SQL 内容不能为空')
      const remark = cleanText(input && input.remark, MAX_SQL_REMARK)

      let listing = await this.readAll()
      let system = locateSystem([...listing.systems, ...listing.broken], reference)
      if (!system && input && input.createSystemIfMissing === true) {
        if (typeof input.path !== 'string' || !input.path.trim()) {
          fail(400, 'VALIDATION', '创建新系统需要填写独立的存储路径')
        }
        const created = await this.createSystemLocked({
          name: reference,
          path: input.path,
          description: input.systemDescription,
        })
        listing = await this.readAll()
        system = listing.systems.find((item) => item.id === created.system.id)
          || locateSystem([...listing.systems, ...listing.broken], created.system.name)
      }
      if (!system) fail(404, 'NOT_FOUND', '系统不存在；请先创建系统', reference)
      if (system.missing) {
        fail(404, 'NOT_FOUND', '系统 JSON 文件不可用，请先修复存储路径', system.path)
      }

      const now = nowIso()
      const analysis = analyzeSql(sql)
      const record = {
        id: `sql-${randomUUID().replace(/-/g, '').slice(0, 12)}`,
        name,
        remark,
        sql,
        tables: analysis.tables,
        fields: analysis.fields,
        createdAt: now,
        updatedAt: now,
      }
      system.sqls.push(record)
      system.updatedAt = now
      await this.atomicWrite(system.path, systemPayload(system, system.path))
      return { system: systemSummary(system), record: publicSql(record, system) }
    })
  }

  async updateSql(reference, sqlId, input) {
    return this.withWriteLock(async () => {
      const listing = await this.readAll()
      const system = locateSystem([...listing.systems, ...listing.broken], reference)
      if (!system) fail(404, 'NOT_FOUND', '系统不存在', String(reference))
      if (system.missing) {
        fail(404, 'NOT_FOUND', '系统 JSON 文件不可用，请先修复存储路径', system.path)
      }
      const record = system.sqls.find((item) => item.id === sqlId)
      if (!record) fail(404, 'NOT_FOUND', 'SQL 不存在', String(sqlId))

      const name = input && input.name !== undefined
        ? cleanLine(input.name, MAX_SQL_NAME)
        : record.name
      if (!name) fail(400, 'VALIDATION', 'SQL 名称不能为空')
      const sql = input && input.sql !== undefined
        ? (typeof input.sql === 'string' ? input.sql.slice(0, MAX_SQL_TEXT) : '')
        : record.sql
      if (!sql.trim()) fail(400, 'VALIDATION', 'SQL 内容不能为空')
      const remark = input && input.remark !== undefined
        ? cleanText(input.remark, MAX_SQL_REMARK)
        : record.remark
      const sqlChanged = sql !== record.sql
      const analysis = sqlChanged ? analyzeSql(sql) : { tables: record.tables, fields: record.fields }
      const nextRecord = {
        ...record,
        name,
        remark,
        sql,
        tables: analysis.tables,
        fields: analysis.fields,
        updatedAt: nowIso(),
      }
      system.sqls = system.sqls.map((item) => (item.id === record.id ? nextRecord : item))
      system.updatedAt = nextRecord.updatedAt
      await this.atomicWrite(system.path, systemPayload(system, system.path))
      return { system: systemSummary(system), record: publicSql(nextRecord, system) }
    })
  }

  async deleteSql(reference, sqlId) {
    return this.withWriteLock(async () => {
      const listing = await this.readAll()
      const system = locateSystem([...listing.systems, ...listing.broken], reference)
      if (!system) fail(404, 'NOT_FOUND', '系统不存在', String(reference))
      if (system.missing) {
        fail(404, 'NOT_FOUND', '系统 JSON 文件不可用，请先修复存储路径', system.path)
      }
      const record = system.sqls.find((item) => item.id === sqlId)
      if (!record) fail(404, 'NOT_FOUND', 'SQL 不存在', String(sqlId))
      const now = nowIso()
      system.sqls = system.sqls.filter((item) => item.id !== record.id)
      system.updatedAt = now
      await this.atomicWrite(system.path, systemPayload(system, system.path))
      return { system: systemSummary(system), record: publicSql(record, system) }
    })
  }

  async parse(sql) {
    if (typeof sql !== 'string') fail(400, 'VALIDATION', 'SQL 必须是字符串')
    if (sql.length > MAX_SQL_TEXT) fail(400, 'VALIDATION', 'SQL 内容过长')
    return analyzeSql(sql)
  }
}
