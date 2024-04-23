class UndoManager {
    constructor() {
        this.redoStack = new Stack();
        this.undoStack = new Stack();
        this.currentCommand = null; // Variable pour stocker la commande en cours d'exécution
    }

    canUndo() {
        return !this.undoStack.isEmpty();
    }

    canRedo() {
        return !this.redoStack.isEmpty();
    }

    executeCommand(commande) {
        this.currentCommand = commande; // Stocke la commande en cours d execution
        this.currentCommand.execute(); // Exécute la commande
        this.undoStack.push(this.currentCommand);
        this.currentCommand = null; 
    }

    undo() {
        if (this.canUndo()) {
            this.currentCommand = this.undoStack.pop(); 
            this.currentCommand.undo(); 
            this.redoStack.push(this.currentCommand);
            this.currentCommand = null; 
        }
    }

    redo() {
        if (this.canRedo()) {
            this.currentCommand = this.redoStack.pop(); 
            this.currentCommand.execute(); 
            this.undoStack.push(this.currentCommand); 
            this.currentCommand = null; 
        }
    }
}
