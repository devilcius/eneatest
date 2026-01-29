import { getQuestionnaireTitle } from '../../utils/definition'

function ItemsTab({ definition, onUpdateItem }) {
  return (
    <div className="card">
      <h3>Editor de ítems</h3>
      <p className="muted">Edita el texto o desactiva preguntas. Los cambios se guardan en tu navegador.</p>
      <div className="item-editor">
        {definition.questionnaires.map((questionnaire) => (
          <div key={questionnaire.id} className="item-group">
            <h4>{getQuestionnaireTitle(questionnaire)}</h4>
            {questionnaire.items.map((item) => (
              <div key={item.id} className="item-row">
                <div className="item-meta">
                  <span className="tag">{item.id}</span>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={item.isActive}
                      onChange={(event) => onUpdateItem(item.id, { isActive: event.target.checked })}
                    />
                    <span>{item.isActive ? 'Activo' : 'Inactivo'}</span>
                  </label>
                </div>
                <textarea
                  value={item.text}
                  onChange={(event) => onUpdateItem(item.id, { text: event.target.value })}
                  rows={3}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ItemsTab
