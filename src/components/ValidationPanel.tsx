import type { TranslationKey } from '../i18n/translations'
import type { Project } from '../types/project'
import { validateProject } from '../validation/validateProject'

type ValidationPanelProps = {
  project: Project
  t: (key: TranslationKey) => string
}

export function ValidationPanel({ project, t }: ValidationPanelProps) {
  const issues = validateProject(project)

  return (
    <section className="messages" aria-labelledby="messages-title">
      <div className="panel__header">
        <h2 id="messages-title">{t('messages')}</h2>
      </div>

      <ul>
        {issues.length === 0 ? (
          <li className="messages__item messages__item--ok">
            {t('noValidationErrors')}
          </li>
        ) : (
          issues.map((issue) => (
            <li
              key={issue.id}
              className={`messages__item messages__item--${issue.severity}`}
            >
              {issue.message}
            </li>
          ))
        )}
      </ul>
    </section>
  )
}
