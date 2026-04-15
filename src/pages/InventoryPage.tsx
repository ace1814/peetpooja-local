import { useState, useEffect, useCallback } from 'react';
import {
  getRawMaterials, addRawMaterial, updateRawMaterial,
  getMenuItems, getRecipes, upsertRecipe,
  getPurchaseOrders, addPurchaseOrder, updatePurchaseOrder,
} from '../lib/db';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { exportInventoryToXlsx } from '../utils/export';
import type { RawMaterial, PurchaseOrder, StockUnit, PurchaseOrderItem, MenuItem, Recipe, RecipeIngredient } from '../types';

const UNITS: StockUnit[] = ['kg', 'g', 'L', 'ml', 'pcs', 'dozen', 'plate'];

const defaultMaterial: Omit<RawMaterial, 'id'> = {
  name: '', unit: 'kg', currentStock: 0, lowStockThreshold: 0, costPerUnit: 0, supplier: '', isActive: true,
};

export function InventoryPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<'stock' | 'purchase-orders' | 'recipes'>('stock');

  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      const [mats, items, recs, pos] = await Promise.all([
        getRawMaterials(), getMenuItems(), getRecipes(), getPurchaseOrders(),
      ]);
      setMaterials(mats);
      setMenuItems(items.filter(m => m.isActive));
      setRecipes(recs);
      setPurchaseOrders(pos);
    } catch {}
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Stock tab state
  const [matModal, setMatModal] = useState(false);
  const [editingMat, setEditingMat] = useState<Partial<RawMaterial> | null>(null);
  const [adjustModal, setAdjustModal] = useState(false);
  const [adjustMat, setAdjustMat] = useState<RawMaterial | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNote, setAdjustNote] = useState('');

  // PO tab state
  const [poModal, setPoModal] = useState(false);
  const [poSupplier, setPoSupplier] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);
  const [poItemMat, setPoItemMat] = useState('');
  const [poItemQty, setPoItemQty] = useState('');
  const [poItemCost, setPoItemCost] = useState('');

  // Recipe tab state
  const [recipeModal, setRecipeModal] = useState(false);
  const [recipeMenuItem, setRecipeMenuItem] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState<{ rawMaterialId: string; quantity: string; unit: StockUnit }[]>([]);

  const lowStockItems = materials.filter(m => m.currentStock <= m.lowStockThreshold && m.isActive);

  // ─── Stock handlers ───
  const saveMat = async () => {
    if (!editingMat?.name) { showToast('Name required', 'error'); return; }
    try {
      if (editingMat.id) {
        await updateRawMaterial(editingMat.id, editingMat);
      } else {
        await addRawMaterial(editingMat as Omit<RawMaterial, 'id'>);
      }
      showToast(editingMat.id ? 'Material updated' : 'Material added');
      setMatModal(false);
      fetchAll();
    } catch { showToast('Failed to save material', 'error'); }
  };

  const adjustStock = async () => {
    if (!adjustMat || !adjustQty) return;
    const delta = Number(adjustQty);
    const newStock = Math.max(0, adjustMat.currentStock + delta);
    try {
      await updateRawMaterial(adjustMat.id!, { currentStock: newStock });
      showToast(`Stock updated: ${adjustMat.name} → ${newStock} ${adjustMat.unit}`);
      setAdjustModal(false);
      setAdjustQty('');
      setAdjustNote('');
      fetchAll();
    } catch { showToast('Failed to adjust stock', 'error'); }
  };

  // ─── PO handlers ───
  const addPoItem = () => {
    const mat = materials.find(m => String(m.id) === poItemMat);
    if (!mat || !poItemQty) { showToast('Select material and quantity', 'error'); return; }
    setPoItems(prev => [...prev, {
      rawMaterialId: mat.id!,
      name: mat.name,
      unit: mat.unit,
      quantityOrdered: Number(poItemQty),
      quantityReceived: 0,
      costPerUnit: Number(poItemCost) || mat.costPerUnit,
    }]);
    setPoItemMat(''); setPoItemQty(''); setPoItemCost('');
  };

  const savePo = async () => {
    if (!poSupplier || poItems.length === 0) { showToast('Add supplier and at least one item', 'error'); return; }
    const totalCost = poItems.reduce((s, i) => s + i.quantityOrdered * i.costPerUnit, 0);
    try {
      await addPurchaseOrder({
        supplier: poSupplier, status: 'pending', items: poItems,
        totalCost, notes: poNotes, createdAt: new Date(),
      });
      showToast('Purchase order created');
      setPoModal(false); setPoSupplier(''); setPoNotes(''); setPoItems([]);
      fetchAll();
    } catch { showToast('Failed to create purchase order', 'error'); }
  };

  const receivePo = async (po: PurchaseOrder) => {
    try {
      // Update each raw material's stock sequentially
      for (const item of po.items) {
        const mat = materials.find(m => m.id === item.rawMaterialId);
        if (!mat) continue;
        const received = item.quantityOrdered;
        await updateRawMaterial(item.rawMaterialId, {
          currentStock: mat.currentStock + received,
          costPerUnit: item.costPerUnit,
        });
      }
      // Mark PO as received
      await updatePurchaseOrder(po.id!, {
        status: 'received',
        receivedAt: new Date(),
        items: po.items.map(i => ({ ...i, quantityReceived: i.quantityOrdered })),
      });
      showToast('Purchase order received — stock updated');
      fetchAll();
    } catch { showToast('Failed to receive purchase order', 'error'); }
  };

  // ─── Recipe handlers ───
  const saveRecipe = async () => {
    if (!recipeMenuItem || recipeIngredients.length === 0) {
      showToast('Select menu item and add ingredients', 'error'); return;
    }
    const menuId = Number(recipeMenuItem);
    const ingredients: RecipeIngredient[] = recipeIngredients.map(i => ({
      rawMaterialId: Number(i.rawMaterialId),
      quantity: Number(i.quantity),
      unit: i.unit,
    }));
    try {
      await upsertRecipe(menuId, ingredients);
      showToast('Recipe saved');
      setRecipeModal(false); setRecipeMenuItem(''); setRecipeIngredients([]);
      fetchAll();
    } catch { showToast('Failed to save recipe', 'error'); }
  };

  return (
    <div className="p-6">
      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-red-500 text-xl">⚠️</span>
          <div>
            <p className="font-semibold text-red-700 text-sm">Low Stock Alert</p>
            <p className="text-red-600 text-xs">{lowStockItems.map(m => `${m.name} (${m.currentStock} ${m.unit})`).join(' • ')}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { key: 'stock', label: '📦 Raw Materials' },
          { key: 'purchase-orders', label: '🛒 Purchase Orders' },
          { key: 'recipes', label: '📋 Recipes' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-brand-red text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {/* ─── Raw Materials Tab ─── */}
      {tab === 'stock' && (
        <>
          <div className="flex justify-end gap-2 mb-4">
            <Button variant="secondary" onClick={() => exportInventoryToXlsx(materials)}>Export .xlsx</Button>
            <Button onClick={() => { setEditingMat({ ...defaultMaterial }); setMatModal(true); }}>+ Add Material</Button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Material', 'Unit', 'Current Stock', 'Threshold', 'Cost/Unit', 'Supplier', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {materials.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400">No materials yet</td></tr>
                )}
                {materials.map(mat => {
                  const isLow = mat.currentStock <= mat.lowStockThreshold;
                  return (
                    <tr key={mat.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isLow ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3 font-medium">{mat.name}</td>
                      <td className="px-4 py-3 text-gray-500">{mat.unit}</td>
                      <td className="px-4 py-3 font-semibold">{mat.currentStock}</td>
                      <td className="px-4 py-3 text-gray-400">{mat.lowStockThreshold}</td>
                      <td className="px-4 py-3">₹{mat.costPerUnit}</td>
                      <td className="px-4 py-3 text-gray-500">{mat.supplier ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge color={isLow ? 'red' : 'green'}>{isLow ? 'Low Stock' : 'OK'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setAdjustMat(mat); setAdjustModal(true); }}>Adjust</Button>
                          <Button variant="ghost" size="sm" onClick={() => { setEditingMat({ ...mat }); setMatModal(true); }}>Edit</Button>
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

      {/* ─── Purchase Orders Tab ─── */}
      {tab === 'purchase-orders' && (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setPoModal(true)}>+ New Purchase Order</Button>
          </div>
          <div className="space-y-3">
            {purchaseOrders.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">No purchase orders yet</div>}
            {purchaseOrders.map(po => (
              <div key={po.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{po.supplier}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(po.createdAt).toLocaleString()} • {po.items.length} item(s) • Total: ₹{po.totalCost.toFixed(2)}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {po.items.map((item, i) => (
                        <span key={i} className="text-xs bg-gray-100 rounded px-2 py-0.5">{item.name} × {item.quantityOrdered} {item.unit}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge color={po.status === 'received' ? 'green' : po.status === 'cancelled' ? 'red' : 'yellow'}>
                      {po.status}
                    </Badge>
                    {po.status === 'pending' && (
                      <Button variant="success" size="sm" onClick={() => receivePo(po)}>Receive</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ─── Recipes Tab ─── */}
      {tab === 'recipes' && (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setRecipeModal(true); setRecipeIngredients([{ rawMaterialId: '', quantity: '', unit: 'kg' }]); }}>+ Add Recipe</Button>
          </div>
          <div className="space-y-3">
            {recipes.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">No recipes yet. Recipes link menu items to raw materials for automatic stock deduction.</div>}
            {recipes.map(recipe => {
              const menuItem = menuItems.find(m => m.id === recipe.menuItemId);
              return (
                <div key={recipe.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{menuItem?.name ?? `Item #${recipe.menuItemId}`}</p>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setRecipeMenuItem(String(recipe.menuItemId));
                      setRecipeIngredients(recipe.ingredients.map(i => ({
                        rawMaterialId: String(i.rawMaterialId),
                        quantity: String(i.quantity),
                        unit: i.unit,
                      })));
                      setRecipeModal(true);
                    }}>Edit</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recipe.ingredients.map((ing, i) => {
                      const mat = materials.find(m => m.id === ing.rawMaterialId);
                      return (
                        <span key={i} className="text-xs bg-gray-100 rounded-full px-3 py-1">
                          {mat?.name ?? `Mat#${ing.rawMaterialId}`}: {ing.quantity} {ing.unit}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ─── Material Modal ─── */}
      <Modal open={matModal} onClose={() => setMatModal(false)} title={editingMat?.id ? 'Edit Material' : 'Add Raw Material'} size="md">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Material Name *" value={editingMat?.name ?? ''} onChange={e => setEditingMat(f => ({ ...f, name: e.target.value }))} />
            <Select label="Unit" value={editingMat?.unit ?? 'kg'} onChange={e => setEditingMat(f => ({ ...f, unit: e.target.value as StockUnit }))}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </Select>
            <Input label="Current Stock" type="number" min="0" step="0.01" value={editingMat?.currentStock ?? ''} onChange={e => setEditingMat(f => ({ ...f, currentStock: Number(e.target.value) }))} />
            <Input label="Low Stock Threshold" type="number" min="0" step="0.01" value={editingMat?.lowStockThreshold ?? ''} onChange={e => setEditingMat(f => ({ ...f, lowStockThreshold: Number(e.target.value) }))} />
            <Input label="Cost Per Unit (₹)" type="number" min="0" value={editingMat?.costPerUnit ?? ''} onChange={e => setEditingMat(f => ({ ...f, costPerUnit: Number(e.target.value) }))} />
            <Input label="Supplier" value={editingMat?.supplier ?? ''} onChange={e => setEditingMat(f => ({ ...f, supplier: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setMatModal(false)}>Cancel</Button>
            <Button onClick={saveMat}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* ─── Adjust Stock Modal ─── */}
      <Modal open={adjustModal} onClose={() => setAdjustModal(false)} title="Adjust Stock" size="sm">
        <div className="p-6 space-y-3">
          {adjustMat && (
            <p className="text-sm text-gray-600">Current stock of <strong>{adjustMat.name}</strong>: {adjustMat.currentStock} {adjustMat.unit}</p>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700">Adjustment (+ add, − remove)</label>
            <input type="number" value={adjustQty} onChange={e => setAdjustQty(e.target.value)}
              placeholder="e.g. +5 or -2"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
          <Input label="Reason (optional)" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder="Wastage, correction…" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdjustModal(false)}>Cancel</Button>
            <Button onClick={adjustStock}>Apply</Button>
          </div>
        </div>
      </Modal>

      {/* ─── Purchase Order Modal ─── */}
      <Modal open={poModal} onClose={() => setPoModal(false)} title="New Purchase Order" size="lg">
        <div className="p-6 space-y-4">
          <Input label="Supplier Name *" value={poSupplier} onChange={e => setPoSupplier(e.target.value)} />
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Items</p>
            {poItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-2 text-sm">
                <span>{item.name}</span>
                <span>{item.quantityOrdered} {item.unit} @ ₹{item.costPerUnit}</span>
                <button onClick={() => setPoItems(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">✕</button>
              </div>
            ))}
            <div className="flex gap-2">
              <select value={poItemMat} onChange={e => setPoItemMat(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white">
                <option value="">Select material</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
              </select>
              <input type="number" value={poItemQty} onChange={e => setPoItemQty(e.target.value)} placeholder="Qty" className="w-20 border border-gray-200 rounded-lg px-2 py-2 text-sm" />
              <input type="number" value={poItemCost} onChange={e => setPoItemCost(e.target.value)} placeholder="₹/unit" className="w-24 border border-gray-200 rounded-lg px-2 py-2 text-sm" />
              <Button variant="secondary" onClick={addPoItem}>+ Add</Button>
            </div>
          </div>
          <Input label="Notes" value={poNotes} onChange={e => setPoNotes(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPoModal(false)}>Cancel</Button>
            <Button onClick={savePo}>Create PO</Button>
          </div>
        </div>
      </Modal>

      {/* ─── Recipe Modal ─── */}
      <Modal open={recipeModal} onClose={() => setRecipeModal(false)} title="Recipe (Ingredients per serving)" size="lg">
        <div className="p-6 space-y-4">
          <Select label="Menu Item *" value={recipeMenuItem} onChange={e => setRecipeMenuItem(e.target.value)}>
            <option value="">Select item</option>
            {menuItems.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Ingredients</p>
            {recipeIngredients.map((ing, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select value={ing.rawMaterialId} onChange={e => setRecipeIngredients(prev => prev.map((x, idx) => idx === i ? { ...x, rawMaterialId: e.target.value } : x))}
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white">
                  <option value="">Material</option>
                  {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input type="number" value={ing.quantity} onChange={e => setRecipeIngredients(prev => prev.map((x, idx) => idx === i ? { ...x, quantity: e.target.value } : x))}
                  placeholder="Qty" className="w-20 border border-gray-200 rounded-lg px-2 py-2 text-sm" />
                <select value={ing.unit} onChange={e => setRecipeIngredients(prev => prev.map((x, idx) => idx === i ? { ...x, unit: e.target.value as StockUnit } : x))}
                  className="w-20 border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <button onClick={() => setRecipeIngredients(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 text-lg">✕</button>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => setRecipeIngredients(prev => [...prev, { rawMaterialId: '', quantity: '', unit: 'kg' }])}>
              + Ingredient
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRecipeModal(false)}>Cancel</Button>
            <Button onClick={saveRecipe}>Save Recipe</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
