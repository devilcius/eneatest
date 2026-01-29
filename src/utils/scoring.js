export const computeTotals = (definition, answers, overrides) => {
  const totals = {}
  definition.questionnaires.forEach((questionnaire) => {
    const total = questionnaire.items.reduce((sum, item) => {
      const override = overrides[item.id]
      if (override?.isActive === false) return sum
      const value = answers[item.id]
      return sum + (Number.isFinite(value) ? value : 0)
    }, 0)
    totals[questionnaire.eneatype] = total
  })
  return totals
}

export const computeRanking = (totals) => {
  return Object.entries(totals)
    .map(([eneatype, score]) => ({ eneatype: Number(eneatype), score }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.eneatype - b.eneatype
    })
}

export const getActiveItemCount = (definition, overrides) =>
  definition.questionnaires.reduce((count, questionnaire) => {
    const activeItems = questionnaire.items.filter((item) => overrides[item.id]?.isActive !== false)
    return count + activeItems.length
  }, 0)

export const hasAllAnswers = (definition, answers, overrides) => {
  const requiredCount = getActiveItemCount(definition, overrides)
  const answeredCount = Object.entries(answers).filter(([itemId, value]) => {
    if (!Number.isFinite(value)) return false
    if (overrides[itemId]?.isActive === false) return false
    return true
  }).length
  return answeredCount >= requiredCount
}
