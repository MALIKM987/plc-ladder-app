const blockGroups = [
  {
    title: 'Styki',
    items: ['Styk NO', 'Styk NC', 'Zbocze narastające'],
  },
  {
    title: 'Cewki',
    items: ['Cewka', 'Set', 'Reset'],
  },
  {
    title: 'Funkcje',
    items: ['Timer TON', 'Timer TOF', 'Licznik CTU'],
  },
]

export function BlockLibrary() {
  return (
    <aside className="panel panel--left" aria-labelledby="block-library-title">
      <div className="panel__header">
        <h2 id="block-library-title">Biblioteka bloków</h2>
      </div>

      <div className="block-library">
        {blockGroups.map((group) => (
          <section key={group.title} className="block-group">
            <h3>{group.title}</h3>
            <div className="block-list">
              {group.items.map((item) => (
                <button key={item} type="button" className="block-item">
                  {item}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  )
}
