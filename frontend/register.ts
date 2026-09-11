export {};

interface RegisterResponse { token?: string; pendingToken?: string; message?: string; user?: { rol: 'admin' | 'solicitante'; estado_aprobacion: number }; redirect?: string }

const form = document.querySelector<HTMLFormElement>('#register-form')!;
const message = document.querySelector<HTMLElement>('#register-message')!;
const submit = document.querySelector<HTMLButtonElement>('#register-submit')!;
let pollingTimer: number | undefined;

function showMessage(text: string, kind: 'info' | 'error' | 'success' = 'info'): void { message.textContent = text; message.dataset.kind = kind; }
function saveToken(token: string): void { sessionStorage.setItem('roperito_access_token', token); }
function stopPolling(): void { if (pollingTimer !== undefined) window.clearInterval(pollingTimer); pollingTimer = undefined; }

async function pollStatus(token: string): Promise<void> {
  try {
    const response = await fetch('/api/status', { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' });
    const data = await response.json() as { estado_aprobacion?: number; token?: string; redirect?: string; error?: string };
    if (!response.ok) { stopPolling(); showMessage(data.error ?? 'La solicitud expiró.', 'error'); return; }
    if (data.estado_aprobacion === 1 && data.token) { stopPolling(); saveToken(data.token); showMessage('¡Aprobado! Redirigiendo...', 'success'); window.setTimeout(() => { window.location.href = data.redirect ?? '/admin.html'; }, 700); }
    else if (data.estado_aprobacion === 2) { stopPolling(); showMessage('Solicitud denegada.', 'error'); }
  } catch { showMessage('No se pudo consultar el estado. Reintentando...', 'error'); }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  submit.disabled = true;
  submit.textContent = 'Creando cuenta...';
  showMessage('');
  try {
    const response = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const data = await response.json() as RegisterResponse & { error?: string };
    if (!response.ok) throw new Error(data.error ?? 'No se pudo crear la cuenta.');
    if (data.user?.rol === 'solicitante' && data.token) { saveToken(data.token); showMessage('Cuenta creada. Redirigiendo...', 'success'); window.setTimeout(() => { window.location.href = data.redirect ?? '/'; }, 500); return; }
    if (data.pendingToken) { form.hidden = true; showMessage(data.message ?? 'Esperando aprobación de los administradores...', 'info'); pollingTimer = window.setInterval(() => void pollStatus(data.pendingToken!), 3000); }
  } catch (error) { showMessage((error as Error).message, 'error'); submit.disabled = false; submit.textContent = 'Crear cuenta ↗'; }
});
