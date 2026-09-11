export {};

interface AdminRequest { id: number; nombre: string; email: string; creado_en: string }
const token = sessionStorage.getItem('roperito_access_token');
const tableBody = document.querySelector<HTMLTableSectionElement>('#admin-requests')!;
const message = document.querySelector<HTMLElement>('#admin-message')!;
const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] ?? character));
function showMessage(text: string): void { message.textContent = text; }
async function loadRequests(): Promise<void> {
  if (!token) { window.location.href = '/register.html'; return; }
  const response = await fetch('/api/admin/requests', { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' });
  if (response.status === 401 || response.status === 403) { sessionStorage.removeItem('roperito_access_token'); window.location.href = '/'; return; }
  const data = await response.json() as { solicitudes?: AdminRequest[]; error?: string };
  if (!response.ok) throw new Error(data.error ?? 'No se pudieron cargar las solicitudes.');
  const rows = data.solicitudes ?? [];
  tableBody.innerHTML = rows.length ? rows.map((item) => `<tr><td>${escapeHtml(item.nombre)}</td><td>${escapeHtml(item.email)}</td><td>${new Date(item.creado_en).toLocaleDateString('es-AR')}</td><td><div class="admin-actions"><button class="button button-light" data-id="${item.id}" data-action="aprobar">Aprobar</button><button class="button button-danger" data-id="${item.id}" data-action="rechazar">Rechazar</button></div></td></tr>`).join('') : '<tr><td colspan="4">No hay solicitudes pendientes.</td></tr>';
  tableBody.querySelectorAll<HTMLButtonElement>('button[data-id]').forEach((button) => button.addEventListener('click', () => void processRequest(Number(button.dataset.id), button.dataset.action ?? '')));
}
async function processRequest(id: number, accion: string): Promise<void> { try { const response = await fetch('/api/admin/request', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ id, accion }) }); const data = await response.json() as { error?: string; message?: string }; if (!response.ok) throw new Error(data.error ?? 'No se pudo procesar la solicitud.'); showMessage(data.message ?? 'Solicitud procesada.'); await loadRequests(); } catch (error) { showMessage((error as Error).message); } }
void loadRequests().catch((error: unknown) => showMessage((error as Error).message));
