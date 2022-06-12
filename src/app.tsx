/*
 * Constraint Solver for FUN Programs
 * Copyright (C) 2022  Manuel Meitinger
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as React from 'react'
import { useEffect, useMemo, useRef } from 'react'
import UIkit from 'uikit'
import { useEditor, useWorker } from './hooks'
import { InlayHintsProvider, languageId } from './language'
import { defaultProgram, defaultRules, predefinedRules } from './predefined'
import { ParserInput, ParserOutput, RunnerInput, RunnerOutput, SolverInput, SolverOutput, VisualizerInput, VisualizerOutput } from './workers'

const parser = (): Worker => new Worker(new URL('./parser.ts', import.meta.url), { type: 'module' })
const solver = (): Worker => new Worker(new URL('./solver.ts', import.meta.url), { type: 'module' })
const runner = (): Worker => new Worker(new URL('./runner.ts', import.meta.url), { type: 'module' })
const visualizer = (): Worker => new Worker(new URL('./visualizer.ts', import.meta.url), { type: 'module' })

const programStoreName = 'program'
const rulesStoreName = 'rules'

export const App: React.FC = () => {
  const gridDiv = useRef<HTMLUListElement>(null)
  const visualizerDiv = useRef<HTMLDivElement>(null)
  const [program, programEditor, programEditorDiv] = useEditor(programStoreName, languageId, defaultProgram)
  const [rules, rulesEditor, rulesEditorDiv] = useEditor(rulesStoreName, 'typescript', defaultRules)
  const parserInput = useMemo<ParserInput>(() => ({ expression: program }), [program])
  const [parserOutput, parserError, parserActive] = useWorker<ParserInput, ParserOutput>(parserInput, parser)
  const runnerInput = useMemo<RunnerInput | undefined>(() => parserOutput?.succeeded === true ? { expression: parserOutput.expression } : undefined, [parserOutput])
  const [runnerOutput, runnerError, runnerActive] = useWorker<RunnerInput, RunnerOutput>(runnerInput, runner)
  const solverInput = useMemo<SolverInput | undefined>(() => parserOutput?.succeeded === true ? { expression: parserOutput.expression, rules } : undefined, [parserOutput, rules])
  const [solverOutput, solverError, solverActive] = useWorker<SolverInput, SolverOutput>(solverInput, solver)
  const visualizerInput = useMemo<VisualizerInput | undefined>(() => parserOutput?.succeeded === true ? { expression: parserOutput.expression } : undefined, [parserOutput])
  const [visualizerOutput, visualizerError, visualizerActive] = useWorker<VisualizerInput, VisualizerOutput>(visualizerInput, visualizer)

  useEffect(() => {
    if (gridDiv.current !== null) {
      (UIkit.update as (e: HTMLElement) => void)(gridDiv.current)
    }
  }, [parserOutput, runnerOutput, solverOutput])

  useEffect(() => {
    const modelId = programEditor.current?.getModel()?.id
    if (modelId !== undefined && parserOutput !== undefined) {
      if (parserOutput.succeeded) {
        InlayHintsProvider.instance.setInlayHints(modelId, parserOutput.inlayHints)
      } else {
        InlayHintsProvider.instance.clearInlayHints(modelId)
      }
    }
    return undefined
  }, [parserOutput, programEditor])

  useEffect(() => {
    const visualizer = visualizerDiv.current
    if (visualizer === null || visualizerOutput === undefined) {
      return
    }
    const graph = new DOMParser().parseFromString(visualizerOutput.svg, 'image/svg+xml').documentElement
    const node = visualizer.appendChild(graph)
    return () => { visualizer.removeChild(node) }
  }, [visualizerOutput])

  return (
    <div className='uk-margin-top uk-margin-left uk-margin-right'>
      <ul ref={gridDiv} className='uk-grid-small uk-child-width-1-2@m' data-uk-sortable='handle: .uk-card-header' data-uk-grid='masonry: true'>
        <li>
          <div className='uk-card uk-card-default'>
            <div className='uk-card-header'>
              <h3 className='uk-card-title'>
                Expression
                <a href='https://github.com/Meitinger/ConstraintSolver/blob/main/README.md' target='_blank' rel='noreferrer' className='uk-align-right uk-margin-remove' title='Syntax'><span data-uk-icon='question' /></a>
              </h3>
            </div>
            <div className='uk-card-body'>
              <div ref={programEditorDiv} className='uk-height-medium' />
            </div>
            {parserError !== undefined && <div className='uk-card-footer uk-alert-danger'>{parserError.message}</div>}
            {runnerError !== undefined && <div className='uk-card-footer uk-alert-primary'>Parsed successfully, but getting result failed: {runnerError.message}</div>}
            {parserOutput?.succeeded === false && (
              <div className='uk-card-footer uk-alert-warning'>
                Error at line {parserOutput.line}, column {parserOutput.column}. Expected:
                <div>
                  <ul className='uk-list uk-list-collapse uk-list-divider'>
                    {parserOutput.expected.map((value, index) => <li key={index}>{value}</li>)}
                  </ul>
                </div>
              </div>)}
            {runnerOutput !== undefined && (
              <div className='uk-card-footer uk-alert-success'>Result: {runnerOutput.value}</div>
            )}
            {(parserActive || runnerActive) && (
              <div className='uk-card-footer uk-text-center'><div uk-spinner='ratio: 2' /></div>
            )}
          </div>
        </li>
        <li>
          <div className='uk-card uk-card-default'>
            <div className='uk-card-header'>
              <h3 className='uk-card-title'>
                Rules
                <div className='uk-inline uk-align-right uk-margin-remove'>
                  <button type='button' className='uk-button uk-button-primary uk-button-small'>Predefined</button>
                  <div data-uk-dropdown='pos: top-right'>
                    <ul className='uk-nav uk-dropdown-nav uk-list uk-list-divider'>
                      {Object.entries(predefinedRules).map(([name, text]) => (
                        <li key={name}>
                          <button className='uk-button uk-button-link uk-text-capitalize uk-text-nowrap' onClick={() => rulesEditor.current?.setValue(text)}>{name}</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </h3>
            </div>
            <div className='uk-card-body'>
              <div ref={rulesEditorDiv} className='uk-height-medium' />
            </div>
            {solverError !== undefined && <div className='uk-card-footer uk-alert-danger'>{solverError.message}</div>}
            {solverOutput !== undefined && (
              <div className='uk-card-footer uk-height-medium uk-overflow-auto'>
                <table className='uk-table uk-table-small uk-table-hover uk-table-divider'>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(solverOutput.analysis).map(([name, value]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td>{value.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {solverActive && (
              <div className='uk-card-footer uk-text-center'><div uk-spinner='ratio: 2' /></div>
            )}
          </div>
        </li>
        <li>
          <div className='uk-card uk-card-default'>
            <div className='uk-card-header'>
              <h3 className='uk-card-title'>Expression Tree</h3>
            </div>
            <div ref={visualizerDiv} className='uk-card-body uk-height-large uk-overflow-auto'>
              {visualizerActive && <div className='uk-position-center' data-uk-spinner='ratio: 2' />}
            </div>
            {visualizerError !== undefined && <div className='uk-card-footer uk-alert-danger'>{visualizerError.message}</div>}
          </div>
        </li>
      </ul>
    </div>
  )
}
