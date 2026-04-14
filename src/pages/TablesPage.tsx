import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import type { DiningTable, TableStatus } from '../types';
import clsx from 'clsx';

const statusColors: Record<TableStatus, string> = {
  available: 'border-green-300 bg-green-50 text-green-800',
  occupied:  'border-red-300 bg-red-50 text-red-800',
  reserved:  'border-yellow-300 bg-yellow-50 text-yellow-800',
};

export function TablesPage() {
  const { showToast } = useToast();
  const tables = useLiveQuery(() => db.diningTables.toArray(), []) ?? [];
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Partial<DiningTable> | null>(null);

  const sections = Array.from(new Set(tables.map(t => t.section)));

  const save = async () => {
    if (!editing?.tableNumber || !editing.section) { showToast('Table number and section required', 'error'); return; }
    if (editing.id) {
      await db.diningTables.update(editing.id, editing);
      showToast('Table updated');
    } else {
      await db.diningTables.add({ ...editing as DiningTable, status: 'available' });
      showToast('Table added');
    }
    setModal(false);
  };

  const deleteTable = async (table: DiningTable) => {
    if (table.status === 'occupied') { showToast('Cannot delete an occupied table', 'error'); return; }
    if (!confirm(`Delete table ${table.tableNumber}?`)) return;
    await db.diningTables.delete(table.id!);
    showToast('Table deleted');
  };

  const setStatus = async (table: DiningTable, status: TableStatus) => {
    await db.diningTables.update(table.id!, { status });
  };

  return (
    <div className="p-6">
      <div className="flex justify-end mb-6">
        <Button onClick={() => { setEditing({ tableNumber: '', section: 'Ground Floor', capacity: 4, status: 'available' }); setModal(true); }}>
          + Add Table
        </Button>
      </div>

      {sections.map(section => (
        <div key={section} className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{section}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {tables.filter(t => t.section === section).map(table => (
              <div
                key={table.id}
                className={clsx('rounded-xl border-2 p-4 transition-all', statusColors[table.status])}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold font-display text-lg">{table.tableNumber}</span>
                  <span className="text-xs opacity-70">{table.capacity}👤</span>
                </div>
                <Badge
                  color={table.status === 'available' ? 'green' : table.status === 'occupied' ? 'red' : 'yellow'}
                  className="text-xs mb-2"
                >
                  {table.status}
                </Badge>
                <div className="flex flex-col gap-1 mt-2">
                  <select
                    value={table.status}
                    onChange={e => setStatus(table, e.target.value as TableStatus)}
                    className="text-xs border border-current/20 rounded px-1 py-0.5 bg-transparent"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="reserved">Reserved</option>
                  </select>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="flex-1 text-xs !px-1" onClick={() => { setEditing({ ...table }); setModal(true); }}>Edit</Button>
                    <Button variant="ghost" size="sm" className="flex-1 text-xs !px-1 text-red-500" onClick={() => deleteTable(table)}>Del</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {tables.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🪑</p>
          <p>No tables yet. Add tables to enable dine-in billing.</p>
        </div>
      )}

      {/* Stats */}
      {tables.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mt-6">
          {[
            { label: 'Available', count: tables.filter(t => t.status === 'available').length, color: 'text-green-600' },
            { label: 'Occupied',  count: tables.filter(t => t.status === 'occupied').length,  color: 'text-red-600' },
            { label: 'Reserved',  count: tables.filter(t => t.status === 'reserved').length,  color: 'text-yellow-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border p-4 text-center">
              <p className={`text-3xl font-bold font-display ${s.color}`}>{s.count}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing?.id ? 'Edit Table' : 'Add Table'} size="sm">
        <div className="p-6 space-y-4">
          <Input label="Table Number *" value={editing?.tableNumber ?? ''} onChange={e => setEditing(f => ({ ...f, tableNumber: e.target.value }))} placeholder="T1, F2, Terrace-1…" />
          <Input label="Section *" value={editing?.section ?? ''} onChange={e => setEditing(f => ({ ...f, section: e.target.value }))} placeholder="Ground Floor, First Floor…" />
          <Input label="Capacity (seats)" type="number" min="1" value={editing?.capacity ?? 4} onChange={e => setEditing(f => ({ ...f, capacity: Number(e.target.value) }))} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
