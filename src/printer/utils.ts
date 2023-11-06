import { IDoc, append, braces, brackets, choice, dquotes, enclose, intersperse, lineBreak, softLine } from 'prettier-printer'
import { INFIX_OPERATORS } from '../constants'

export type DocTransformer = (doc: IDoc) => IDoc

export const infixOperators = INFIX_OPERATORS.flat()


type Encloser = [IDoc, IDoc]
export const listEnclosers: Encloser = brackets
export const setEnclosers: Encloser = ['#{', '}']

export const WS = ' ' as IDoc

export const body = (nest: DocTransformer) => (content: IDoc): IDoc => encloseIndented(braces, content, nest)

/**
 * Formats a list of documents to "doc1, doc2, doc3" spreading it over multiple lines when needed
 */
export const listed = (contents: IDoc[], separator: IDoc = ','): IDoc => intersperse([separator, softLine], contents)

export const enclosedList = (nest: DocTransformer) => (enclosers: [IDoc, IDoc], content: IDoc[], separator: IDoc = ','): IDoc =>
  enclose(
    enclosers,
    choice(
      intersperse([separator, WS], content),
      encloseIndented(['', ''], intersperse([separator, lineBreak], content), nest)
    )
  )

export const encloseIndented = (enclosers: [IDoc, IDoc], content: IDoc, nest: DocTransformer): IDoc =>
  enclose(enclosers, append(lineBreak, nest([lineBreak, content])))

export const stringify = enclose(dquotes)