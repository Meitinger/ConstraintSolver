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

import { Expression } from './program'

export interface Analysis {
  readonly [name: string]: Array<string | number>
}

export interface InlayHint{
  readonly text: string
  readonly position: {
    readonly lineNumber: number
    readonly column: number
  }
  readonly kind: 0
}

interface ParserInput {
  readonly expression: string
}

interface ParserSuccess {
  readonly succeeded: true
  readonly expression: Expression
  readonly inlayHints: readonly InlayHint[]
}

interface ParserError {
  readonly succeeded: false
  readonly line: number
  readonly column: number
  readonly expected: readonly string[]
}

export type ParserOutput = ParserSuccess | ParserError

export interface RunnerInput {
  readonly expression: Expression
}

export interface RunnerOutput {
  readonly value: string
}

export interface SolverInput {
  readonly expression: Expression
  readonly rules: string
}

export interface SolverOutput {
  readonly analysis: Analysis
}

export interface VisualizerInput {
  readonly expression: Expression
}

export interface VisualizerOutput {
  readonly svg: string
}
