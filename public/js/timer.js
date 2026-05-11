class Timer {
  constructor(onTick) {
    this._seconds = 0;
    this._intervalId = null;
    this._onTick = onTick;
  }

  start() {
    this._intervalId = setInterval(() => {
      this._seconds++;
      this._onTick(this._seconds);
    }, 1000);
  }

  stop() {
    clearInterval(this._intervalId);
    this._intervalId = null;
    const elapsed = this._seconds;
    this._seconds = 0;
    return elapsed;
  }

  get running() {
    return this._intervalId !== null;
  }
}