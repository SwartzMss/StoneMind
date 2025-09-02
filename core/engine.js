// 纯棋理/评估工具，挂到 window.Engine
(function(){
  function isInBounds(size, r, c){ return r>=0 && r<size && c>=0 && c<size; }

  function cloneBoard(board){ return board.map(row => row.slice()); }

  function getGroup(board, r, c){
    const color = board[r][c];
    const stack=[[r,c]]; const vis=new Set(); const group=[];
    const dirs=[[ -1,0 ],[ 1,0 ],[ 0,-1 ],[ 0,1 ]];
    while(stack.length){
      const [rr,cc]=stack.pop(); const key=rr+","+cc; if(vis.has(key)) continue; vis.add(key);
      if(isInBounds(board.length, rr, cc) && board[rr][cc]===color){
        group.push([rr,cc]);
        for(const [dr,dc] of dirs) stack.push([rr+dr, cc+dc]);
      }
    }
    return group;
  }

  function hasLiberties(board, group){
    const dirs=[[ -1,0 ],[ 1,0 ],[ 0,-1 ],[ 0,1 ]];
    for(const [r,c] of group){
      for(const [dr,dc] of dirs){
        const rr=r+dr, cc=c+dc;
        if(isInBounds(board.length, rr, cc) && board[rr][cc]===null) return true;
      }
    }
    return false;
  }

  function simulateCaptures(board, r, c, color){
    const opp = color==='black' ? 'white' : 'black';
    let total=0; const dirs=[[ -1,0 ],[ 1,0 ],[ 0,-1 ],[ 0,1 ]];
    for(const [dr,dc] of dirs){
      const rr=r+dr, cc=c+dc;
      if(isInBounds(board.length, rr, cc) && board[rr][cc]===opp){
        const g=getGroup(board, rr, cc);
        if(!hasLiberties(board,g)) total+=g.length;
      }
    }
    return total;
  }

  function countGroupLiberties(board, group){
    const dirs=[[ -1,0 ],[ 1,0 ],[ 0,-1 ],[ 0,1 ]];
    const set=new Set();
    for(const [r,c] of group){
      for(const [dr,dc] of dirs){
        const rr=r+dr, cc=c+dc;
        if(isInBounds(board.length, rr, cc) && board[rr][cc]===null) set.add(rr+","+cc);
      }
    }
    return set.size;
  }

  function evaluateMove(board, row, col, color){
    board[row][col]=color;
    const capture=simulateCaptures(board,row,col,color);
    const group=getGroup(board,row,col);
    const libs=countGroupLiberties(board, group);
    const center=Math.floor(board.length/2);
    const centerDistance=Math.abs(row-center)+Math.abs(col-center);
    let danger=0; if(capture===0 && libs<=1) danger=25;
    const score=capture*100 + libs*6 + (10-centerDistance)*2 - danger;
    board[row][col]=null;
    return score;
  }

  window.Engine = {
    cloneBoard,
    isInBounds,
    getGroup,
    hasLiberties,
    simulateCaptures,
    countGroupLiberties,
    evaluateMove,
  };
})();


