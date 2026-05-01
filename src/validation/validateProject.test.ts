import { describe, expect, it } from 'vitest'
import { validateProject } from './validateProject'
import {
  connect,
  connectLeft,
  connectRight,
  createBoolVariable,
  createElement,
  createProject,
  createRung,
  createTimerVariable,
} from '../test/builders'

function messages(project = createProject()) {
  return validateProject(project).map((issue) => issue.message)
}

describe('validateProject', () => {
  it('checks empty names, duplicate names, duplicate addresses, and address formats', () => {
    const project = createProject({
      variables: [
        createBoolVariable({ id: 'a', name: '', address: '%I0.0' }),
        createBoolVariable({ id: 'b', name: 'Start', address: '%I0.0' }),
        createBoolVariable({ id: 'c', name: 'Start', address: '%BAD' }),
      ],
    })
    const result = messages(project).join('\n')

    expect(result).toContain('pusta nazwe')
    expect(result).toContain('Duplikat nazwy zmiennej: Start')
    expect(result).toContain('Duplikat adresu zmiennej: %I0.0')
    expect(result).toContain('bledny format adresu')
  })

  it('checks variable type required by ladder elements', () => {
    const boolVariable = createBoolVariable({ id: 'start' })
    const timerElement = createElement({
      id: 'timer',
      type: 'TON',
      variableId: boolVariable.id,
    })
    const project = createProject({
      variables: [boolVariable],
      rungs: [
        createRung({
          elements: [timerElement],
          connections: [connectLeft(timerElement.id), connectRight(timerElement.id)],
        }),
      ],
    })

    expect(messages(project).join('\n')).toContain('wymaga zmiennej TIMER')
  })

  it('warns when elements are not connected to rails', () => {
    const start = createBoolVariable({ id: 'start' })
    const timer = createTimerVariable({ id: 'timer' })
    const contact = createElement({
      id: 'contact',
      variableId: start.id,
    })
    const ton = createElement({
      id: 'ton',
      type: 'TON',
      variableId: timer.id,
    })
    const project = createProject({
      variables: [start, timer],
      rungs: [
        createRung({
          elements: [contact, ton],
          connections: [connect(contact.id, ton.id)],
        }),
      ],
    })
    const result = messages(project).join('\n')

    expect(result).toContain('nie jest podlaczony do lewej szyny')
    expect(result).toContain('nie jest podlaczone do prawej szyny')
  })

  it('reports self-loops, cycles, and duplicate connections', () => {
    const start = createBoolVariable({ id: 'start' })
    const first = createElement({ id: 'first', variableId: start.id })
    const second = createElement({ id: 'second', variableId: start.id })
    const project = createProject({
      variables: [start],
      rungs: [
        createRung({
          elements: [first, second],
          connections: [
            connectLeft(first.id),
            connect(first.id, second.id),
            connect(second.id, first.id),
            { id: 'self', fromElementId: first.id, toElementId: first.id },
            { id: 'duplicate-a', fromElementId: first.id, toElementId: second.id },
            { id: 'duplicate-b', fromElementId: first.id, toElementId: second.id },
          ],
        }),
      ],
    })
    const result = messages(project).join('\n')

    expect(result).toContain('nie moze wracac do tego samego punktu')
    expect(result).toContain('duplikat polaczenia')
    expect(result).toContain('graf polaczen zawiera cykl')
  })

  it('blocks output-only elements from driving another element', () => {
    const start = createBoolVariable({ id: 'start' })
    const coil = createElement({
      id: 'coil',
      type: 'COIL',
      variableId: start.id,
    })
    const contact = createElement({
      id: 'contact',
      type: 'NO_CONTACT',
      variableId: start.id,
    })
    const project = createProject({
      variables: [start],
      rungs: [
        createRung({
          elements: [coil, contact],
          connections: [
            connectLeft(coil.id),
            connect(coil.id, contact.id),
            connectRight(contact.id),
          ],
        }),
      ],
    })

    expect(messages(project).join('\n')).toContain(
      'nie moze sterowac kolejnym elementem',
    )
  })
})
