export const applyOverrides = (definition, overrides) => ({
  ...definition,
  questionnaires: definition.questionnaires.map((questionnaire) => ({
    ...questionnaire,
    items: questionnaire.items.map((item) => {
      const override = overrides[item.id]
      return {
        ...item,
        text: override?.text ?? item.text,
        isActive: override?.isActive ?? true,
      }
    }),
  })),
})

export const getQuestionnaireTitle = (questionnaire) => `${questionnaire.title}`
