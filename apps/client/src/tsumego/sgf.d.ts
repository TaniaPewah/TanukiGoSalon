declare module '@sabaki/sgf' {
  export interface SgfNode {
    id: number
    data: Record<string, string[]>
    parentId: number | null
    children: SgfNode[]
  }
  export function parse(contents: string, options?: object): SgfNode[]
  export function parseVertex(input: string): [number, number]
  export function stringifyVertex(vertex: [number, number]): string
}
