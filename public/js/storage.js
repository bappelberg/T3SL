const Storage = {
  async getTechnicians() {
    const res = await fetch('/api/technicians');
    return res.json();
  },

  async saveEntry(technicianId, category, seconds) {
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ technician_id: technicianId, category, seconds }),
    });
    return res.json();
  },

  async getEntries() {
    const res = await fetch('/api/entries');
    return res.json();
  },
};