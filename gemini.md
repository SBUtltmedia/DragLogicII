THe replace tool is currently not working in MacOS and will constantly fail, 
you need to always use instead.
When modifying a file, whenever possible WFFs should be treated as AST with some exceptions like UI and problem sets for ease on human creation of problem sets. 

This program is intended to ensure consistancy by only allowing correct implemenation of its infrerence rules and subproofs, for instance, dragging P->Q and P from the WFF construction area onto Modus Ponens, should not add Q to the proof. Check for this consistency whenever adding code to this area. 
don't run "npm start" unless asked, I am always running that in another window
