import fs from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import Database from 'better-sqlite3'

const args = process.argv.slice(2)
const getArg = (flag) => {
  const index = args.indexOf(flag)
  if (index === -1) return null
  return args[index + 1] ?? null
}

const hasFlag = (flag) => args.includes(flag)

const jsonPath = getArg('--json')
if (!jsonPath) {
  console.error('Missing --json path')
  process.exit(1)
}

const useWrangler = hasFlag('--wrangler')
const dbPath = getArg('--db')
const dbName = getArg('--db-name')
const versionArg = getArg('--version')
const isActivate = hasFlag('--activate')
const isForce = hasFlag('--force')
const isLocal = hasFlag('--local')

if (useWrangler && !dbName) {
  console.error('Missing --db-name for wrangler mode')
  process.exit(1)
}

if (!useWrangler && !dbPath) {
  console.error('Missing --db path for sqlite mode')
  process.exit(1)
}

const raw = await fs.readFile(jsonPath, 'utf-8')
const parsed = JSON.parse(raw)
const test = parsed.test

const ensure = (condition, message) => {
  if (!condition) {
    console.error(`Invalid test definition: ${message}`)
    process.exit(1)
  }
}

ensure(test?.id, 'missing test.id')
ensure(Array.isArray(test?.questionnaires), 'missing questionnaires array')
ensure(test.questionnaires.length === 9, 'expected 9 questionnaires')
ensure(test.scale?.min === 0 && test.scale?.max === 5, 'scale must be 0..5')

const questionnaires = test.questionnaires
questionnaires.forEach((questionnaire, index) => {
  ensure(Array.isArray(questionnaire.items), `questionnaire ${index + 1} missing items`)
  ensure(questionnaire.items.length === 20, `questionnaire ${index + 1} must have 20 items`)
})

const now = new Date().toISOString()
const scaleLabelsJson = JSON.stringify(test.scale.labels ?? {})

