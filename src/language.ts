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

import * as monaco from 'monaco-editor'
import environment from './environment.d.ts?raw'
import program from './program.d.ts?raw'
import rules from './rules.d.ts?raw'

export const languageId = 'fun'

export class InlayHintsProvider implements monaco.languages.InlayHintsProvider {
  public static readonly instance = new InlayHintsProvider()

  private readonly listeners = new Set<() => unknown>()
  private readonly inlayHints = new Map<string, readonly monaco.languages.InlayHint[]>()

  private constructor () {
    // singleton
  }

  private notifyListeners (): void {
    this.listeners.forEach(listener => listener())
  }

  public setInlayHints (id: string, inlayHints: readonly monaco.languages.InlayHint[]): void {
    this.inlayHints.set(id, inlayHints)
    this.notifyListeners()
  }

  public clearInlayHints (id: string): void {
    if (this.inlayHints.delete(id)) {
      this.notifyListeners()
    }
  }

  public onDidChangeInlayHints (listener: () => unknown, thisArg?: unknown): monaco.IDisposable {
    this.listeners.add(listener.bind(thisArg))
    return ({
      dispose: () => {
        this.listeners.delete(listener)
      }
    })
  }

  public provideInlayHints (model: monaco.editor.ITextModel, _range: monaco.Range, _token: monaco.CancellationToken): monaco.languages.ProviderResult<monaco.languages.InlayHint[]> {
    return this.inlayHints.get(model.id)?.slice()
  }
}

export const registerLibraries = (): void => {
  const patchup = (s: string): string[] => s.split('\n').map(s => s
    .replace(/^import /, '// import ')
    .replace(/^export /, 'declare global { ')
    .replace('// export', '}')
  )
  monaco.languages.typescript.typescriptDefaults.addExtraLib([
    ...patchup(program as string),
    ...patchup(rules as string),
    ...patchup((environment as string).replaceAll('readonly', 'const').replace('interface Environment {', '')),
    'export {}'
  ].join('\n'))
}

export const registerLanguage = (): void => {
  const keywords = ['if', 'then', 'else', 'fn', 'fun', 'let', 'in']
  const constants = ['true', 'false']
  const operators = ['<=', '>=', '==', '!=', '||', '&&', '->', '=>', '=', '+', '-', '*', '/', '<', '>']
  const completions = keywords.map(keyword => ({
    text: keyword,
    type: monaco.languages.CompletionItemKind.Keyword
  })).concat(constants.map(constant => ({
    text: constant,
    type: monaco.languages.CompletionItemKind.Constant
  }))).concat(operators.map(operator => ({
    text: operator,
    type: monaco.languages.CompletionItemKind.Operator
  })))

  monaco.languages.register({ id: languageId })
  monaco.languages.setLanguageConfiguration(languageId, {
    brackets: [['(', ')']],
    folding: {
      markers: {
        start: /\(/,
        end: /\)/
      }
    }
  })

  monaco.languages.setMonarchTokensProvider(languageId, {
    defaultToken: 'invalid',
    brackets: [{
      open: '(',
      close: ')',
      token: 'delimiter.parenthesis'
    }],
    keywords,
    constants,
    tokenizer: {
      root: [
        [/[a-z_]+/, {
          cases: {
            '@keywords': 'keyword',
            '@constants': 'constant',
            '@default': 'variable'
          }
        }],
        [/[ \t\r\n]+/, 'white'],
        [/[()]/, '@brackets'],
        [new RegExp(operators.map(operator => [...operator].flatMap(c => ['\\', c]).join('')).join('|')), 'operator'],
        [/[0-9]+/, 'number']
      ]
    }
  })

  monaco.languages.registerCompletionItemProvider(languageId, {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      }

      return ({
        suggestions: completions.filter(completion => completion.text.length > word.word.length && completion.text.startsWith(word.word)).map(completion => ({
          label: completion.text,
          kind: completion.type,
          insertText: completion.text,
          range
        }))
      })
    }
  })

  monaco.languages.registerInlayHintsProvider(languageId, InlayHintsProvider.instance)
}
