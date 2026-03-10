export class HistoryManager {
    constructor(graph, maxDepth = 50) {
        this.graph = graph;
        this.maxDepth = maxDepth;
        this.undoStack = [];
        this.redoStack = [];
        this.isTracking = false;

        this.graph.on('all', this.handleGraphChange.bind(this));
        
        // Push initial state
        this.saveState();
    }

    destroy() {
         this.graph.off('all', this.handleGraphChange.bind(this));
    }

    handleGraphChange(eventName) {
        // Skip tracking if we're currently undoing/redoing or if it's a layout batch
        if (!this.isTracking || eventName.startsWith('batch:layout')) return;

        // Track specific events that modify the graph structure
        const targetEvents = [
            'change:position', 'change:size', 'change:angle', 
            'change:attrs', 'change:vertices', 'change:source', 'change:target',
            'change:labels', 'add', 'remove'
        ];

        if (targetEvents.some(te => eventName.includes(te))) {
            // Debounce state saving
            if (this.saveTimeout) clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => this.saveState(), 300);
        }
    }

    saveState() {
        const state = JSON.stringify(this.graph.toJSON());
        
        // Prevent duplicate states
        if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === state) return;

        this.undoStack.push(state);
        this.redoStack = []; // Clear redo stack on new action
        
        if (this.undoStack.length > this.maxDepth) {
            this.undoStack.shift();
        }
    }

    undo() {
        if (this.undoStack.length > 1) {
            this.isTracking = false;
            
            const currentState = this.undoStack.pop();
            this.redoStack.push(currentState);
            
            const previousState = this.undoStack[this.undoStack.length - 1];
            this.graph.fromJSON(JSON.parse(previousState));
            
            this.isTracking = true;
            return true;
        }
        return false;
    }

    redo() {
        if (this.redoStack.length > 0) {
            this.isTracking = false;
            
            const nextState = this.redoStack.pop();
            this.undoStack.push(nextState);
            this.graph.fromJSON(JSON.parse(nextState));
            
            this.isTracking = true;
            return true;
        }
        return false;
    }

    canUndo() {
        return this.undoStack.length > 1;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.saveState();
    }
}
