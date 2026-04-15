import { useState, useEffect, useCallback } from 'react';
import { getCategories, addCategory, updateCategory, deleteCategory, getMenuItemCount, getMenuItems, addMenuItem, updateMenuItem, deleteMenuItem } from '../lib/db';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import type { Category, MenuItem } from '../types';

const GST_RATES = [0, 5, 12, 18, 28] as const;

const defaultItem: Omit<MenuItem, 'id'> = {
  categoryId: 0, name: '', price: 0, gstRate: 5, gstInclusive: false,
  unit: 'Plate', isVeg: true, isActive: true, sortOrder: 0, hsnCode: '996331',
};

export function MenuPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const [activeTab, setActiveTab] = useState<'items' | 'categories'>('items');
  const [itemModal, setItemModal] = useState(false);
  const [catModal, setCatModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [editingCat, setEditingCat] = useState<Partial<Category> | null>(null);
  const [filterCat, setFilterCat] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');

  const fetchCategories = useCallback(async () => {
    try { setCategories(await getCategories()); } catch {}
  }, []);

  const fetchMenuItems = useCallback(async () => {
    try { setMenuItems(await getMenuItems()); } catch {}
  }, []);

  useEffect(() => { fetchCategories(); fetchMenuItems(); }, [fetchCategories, fetchMenuItems]);

  const filteredItems = menuItems.filter(m => {
    const matchCat = filterCat === 'all' || m.categoryId === filterCat;
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const openNewItem = () => {
    setEditingItem({ ...defaultItem, categoryId: categories[0]?.id ?? 0 });
    setItemModal(true);
  };
  const openEditItem = (item: MenuItem) => { setEditingItem({ ...item }); setItemModal(true); };

  const saveItem = async () => {
    if (!editingItem?.name || !editingItem.price) { showToast('Name and price required', 'error'); return; }
    try {
      if (editingItem.id) {
        await updateMenuItem(editingItem.id, editingItem);
      } else {
        await addMenuItem(editingItem as MenuItem);
      }
      showToast(editingItem.id ? 'Item updated' : 'Item added');
      setItemModal(false);
      fetchMenuItems();
    } catch { showToast('Failed to save item', 'error'); }
  };

  const toggleItemActive = async (item: MenuItem) => {
    try {
      await updateMenuItem(item.id!, { isActive: !item.isActive });
      fetchMenuItems();
    } catch { showToast('Failed to update', 'error'); }
  };

  const deleteItem = async (item: MenuItem) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await deleteMenuItem(item.id!);
      showToast('Item deleted');
      fetchMenuItems();
    } catch { showToast('Failed to delete', 'error'); }
  };

  const saveCat = async () => {
    if (!editingCat?.name) { showToast('Category name required', 'error'); return; }
    try {
      if (editingCat.id) {
        await updateCategory(editingCat.id, editingCat);
      } else {
        await addCategory({ name: editingCat.name!, sortOrder: categories.length + 1, isActive: true });
      }
      showToast(editingCat.id ? 'Category updated' : 'Category added');
      setCatModal(false);
      fetchCategories();
    } catch { showToast('Failed to save category', 'error'); }
  };

  const deleteCat = async (cat: Category) => {
    try {
      const count = await getMenuItemCount(cat.id!);
      if (count > 0) { showToast(`Cannot delete: ${count} items use this category`, 'error'); return; }
      if (!confirm(`Delete category "${cat.name}"?`)) return;
      await deleteCategory(cat.id!);
      showToast('Category deleted');
      fetchCategories();
    } catch { showToast('Failed to delete', 'error'); }
  };

  return (
    <div className="p-6">
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['items', 'categories'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              activeTab === tab ? 'bg-brand-red text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >{tab}</button>
        ))}
      </div>

      {activeTab === 'items' && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <input
              placeholder="Search items…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red w-48"
            />
            <select
              value={filterCat === 'all' ? 'all' : filterCat}
              onChange={e => setFilterCat(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Button onClick={openNewItem} className="ml-auto">+ Add Item</Button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Name', 'Category', 'Price', 'GST', 'Type', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">No items found</td></tr>
                )}
                {filteredItems.map(item => {
                  const cat = categories.find(c => c.id === item.categoryId);
                  return (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-gray-500">{cat?.name ?? '—'}</td>
                      <td className="px-4 py-3 font-medium">₹{item.price}</td>
                      <td className="px-4 py-3"><Badge color="blue">{item.gstRate}%</Badge></td>
                      <td className="px-4 py-3">
                        <Badge color={item.isVeg ? 'green' : 'red'}>{item.isVeg ? 'Veg' : 'Non-Veg'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleItemActive(item)} className={`relative w-10 h-5 rounded-full transition-colors ${item.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${item.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditItem(item)}>Edit</Button>
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteItem(item)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'categories' && (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setEditingCat({ name: '', sortOrder: categories.length + 1, isActive: true }); setCatModal(true); }}>
              + Add Category
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <div key={cat.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{cat.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {menuItems.filter(m => m.categoryId === cat.id).length} items
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setEditingCat({ ...cat }); setCatModal(true); }}>Edit</Button>
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteCat(cat)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Item Modal */}
      <Modal open={itemModal} onClose={() => setItemModal(false)} title={editingItem?.id ? 'Edit Item' : 'Add Item'} size="lg">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Item Name *" value={editingItem?.name ?? ''} onChange={e => setEditingItem(f => ({ ...f, name: e.target.value }))} />
            <Select label="Category *" value={editingItem?.categoryId ?? ''} onChange={e => setEditingItem(f => ({ ...f, categoryId: Number(e.target.value) }))}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input label="Price (₹) *" type="number" min="0" value={editingItem?.price ?? ''} onChange={e => setEditingItem(f => ({ ...f, price: Number(e.target.value) }))} />
            <Select label="GST Rate" value={editingItem?.gstRate ?? 5} onChange={e => setEditingItem(f => ({ ...f, gstRate: Number(e.target.value) as 0 | 5 | 12 | 18 | 28 }))}>
              {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
            </Select>
            <Input label="HSN / SAC Code" value={editingItem?.hsnCode ?? ''} onChange={e => setEditingItem(f => ({ ...f, hsnCode: e.target.value }))} placeholder="996331" />
            <Input label="Unit" value={editingItem?.unit ?? 'Plate'} onChange={e => setEditingItem(f => ({ ...f, unit: e.target.value }))} placeholder="Plate, Glass, Piece…" />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="accent-brand-red" checked={editingItem?.isVeg ?? true} onChange={e => setEditingItem(f => ({ ...f, isVeg: e.target.checked }))} />
              Vegetarian
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="accent-brand-red" checked={editingItem?.gstInclusive ?? false} onChange={e => setEditingItem(f => ({ ...f, gstInclusive: e.target.checked }))} />
              GST Inclusive
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="accent-brand-red" checked={editingItem?.isActive ?? true} onChange={e => setEditingItem(f => ({ ...f, isActive: e.target.checked }))} />
              Active
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setItemModal(false)}>Cancel</Button>
            <Button onClick={saveItem}>Save Item</Button>
          </div>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal open={catModal} onClose={() => setCatModal(false)} title={editingCat?.id ? 'Edit Category' : 'Add Category'} size="sm">
        <div className="p-6 space-y-4">
          <Input label="Category Name" value={editingCat?.name ?? ''} onChange={e => setEditingCat(f => ({ ...f, name: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCatModal(false)}>Cancel</Button>
            <Button onClick={saveCat}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
