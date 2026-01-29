const mapScale = (row) => ({
  min: row.scale_min,
  max: row.scale_max,
  labels: JSON.parse(row.scale_labels_json ?? '{}'),
})

export const getTestDefinition = async (db, testDefinitionId, version) => {
  const definition = await db
    .prepare(
      `
      SELECT id, name, language, scale_min, scale_max, scale_labels_json, version
      FROM test_definition
      WHERE id = ?1 AND version = ?2
      LIMIT 1
      `
    )
    .bind(testDefinitionId, version)
    .first()

  if (!definition) return null

  const rows = await db
    .prepare(
      `
      SELECT
        q.id as questionnaire_id,
        q.eneatype as eneatype,
        q.title as title,
        q.order_index as order_index,
        i.id as item_id,
        i.order_index as item_order,
        i.text as item_text,
        i.is_active as item_active
      FROM questionnaire q
      JOIN item i ON i.questionnaire_id = q.id
      WHERE q.test_definition_id = ?1 AND q.test_definition_version = ?2
      ORDER BY q.order_index ASC, i.order_index ASC
      `
    )
    .bind(testDefinitionId, version)
    .all()

  const questionnaireMap = new Map()
  rows.results.forEach((row) => {
    if (!questionnaireMap.has(row.questionnaire_id)) {
      questionnaireMap.set(row.questionnaire_id, {
        id: row.questionnaire_id,
        eneatype: row.eneatype,
        title: row.title,
        order: row.order_index,
        items: [],
      })
    }
    questionnaireMap.get(row.questionnaire_id).items.push({
      id: row.item_id,
      order: row.item_order,
      text: row.item_text,
      isActive: row.item_active === 1,
    })
  })

  return {
    id: definition.id,
    version: definition.version,
    name: definition.name,
    language: definition.language,
    scale: mapScale(definition),
    questionnaires: Array.from(questionnaireMap.values()),
  }
}

export const getActiveTestDefinition = async (db) => {
  const active = await db
    .prepare(
      `
      SELECT id, version
      FROM test_definition
      WHERE is_active = 1
      ORDER BY created_at DESC
      LIMIT 1
      `
    )
    .first()

  if (!active) return null
  return getTestDefinition(db, active.id, active.version)
}
