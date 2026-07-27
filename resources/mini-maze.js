/**
 * Mini Maze Game for Spatial Jambi Sidebar
 */
class MiniMaze {
    constructor(canvasId, statusId, stepsId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.statusEl = document.getElementById(statusId);
        this.stepsEl = document.getElementById(stepsId);
        
        this.cols = 10;
        this.rows = 10;
        this.cellSize = this.canvas.width / this.cols;
        
        this.init();
        this.bindEvents();
    }
    
    init() {
        this.grid = [];
        this.steps = 0;
        this.isWon = false;
        this.player = { x: 0, y: 0 };
        this.target = { x: this.cols - 1, y: this.rows - 1 };
        
        // Build empty grid with 4 walls per cell
        for (let r = 0; r < this.rows; r++) {
            let row = [];
            for (let c = 0; c < this.cols; c++) {
                row.push({
                    r, c,
                    walls: { top: true, right: true, bottom: true, left: true },
                    visited: false
                });
            }
            this.grid.push(row);
        }
        
        // Generate maze using DFS
        this.generateMaze(0, 0);
        
        if (this.statusEl) this.statusEl.innerHTML = 'Cari jalan ke 🏁!';
        if (this.stepsEl) this.stepsEl.textContent = 'Langkah: 0';
        
        this.draw();
    }
    
    generateMaze(r, c) {
        this.grid[r][c].visited = true;
        
        const directions = [
            { r: -1, c: 0, wall: 'top', opp: 'bottom' },
            { r: 1, c: 0, wall: 'bottom', opp: 'top' },
            { r: 0, c: -1, wall: 'left', opp: 'right' },
            { r: 0, c: 1, wall: 'right', opp: 'left' }
        ];
        
        // Shuffle directions randomly
        directions.sort(() => Math.random() - 0.5);
        
        for (let d of directions) {
            let nr = r + d.r;
            let nc = c + d.c;
            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && !this.grid[nr][nc].visited) {
                this.grid[r][c].walls[d.wall] = false;
                this.grid[nr][nc].walls[d.opp] = false;
                this.generateMaze(nr, nc);
            }
        }
    }
    
    move(dir) {
        if (this.isWon) return;
        const r = this.player.y;
        const c = this.player.x;
        const cell = this.grid[r][c];
        let moved = false;
        
        if (dir === 'up' && !cell.walls.top && r > 0) {
            this.player.y--;
            moved = true;
        } else if (dir === 'down' && !cell.walls.bottom && r < this.rows - 1) {
            this.player.y++;
            moved = true;
        } else if (dir === 'left' && !cell.walls.left && c > 0) {
            this.player.x--;
            moved = true;
        } else if (dir === 'right' && !cell.walls.right && c < this.cols - 1) {
            this.player.x++;
            moved = true;
        }
        
        if (moved) {
            this.steps++;
            if (this.stepsEl) this.stepsEl.textContent = `Langkah: ${this.steps}`;
            
            if (this.player.x === this.target.x && this.player.y === this.target.y) {
                this.isWon = true;
                if (this.statusEl) this.statusEl.innerHTML = `🎉 <b>Menang! (${this.steps} langkah)</b>`;
            }
            this.draw();
        }
    }
    
    draw() {
        const cs = this.cellSize;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw maze floor background
        this.ctx.fillStyle = '#fff0f3';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw walls
        this.ctx.strokeStyle = '#e11d48';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const x = c * cs;
                const y = r * cs;
                const cell = this.grid[r][c];
                
                this.ctx.beginPath();
                if (cell.walls.top) {
                    this.ctx.moveTo(x, y);
                    this.ctx.lineTo(x + cs, y);
                }
                if (cell.walls.right) {
                    this.ctx.moveTo(x + cs, y);
                    this.ctx.lineTo(x + cs, y + cs);
                }
                if (cell.walls.bottom) {
                    this.ctx.moveTo(x, y + cs);
                    this.ctx.lineTo(x + cs, y + cs);
                }
                if (cell.walls.left) {
                    this.ctx.moveTo(x, y);
                    this.ctx.lineTo(x, y + cs);
                }
                this.ctx.stroke();
            }
        }
        
        // Draw Target 🏁
        const tx = this.target.x * cs + cs / 2;
        const ty = this.target.y * cs + cs / 2;
        this.ctx.font = `${Math.floor(cs * 0.55)}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🏁', tx, ty);
        
        // Draw Player 🏃
        const px = this.player.x * cs + cs / 2;
        const py = this.player.y * cs + cs / 2;
        this.ctx.fillText('🏃', px, py);
    }
    
    bindEvents() {
        document.getElementById('maze-btn-up')?.addEventListener('click', () => this.move('up'));
        document.getElementById('maze-btn-down')?.addEventListener('click', () => this.move('down'));
        document.getElementById('maze-btn-left')?.addEventListener('click', () => this.move('left'));
        document.getElementById('maze-btn-right')?.addEventListener('click', () => this.move('right'));
        document.getElementById('maze-btn-reset')?.addEventListener('click', () => this.init());
        
        window.addEventListener('keydown', (e) => {
            // Prevent default scrolling when using arrow keys inside maze
            const key = e.key.toLowerCase();
            if (['arrowup', 'w'].includes(key)) {
                if (document.activeElement.tagName !== 'INPUT') {
                    e.preventDefault();
                    this.move('up');
                }
            } else if (['arrowdown', 's'].includes(key)) {
                if (document.activeElement.tagName !== 'INPUT') {
                    e.preventDefault();
                    this.move('down');
                }
            } else if (['arrowleft', 'a'].includes(key)) {
                if (document.activeElement.tagName !== 'INPUT') {
                    e.preventDefault();
                    this.move('left');
                }
            } else if (['arrowright', 'd'].includes(key)) {
                if (document.activeElement.tagName !== 'INPUT') {
                    e.preventDefault();
                    this.move('right');
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.miniMaze = new MiniMaze('maze-canvas', 'maze-status', 'maze-steps');
});
