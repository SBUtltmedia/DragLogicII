export const EventBus = {
    events: {},

    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    },

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(listener => listener(data));
        }
    },

    off(event, listener) {
        if (this.events[event]) {
            const index = this.events[event].indexOf(listener);
            if (index > -1) {
                this.events[event].splice(index, 1);
            }
        }
    }
};