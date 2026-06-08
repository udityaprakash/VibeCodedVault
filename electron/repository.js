const fs = require('fs');
const path = require('path');

function defaultSeed() {
  return {
    categories: [
      { id: '1', name: 'Coding', icon: 'Code', color: '#8B5CF6' },
      { id: '2', name: 'Image Generation', icon: 'Image', color: '#06B6D4' },
      { id: '3', name: 'Marketing', icon: 'Megaphone', color: '#10B981' },
      { id: '4', name: 'Writing & Creative', icon: 'PenTool', color: '#F43F5E' },
      { id: '5', name: 'Productivity', icon: 'Zap', color: '#F59E0B' },
    ],
    prompts: [],
  };
}

module.exports = function createRepository(dbFilePath) {
  const ensureDbExists = () => {
    if (!fs.existsSync(dbFilePath)) {
      try {
        fs.writeFileSync(dbFilePath, JSON.stringify(defaultSeed(), null, 2), 'utf-8');
      } catch (e) {
        console.error('Failed to initialize repository DB file:', e);
      }
    }
  };

  const read = () => {
    ensureDbExists();
    try {
      const raw = fs.readFileSync(dbFilePath, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to read DB file, returning seed:', e);
      return defaultSeed();
    }
  };

  const write = (data) => {
    try {
      fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.error('Failed to write DB file:', e);
      return false;
    }
  };

  return {
    initDatabase: () => ensureDbExists(),
    getAllData: () => read(),
    savePrompt: (prompt) => {
      const db = read();
      const index = db.prompts.findIndex(p => p.id === prompt.id);
      const now = Date.now();
      if (index !== -1) {
        const existing = db.prompts[index];
        const prevContent = existing.content;
        let updatedVersions = [...(existing.versions || [])];
        let newVersion = existing.version || 1;
        if (prevContent !== prompt.content) {
          newVersion += 1;
          updatedVersions.push({ id: `${prompt.id || existing.id}-v${newVersion}-${now}`, version: newVersion, timestamp: now, content: prompt.content });
        }

        const finalSwitchInstances = (prompt && Object.prototype.hasOwnProperty.call(prompt, 'switchInstances'))
          ? prompt.switchInstances
          : existing.switchInstances;

        db.prompts[index] = { ...existing, ...prompt, switchInstances: finalSwitchInstances, version: newVersion, versions: updatedVersions, updatedAt: now };
      } else {
        const newPrompt = { ...prompt, id: prompt.id || 'p_' + Math.random().toString(36).substr(2, 9), version: 1, versions: [{ id: `${prompt.id || 'p'}-v1-${now}`, version: 1, timestamp: now, content: prompt.content }], createdAt: now, updatedAt: now, usageCount: 0, isPinned: prompt.isPinned || false, isFavorite: prompt.isFavorite || false };
        db.prompts.push(newPrompt);
      }

      write(db);
      return read();
    },
    // Soft-delete: mark prompt as deleted and set deletedAt
    deletePrompt: (promptId) => {
      const db = read();
      const idx = db.prompts.findIndex(p => p.id === promptId);
      if (idx !== -1) {
        db.prompts[idx].isDeleted = true;
        db.prompts[idx].deletedAt = Date.now();
      }
      write(db);
      return read();
    },
    // Permanently remove prompt
    permanentlyDeletePrompt: (promptId) => {
      const db = read();
      db.prompts = db.prompts.filter(p => p.id !== promptId);
      write(db);
      return read();
    },
    // Restore a soft-deleted prompt
    restorePrompt: (promptId) => {
      const db = read();
      const idx = db.prompts.findIndex(p => p.id === promptId);
      if (idx !== -1) {
        delete db.prompts[idx].isDeleted;
        delete db.prompts[idx].deletedAt;
      }
      write(db);
      return read();
    },
    incrementUsage: (promptId) => {
      const db = read();
      const index = db.prompts.findIndex(p => p.id === promptId);
      if (index !== -1) {
        db.prompts[index].usageCount = (db.prompts[index].usageCount || 0) + 1;
        write(db);
      }
      return read();
    },
    // Reminder related helpers
    getPendingReminders: () => {
      const db = read();
      const now = Date.now();
      const results = [];
      db.prompts.forEach(p => {
        if (!p.switchInstances || !Array.isArray(p.switchInstances)) return;
        p.switchInstances.forEach(si => {
          if (si.switchId === 'reminder' && si.enabled && si.value && si.value.datetime) {
            const dt = typeof si.value.datetime === 'number' ? si.value.datetime : Date.parse(String(si.value.datetime));
            if (Number.isFinite(dt) && dt <= now && !si._fired) {
              results.push({ promptId: p.id, title: si.value.title || p.title || 'Reminder', datetime: dt, description: si.value.description || '' , switchId: si.switchId });
            }
          }
        });
      });
      return results;
    },
    markReminderFired: (promptId, switchId) => {
      const db = read();
      const p = db.prompts.find(x => x.id === promptId);
      if (!p || !p.switchInstances) return false;
      const si = p.switchInstances.find(s => s.switchId === switchId);
      if (!si) return false;
      si._fired = true;
      write(db);
      return true;
    },
    snoozeReminder: (promptId, switchId, minutes) => {
      const db = read();
      const p = db.prompts.find(x => x.id === promptId);
      if (!p || !p.switchInstances) return false;
      const si = p.switchInstances.find(s => s.switchId === switchId);
      if (!si) return false;
      const current = typeof si.value.datetime === 'number' ? si.value.datetime : Date.parse(String(si.value.datetime));
      const next = (Number.isFinite(current) ? current : Date.now()) + (minutes || 5) * 60000;
      si.value.datetime = next;
      si._fired = false;
      write(db);
      return true;
    },
    saveCategory: (category) => {
      const db = read();
      const index = db.categories.findIndex(c => c.id === category.id);
      if (index !== -1) {
        db.categories[index] = { ...db.categories[index], ...category };
      } else {
        const newCategory = { ...category, id: category.id || 'c_' + Math.random().toString(36).substr(2, 9) };
        db.categories.push(newCategory);
      }
      write(db);
      return read();
    },
    deleteCategory: (categoryId) => {
      const db = read();
      db.categories = db.categories.filter(c => c.id !== categoryId);
      db.prompts = db.prompts.map(p => (p.categoryId === categoryId ? { ...p, categoryId: null } : p));
      write(db);
      return read();
    },
    setAllData: (data) => {
      if (!data || !Array.isArray(data.categories) || !Array.isArray(data.prompts)) return false;
      write({ categories: data.categories, prompts: data.prompts });
      return true;
    },
    exportBackup: (payload, filePath) => {
      try {
        fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
        return true;
      } catch (e) {
        console.error('Export failed:', e);
        return false;
      }
    },
    importBackupFromFile: (filePath) => {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
      } catch (e) {
        console.error('Import failed:', e);
        return false;
      }
    }
  };
};
