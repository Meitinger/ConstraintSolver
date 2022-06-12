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

import { Module, render } from 'viz.js/full.render.js'
import { runWorker } from './helpers'
import { Expression } from './program'
import { VisualizerInput, VisualizerOutput } from './workers'

runWorker<VisualizerInput, VisualizerOutput>(({ expression }) => {
  const lines = new Array<string>('node [shape=box];', '0 [style=invis];')
  const createNode = (expression: Expression): number => {
    const node = (label?: string): number => { lines.push(`${expression.label} [label="${label ?? expression.type} [#${expression.label}]"];`); return expression.label }
    const connectTo = (to: number, label?: string): void => { lines.push(`${expression.label} -> ${to}${label === undefined ? '' : ` [label="${label}"]`};`) }
    switch (expression.type) {
      case 'n':
        return node(expression.value.toString())
      case 'true': case 'false':
        return node()
      case 'var':
        return node(expression.name)
      case '+': case '-': case '*': case '/': case '<': case '>': case '<=': case '>=': case '==': case '!=': case '||': case '&&':
        connectTo(createNode(expression.left), 'left')
        connectTo(createNode(expression.right), 'right')
        return node()
      case 'if':
        connectTo(createNode(expression.condition), 'condition')
        connectTo(createNode(expression.thenBody), 'then')
        connectTo(createNode(expression.elseBody), 'else')
        return node()
      case 'fn':
        connectTo(createNode(expression.body))
        return node(`fn ${expression.variable}`)
      case 'fun':
        connectTo(createNode(expression.body))
        return node(`fun ${expression.name} ${expression.variable}`)
      case 'app':
        connectTo(createNode(expression.callable), 'callable')
        connectTo(createNode(expression.argument), 'argument')
        return node()
      case 'let':
        connectTo(createNode(expression.value), expression.variable)
        connectTo(createNode(expression.body), 'in')
        return node()
    }
  }
  lines.push(`0 -> ${createNode(expression)};`)
  return {
    svg: render(((Module as unknown) as () => { run: () => void })(), `digraph CS {${lines.join('')}}`, {
      format: 'svg',
      engine: 'dot',
      files: [],
      images: [],
      yInvert: false
    })
  }
})
