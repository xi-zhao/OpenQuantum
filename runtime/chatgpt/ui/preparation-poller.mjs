// A page owns one polling loop. Every fresh snapshot updates its need to poll,
// regardless of whether it came from a button, a credential save or the host.
// Suspension stops future reads; it does not cancel a shared settings request.
export class PreparationPoller {
  #timer;
  #reading = false;
  #needed = false;
  #suspended = false;

  constructor({ refresh, canPoll, onError }) {
    this.refresh = refresh;
    this.canPoll = canPoll;
    this.onError = onError;
  }

  update(snapshot) {
    this.#needed = Boolean(snapshot?.environments?.some(item => ["preparing", "cancelling"].includes(item.state)));
    this.#schedule();
  }

  setSuspended(value) {
    this.#suspended = value;
    this.#schedule();
  }

  #schedule() {
    clearTimeout(this.#timer);
    this.#timer = undefined;
    if (!this.#needed || this.#suspended || this.#reading) return;
    this.#timer = setTimeout(() => this.#poll(), 1500);
  }

  async #poll() {
    this.#timer = undefined;
    if (!this.#needed || this.#suspended) return;
    if (!this.canPoll()) { this.#schedule(); return; }
    this.#reading = true;
    try { await this.refresh(); }
    catch (error) { if (!this.#suspended) this.onError(error); }
    finally { this.#reading = false; this.#schedule(); }
  }
}
