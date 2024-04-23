import Stack from './stack';
import Konva from "konva";
import { createMachine, interpret } from "xstate";
import UndoManager from './UndoManager';
import Commande from './commande';
const stage = new Konva.Stage({
    container: "container",
    width: 400,
    height: 400,
});

const buttonUndo = document.getElementById("undo");
const buttonRedo = document.getElementById("redo");
const undoManager = new UndoManager();

// Une couche pour le dessin
const dessin = new Konva.Layer();
// Une couche pour la polyline en cours de construction
const temporaire = new Konva.Layer();
stage.add(dessin);
stage.add(temporaire);

const MAX_POINTS = 10;
let polyline // La polyline en cours de construction;

const polylineMachine = createMachine(
    {
        /** @xstate-layout N4IgpgJg5mDOIC5QAcD2AbAngGQJYDswA6XCdMAYgFkB5AVQGUBRAYWwEkWBpAbQAYAuohSpYuAC65U+YSAAeiABwAmAJxEAjAGYA7ABZFfVar2mNGgDQhMiZQDZlmgKyKtfPtrt6nGu3YC+-lZoWHiEJGSUdAByACI0-EJIIGhiktKyCghefESKGsoGyjqq+lp6OlY2CBo6dkR2Tu4F9i26gcEYOATEpOQUAEpM8YmyqRJSMslZXlpEfIr6qnzKTjp8TnZaVUoaRG7NTmZueu1BKV1hxNJgAAqoBOLU9MxsnLyCY6ITGdNKappdAYjCYzJZrIgXHM7O4PIomnoVnwtB0LqEekQbvdHs9GExaAA1JijZLjdJTUBZYz1AxLRTeLz0xQ7BBaLbzWF6QpaVSGDaokLdcJYh74J5MWAAYwAhsgwCSRGlJpklHY9sj9K5VMplNotMoWb56oYVOttYpVOUNALLhiALbS-CYbFi2C414cbgKi5K36UxAwoiFYzLJxrTZ8PR+Fl6VRODn0vQaENhuyKG3o8IOp0u8Ru2h4t5ejRJRU-CnyRBs9QOWOGHxGPzlQ3FIhOYOLLSLFSNa3nQVXIjZ52ivPu-E0InesnKv41Ar7NPrZOKGE6RSrlk8msuUw+EpbfRODNC4jD3NuiUyuXT77klWsuw1jsbDSNrZ6FnBog6YM6de-ioFQnoO56jpeYpgAATrevoVlk1YNC+DaqE2n4Qqy3jzDoTR8OshjlDqKL9raWaOiOjxugAQtKkoANawMgtHyp8pJ3rO-oIFyW6RvsCxJk4pS6smqggfa5EXhQNH0YxzE8CWXxwQ+iG1ryr7vs2GGmLkXK4Ty7itAEqL4KgEBwF8mZgIp5YPgAtHYLK2fGIYua5xjEZ0lkROQ1n3nOdg4fsSzroivI8uC1TFDoHKwss+QaKc-IkV5IqPL5HGVjUHjxloWgFGqjIbPkMbsloenaoJOgrmJZE5uB6V+plBR7PYhRhsJTQmCygk5buHjIjypjpoE-hAA */
        id: "polyLine",
        initial: "idle",
        states: {
            idle: {
                on: {
                    MOUSECLICK: {
                        target: "onePoint",
                        actions: "createLine",
                    },
                    UNDO: {
                        target: "idle",
                        actions: "undo",
                        internal: true,
                        cond: "canUndo"
                    },

                    REDO: {
                        target: "idle",
                        actions: "redo",
                        internal: true,
                        cond: "canRedo"
                    }
                },
            },
            onePoint: {
                on: {
                    MOUSECLICK: {
                        target: "manyPoints",
                        actions: "addPoint",
                    },
                    MOUSEMOVE: {
                        actions: "setLastPoint",
                    },
                    Escape: { // event.key
                        target: "idle",
                        actions: "abandon",
                    },
                },
            },
            manyPoints: {
                on: {
                    MOUSECLICK: [
                        {
                            actions: "addPoint",
                            cond: "pasPlein",
                        },
                        {
                            target: "idle",
                            actions: ["addPoint", "saveLine"],
                        },
                    ],

                    MOUSEMOVE: {
                        actions: "setLastPoint",
                    },

                    Escape: {
                        target: "idle",
                        actions: "abandon",
                    },

                    Enter: { // event.key
                        target: "idle",
                        actions: "saveLine",
                    },

                    Backspace: [ // event.key
                        {
                            target: "manyPoints",
                            actions: "removeLastPoint",
                            cond: "plusDeDeuxPoints",
                            internal: true,
                        },
                        {
                            target: "onePoint",
                            actions: "removeLastPoint",
                        },
                    ],
                },
            },
        },
    },
    {
        actions: {
            createLine: (context, event) => {
                const pos = stage.getPointerPosition();
                polyline = new Konva.Line({
                    points: [pos.x, pos.y, pos.x, pos.y],
                    stroke: "red",
                    strokeWidth: 2,
                });
                temporaire.add(polyline);
            },
            setLastPoint: (context, event) => {
                const pos = stage.getPointerPosition();
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;

                const newPoints = currentPoints.slice(0, size - 2); // Remove the last point
                polyline.points(newPoints.concat([pos.x, pos.y]));
                temporaire.batchDraw();
            },
            saveLine: (context, event) => {
                polyline.remove(); // On l'enlève de la couche temporaire
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;
                // Le dernier point(provisoire) ne fait pas partie de la polyline
                const newPoints = currentPoints.slice(0, size - 2);
                polyline.points(newPoints);
                polyline.stroke("black"); // On change la couleur
                // On sauvegarde la polyline dans la couche de dessin
                //dessin.add(polyline); // On l'ajoute à la couche de dessin
                undoManager.executeCommand(new SaveCommand(dessin,polyline));

            },
            addPoint: (context, event) => {
                const pos = stage.getPointerPosition();
                const currentPoints = polyline.points(); // Get the current points of the line
                const newPoints = [...currentPoints, pos.x, pos.y]; // Add the new point to the array
                polyline.points(newPoints); // Set the updated points to the line
                temporaire.batchDraw(); // Redraw the layer to reflect the changes
            },
            undo: (context, event) => {
                undoManager.undo(); // Appelle la méthode undo de l'UndoManager
                // Désactive le bouton undo si aucune opération undo n'est possible
                buttonUndo.disabled = !undoManager.canUndo();
                // Active le bouton redo après une opération undo
                buttonRedo.disabled = false;
            },
            redo: (context, event) => {
                undoManager.redo(); // Appelle la méthode redo de l'UndoManager
                // Désactive le bouton redo si aucune opération redo n'est possible
                buttonRedo.disabled = !undoManager.canRedo();
                // Active le bouton undo après une opération redo
                buttonUndo.disabled = false;
            },
            
            abandon: (context, event) => {
                polyline.remove();
            },
            removeLastPoint: (context, event) => {
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;
                const provisoire = currentPoints.slice(size - 2, size); // Le point provisoire
                const oldPoints = currentPoints.slice(0, size - 4); // On enlève le dernier point enregistré
                polyline.points(oldPoints.concat(provisoire)); // Set the updated points to the line
                temporaire.batchDraw(); // Redraw the layer to reflect the changes
            },
        },
        guards: {
            pasPlein: (context, event) => {
                // On peut encore ajouter un point
                return polyline.points().length < MAX_POINTS * 2;
            },
            plusDeDeuxPoints: (context, event) => {
                // Deux coordonnées pour chaque point, plus le point provisoire
                return polyline.points().length > 6;
            },
            canUndo: (context, event) => {
                return undoManager.canUndo();
            },
            canRedo: (context, event) => {
                return undoManager.canRedo();
            },
            
        },
    }
);

const polylineService = interpret(polylineMachine)
    .onTransition((state) => {
        console.log("Current state:", state.value);
    })
    .start();

stage.on("click", () => {
    polylineService.send("MOUSECLICK");
});

stage.on("mousemove", () => {
    polylineService.send("MOUSEMOVE");
});

window.addEventListener("keydown", (event) => {
    console.log("Key pressed:", event.key);
    polylineService.send(event.key);
});




undoButton.addEventListener("click", () => {
    undoManager.undo();
})


redoButton.addEventListener("click", () => {
    undoManager.redo();
})