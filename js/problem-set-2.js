export const problemSet2 = {
    2: {
        name: "Modal Logic",
        problems: [
            // System K: Basic Box introduction and importation
            { system: 'K', premises: ['□(P → Q)', '□P'], goal: {formula: '□Q'} }, 
            // System D: Shows the □φ ⊢ ◊φ rule
            { system: 'D', premises: ['□P'], goal: {formula: '◊P'} },
            // System T: Shows the □φ ⊢ φ rule
            { system: 'T', premises: ['□(P → Q)', 'P'], goal: {formula: 'Q'} }, // Requires □P → P first
            // System B: Shows the φ ⊢ □◊φ rule
            { system: 'B', premises: ['P'], goal: {formula: '□◊P'} },
            // System S4: Iterated modality and new importation rule
            { system: 'S4', premises: ['□P'], goal: {formula: '□□P'} },
            { system: 'S4', premises: ['□(P → Q)'], goal: {formula: '□(□P → □Q)'} },
            // System S5: The most powerful importation rules
            { system: 'S5', premises: ['◊P'], goal: {formula: '□◊P'} },
            { system: 'S5', premises: ['◊□P'], goal: {formula: '□P'} },
        ]
    }
};