[vite] Internal server error: Failed to parse source for import analysis because the content contains invalid JS syntax. If you are using JSX, make sure to name the file with the .jsx or .tsx extension.
  Plugin: vite:import-analysis
  File: /Users/pstdenis/Drag_Logic_II/js/store.js:95:119
  93 |                  if (waitingConnective === connective) { 
  94 |                      const firstAst = LogicParser.textToAst(firstOperand.formula);
  95 |                      if (!firstAst) { addFeedback("Invalid first formula.", "error'); clearWffConstruction(); return; }
     |                                                                                                                        ^
  96 |                      const newAst = { type: 'binary', operator: connective, left: firstAst, right: droppedAst };
  97 |                      addWff(newAst);
      at TransformPluginContext._formatError (file:///Users/pstdenis/Drag_Logic_II/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:49258:41)
      at TransformPluginContext.error (file:///Users/pstdenis/Drag_Logic_II/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:49253:16)
      at TransformPluginContext.transform (file:///Users/pstdenis/Drag_Logic_II/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:64243:14)
      at async PluginContainer.transform (file:///Users/pstdenis/Drag_Logic_II/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:49099:18)
      at async loadAndTransform (file:///Users/pstdenis/Drag_Logic_II/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:51977:27)
      at async viteTransformMiddleware (file:///Users/pstdenis/Drag_Logic_II/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:62105:24) (x2)
