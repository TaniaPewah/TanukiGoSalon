declare module '@sabaki/go-board' {
 export default class Board {
 constructor(map?:number[][]); static fromDimensions(n:number):Board; signMap:number[][]; width:number;
 get(v:number[]):number; set(v:number[],s:number):Board; has(v:number[]):boolean; getChain(v:number[]):number[][]; getNeighbors(v:number[]):number[][];
 makeMove(s:number,v:number[],options?:{preventOverwrite?:boolean;preventSuicide?:boolean;preventKo?:boolean}):Board;
 getCaptures(s:number):number; clone():Board;
 }
}
