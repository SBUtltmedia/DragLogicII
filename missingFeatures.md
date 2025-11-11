A little bit of Asthetics, can we make the feedback area act like a stock ticker? the item should animate in from the right, and then after a set 
  interval, and the user clicking anywhere, the item will animate off screen to the left, the prev/next visibilty should be dependant on where the current pointer is for the feedback list, the pointer should 
  always go to the last intem on the list before adding the latest feedback use ➤ for the previous next, "you might need to rotate?"

---
### Feature Progress (Stock Ticker Feedback)

**DONE:**
- [x] Added CSS keyframe animations (`slide-in-right`, `slide-out-left`) to `css/style.css`.
- [x] Added CSS classes (`.animate-in-right`, `.animate-out-left`) to trigger the animations.
- [x] Styled the feedback navigation buttons (➤) and set their default visibility to hidden.

**TO DO:**
- [ ] **Modify `js/store.js`:** Update the `addFeedback` function to always set the `currentFeedbackIndex` to the end of the `feedbackHistory` array.
- [ ] **Modify `js/ui.js`:**
    - [ ] Update the `renderFeedback` function to:
        - Apply the `animate-in-right` class when a new message is displayed.
        - Manage the visibility of the `prev`/`next` navigation buttons based on the index and length of the feedback history.
    - [ ] Add a global `click` event listener that triggers the `animate-out-left` animation on the current feedback message after a delay.