const escapeSql = (value) => String(value).replace(/'/g, "''")

const buildSql = (version, includeTransaction = true) => {
  const statements = []
  if (includeTransaction) statements.push('BEGIN;')

  if (isActivate) {
    statements.push(
      `UPDATE test_definition SET is_active = 0 WHERE id = '${escapeSql(test.id)}';`
    )
  }

  if (isForce) {
    statements.push(
      `DELETE FROM item_response WHERE item_id IN (
        SELECT i.id FROM item i
        JOIN questionnaire q ON q.id = i.questionnaire_id
        WHERE q.test_definition_id = '${escapeSql(test.id)}'
      );`
    )
    statements.push(
      `DELETE FROM item WHERE questionnaire_id IN (
        SELECT id FROM questionnaire WHERE test_definition_id = '${escapeSql(test.id)}'
      );`
    )
    statements.push(`DELETE FROM questionnaire WHERE test_definition_id = '${escapeSql(test.id)}';`)
  }

  statements.push(
    `UPDATE test_definition SET
      name = '${escapeSql(test.name)}',
      language = '${escapeSql(test.language)}',
      scale_min = ${test.scale.min},
      scale_max = ${test.scale.max},
      scale_labels_json = '${escapeSql(scaleLabelsJson)}',
      source_pdf = ${test.source_pdf ? `'${escapeSql(test.source_pdf)}'` : 'NULL'},
      version = ${version},
      is_active = ${isActivate ? 1 : 0},
      created_at = '${now}'
    WHERE id = '${escapeSql(test.id)}';`
  )

  statements.push(
    `INSERT INTO test_definition (
      id, name, language, scale_min, scale_max, scale_labels_json, source_pdf, version, is_active, created_at
    )
    SELECT
      '${escapeSql(test.id)}',
      '${escapeSql(test.name)}',
      '${escapeSql(test.language)}',
      ${test.scale.min},
      ${test.scale.max},
      '${escapeSql(scaleLabelsJson)}',
      ${test.source_pdf ? `'${escapeSql(test.source_pdf)}'` : 'NULL'},
      ${version},
      ${isActivate ? 1 : 0},
      '${now}'
    WHERE NOT EXISTS (SELECT 1 FROM test_definition WHERE id = '${escapeSql(test.id)}');`
  )

  questionnaires.forEach((questionnaire) => {
    statements.push(
      `INSERT INTO questionnaire (
        test_definition_id, test_definition_version, eneatype, title, order_index, created_at
      ) VALUES (
        '${escapeSql(test.id)}',
        ${version},
        ${questionnaire.eneatype},
        '${escapeSql(questionnaire.title)}',
        ${questionnaire.id},
        '${now}'
      );`
    )

    questionnaire.items.forEach((item, idx) => {
      statements.push(
        `INSERT INTO item (
          questionnaire_id, order_index, text, is_active, created_at, updated_at
        ) VALUES (
          (SELECT id FROM questionnaire WHERE test_definition_id = '${escapeSql(test.id)}' AND test_definition_version = ${version} AND eneatype = ${questionnaire.eneatype}),
          ${idx + 1},
          '${escapeSql(item.text)}',
          1,
          '${now}',
          '${now}'
        );`
      )
    })
  })

  if (includeTransaction) statements.push('COMMIT;')
  return statements.join('\n')
}

const loadWithSqlite = (version) => {
  const db = new Database(dbPath)
  db.pragma('foreign_keys = ON')

  const existingVersion = db
    .prepare('SELECT MAX(version) as version FROM test_definition WHERE id = ?')
    .get(test.id)?.version

  const nextVersion = version ?? (existingVersion ? existingVersion + 1 : 1)
  const targetVersion = isForce && existingVersion ? existingVersion : nextVersion

  const row = db
    .prepare('SELECT 1 FROM test_definition WHERE id = ? AND version = ?')
    .get(test.id, targetVersion)

  if (row && !isForce) {
    console.error(`Version ${targetVersion} already exists. Use --force to replace.`)
    process.exit(1)
  }

  const insertDefinition = db.prepare(
    `
    INSERT INTO test_definition (
      id, name, language, scale_min, scale_max, scale_labels_json, source_pdf, version, is_active, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    `
  )

  const insertQuestionnaire = db.prepare(
    `
    INSERT INTO questionnaire (
      test_definition_id, test_definition_version, eneatype, title, order_index, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    `
  )

  const insertItem = db.prepare(
    `
    INSERT INTO item (
      questionnaire_id, order_index, text, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, 1, ?, ?)
    `
  )

  const cleanupResponses = db.prepare(
    `
    DELETE FROM item_response WHERE item_id IN (
      SELECT i.id FROM item i
      JOIN questionnaire q ON q.id = i.questionnaire_id
      WHERE q.test_definition_id = ?
    )
    `
  )

  const cleanupItems = db.prepare(
    `
    DELETE FROM item WHERE questionnaire_id IN (
      SELECT id FROM questionnaire WHERE test_definition_id = ?
    )
    `
  )

  const deleteQuestionnaires = db.prepare(
    `
    DELETE FROM questionnaire WHERE test_definition_id = ?
    `
  )

  const deactivate = db.prepare('UPDATE test_definition SET is_active = 0 WHERE id = ?')
  const updateDefinition = db.prepare(
    `
    UPDATE test_definition SET
      name = ?2,
      language = ?3,
      scale_min = ?4,
      scale_max = ?5,
      scale_labels_json = ?6,
      source_pdf = ?7,
      version = ?8,
      is_active = ?9,
      created_at = ?10
    WHERE id = ?1
    `
  )
  const insertDefinitionIfMissing = db.prepare(
    `
    INSERT INTO test_definition (
      id, name, language, scale_min, scale_max, scale_labels_json, source_pdf, version, is_active, created_at
    )
    SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10
    WHERE NOT EXISTS (SELECT 1 FROM test_definition WHERE id = ?1)
    `
  )

  const transaction = db.transaction(() => {
    if (isActivate) deactivate.run(test.id)
    if (isForce) {
      cleanupResponses.run(test.id)
      cleanupItems.run(test.id)
      deleteQuestionnaires.run(test.id)
    }

    updateDefinition.run(
      test.id,
      test.name,
      test.language,
      test.scale.min,
      test.scale.max,
      scaleLabelsJson,
      test.source_pdf ?? null,
      targetVersion,
      isActivate ? 1 : 0,
      now
    )
    insertDefinitionIfMissing.run(
      test.id,
      test.name,
      test.language,
      test.scale.min,
      test.scale.max,
      scaleLabelsJson,
      test.source_pdf ?? null,
      targetVersion,
      isActivate ? 1 : 0,
      now
    )

    questionnaires.forEach((questionnaire) => {
      const result = insertQuestionnaire.run(
        test.id,
        targetVersion,
        questionnaire.eneatype,
        questionnaire.title,
        questionnaire.id,
        now
      )
      const questionnaireId = result.lastInsertRowid
      questionnaire.items.forEach((item, idx) => {
        insertItem.run(questionnaireId, idx + 1, item.text, now, now)
      })
    })
  })

  transaction()
  db.close()

  return targetVersion
}

const getNextVersionWrangler = (versionOverride) => {
  if (versionOverride) return Number(versionOverride)

  const command = `SELECT MAX(version) as version FROM test_definition WHERE id = '${escapeSql(test.id)}';`
  const result = runWrangler(['d1', 'execute', dbName, '--command', command, '--json'])
  const parsedResult = JSON.parse(result.stdout)
  const row = parsedResult?.[0]?.results?.[0]
  const current = row?.version
  return current ? Number(current) + 1 : 1
}

const runWrangler = (wranglerArgs, input) => {
  const argsWithLocal = isLocal ? [...wranglerArgs, '--local'] : wranglerArgs
  const result = spawnSync('npx', ['wrangler', ...argsWithLocal], {
    input,
    encoding: 'utf-8',
  })

  if (result.status !== 0) {
    console.error(result.stderr)
    process.exit(result.status ?? 1)
  }

  return result
}

if (useWrangler) {
  const nextVersion = getNextVersionWrangler(versionArg ? Number(versionArg) : null)
  const version = isForce ? nextVersion - 1 || 1 : nextVersion
  const sql = buildSql(version, false)
  const tmpFile = path.join(process.cwd(), '.tmp-load-test.sql')
  await fs.writeFile(tmpFile, sql, 'utf-8')
  runWrangler(['d1', 'execute', dbName, '--file', tmpFile])
  await fs.unlink(tmpFile)
  console.log(`Loaded test definition ${test.id} v${version} via wrangler.`)
  process.exit(0)
}

const nextVersion = loadWithSqlite(versionArg ? Number(versionArg) : null)
console.log(`Loaded test definition ${test.id} v${nextVersion} into ${dbPath}.`)
